/* ============================================================
   Ketor - Table Activity State
   ------------------------------------------------------------
   Monkey-Moore style candidate list (Offset / Values / Preview).
   Reuses legacy relative search worker (async, non-blocking).
   Persists search history + active table to sessionStorage.
   ============================================================ */

(function (global) {
  'use strict';

  var K = global.Ketor = global.Ketor || {};
  var R = global.React;
  if (!R) return;
  K.table = K.table || {};

  var HISTORY_KEY = 'ketor.table.history';
  var HISTORY_LIMIT = 20;
  var WORKER_KEY = 'ketor.table.worker';

  var _state = {
    romBytes: null,
    romName: '',
    romSystem: '',
    romSize: 0,

    // Search input
    searchText: '',
    searchHistory: [],
    method: 'relative', // 'relative' | 'value-scan' | 'normal'
    charset: 'ASCII',
    byteWidth: 8,
    endianness: 'little',
    matchCase: false,
    wildcard: false,

    // Results
    candidates: [],
    selectedCandidateId: null,
    compareIds: [],
    previewFilter: '',

    // Edit table
    tableContent: '',
    tableEntries: [],
    tableSource: '',
    isApplied: false,

    // UI
    isSearching: false,
    status: '',
    progress: 0
  };

  var _listeners = new Set();

  function _set(patch) {
    var changed = false;
    var next = _state;
    Object.keys(patch).forEach(function (k) {
      if (_state[k] !== patch[k]) {
        if (!changed) { next = Object.assign({}, _state); changed = true; }
        next[k] = patch[k];
      }
    });
    if (changed) { _state = next; _notify(); }
  }

  function _notify() {
    _listeners.forEach(function (fn) { try { fn(); } catch (_) { } });
  }

  function getState() { return _state; }
  function subscribe(fn) {
    if (typeof fn !== 'function') return function () { };
    _listeners.add(fn);
    return function () { _listeners.delete(fn); };
  }
  function useTable() {
    return R.useSyncExternalStore(subscribe, getState, getState);
  }

  // ---- Session persistence ----
  function loadHistory() {
    try {
      var raw = global.sessionStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(0, HISTORY_LIMIT) : [];
    } catch (_) { return []; }
  }

  function saveHistory(list) {
    try {
      global.sessionStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_LIMIT)));
    } catch (_) { }
  }

  function pushHistory(text) {
    var v = String(text || '').trim();
    if (!v) return;
    var list = loadHistory().filter(function (x) { return x !== v; });
    list.unshift(v);
    if (list.length > HISTORY_LIMIT) list = list.slice(0, HISTORY_LIMIT);
    saveHistory(list);
    _set({ searchHistory: list });
  }

  // ---- TBL parsing ----
  function parseTblToEntries(content) {
    var lines = String(content || '').replace(/\r/g, '').split('\n');
    var entries = [];
    var idc = 0;
    lines.forEach(function (line) {
      if (!line) return;
      var raw = line.trim();
      if (!raw || raw.charAt(0) === '#' || raw.charAt(0) === ';') return;
      var isLine = false, isEnd = false;
      var work = line;
      if (work.charAt(0) === '*') { isLine = true; work = work.substring(1); }
      else if (work.charAt(0) === '\\') { isEnd = true; work = work.substring(1); }
      var eq = work.indexOf('=');
      var hex, ch;
      if (eq < 0) {
        if (!isLine && !isEnd) return;
        hex = work.replace(/\s+/g, '').toUpperCase();
        ch = isLine ? '[LINE]' : '[END]';
      } else {
        hex = work.substring(0, eq).replace(/\s+/g, '').toUpperCase();
        ch = work.substring(eq + 1);
      }
      if (!/^[0-9A-F]+$/.test(hex) || hex.length % 2 !== 0) return;
      if (isLine) ch = '[LINE]';
      if (isEnd && (!ch || ch.trim() === '')) ch = '[END]';
      if (ch.toUpperCase() === '[SPACE]') ch = ' ';
      idc++;
      entries.push({
        id: 'e' + idc,
        hex: hex,
        char: ch,
        bytes: (hex.match(/.{1,2}/g) || []).join(' '),
        comment: '',
        isLine: isLine,
        isEnd: isEnd
      });
    });
    return entries;
  }

  function entriesToTbl(entries) {
    var lines = [];
    (entries || []).forEach(function (en) {
      var prefix = '';
      if (en.isLine) prefix = '*';
      if (en.isEnd) prefix = '\\';
      var ch = en.char || '';
      if (ch === ' ') ch = '[SPACE]';
      lines.push(prefix + en.hex + '=' + ch);
    });
    return lines.join('\n');
  }

  // ---- Worker for relative search ----
  var _worker = null;
  function _ensureWorker() {
    if (_worker) return;
    var lg = K.legacy || {};
    if (typeof lg.createRelativeSearchWorker !== 'function') return;
    try {
      _worker = lg.createRelativeSearchWorker();
      _worker.onmessage = _onWorkerMessage;
      _worker.onerror = function () {
        _set({ isSearching: false, status: 'Search worker error.' });
      };
    } catch (_) { _worker = null; }
  }

  function _onWorkerMessage(ev) {
    var d = ev.data || {};
    if (d.type !== 'relativeSearchResult') {
      if (d.type === 'error') {
        _set({ isSearching: false, status: 'Search failed: ' + (d.message || '') });
      }
      return;
    }
    var results = Array.isArray(d.results) ? d.results : [];
    var text = _state.searchText || '';
    var firstChar = text.charAt(0) || '?';
    var charsetFull = (K.core && K.core.DEFAULT_CHARSET_FULL) ||
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    var candidates = results.map(function (r, idx) {
      var og = Number(r.offsetGuess) || 0;
      var ogByte = og & 0xFF;
      var ogHex = ogByte.toString(16).toUpperCase().padStart(2, '0');
      var valuesLabel = firstChar + '=' + ogHex;
      var paddingMode = r.mode || 'none';
      var previewFull = '';
      try {
        if (K.core && typeof K.core.generateTableContent === 'function') {
          previewFull = K.core.generateTableContent({
            offsetGuess: ogByte,
            charset: charsetFull,
            paddingMode: paddingMode,
            lineByte: null,
            endByte: null
          });
        }
      } catch (_) { previewFull = ''; }
      var previewShort = previewFull.replace(/\s+/g, ' ').substring(0, 48);
      if (previewFull.length > 48) previewShort += '...';
      return {
        id: 'c' + (idx + 1),
        offset: Number(r.offset) || 0,
        offsetGuess: ogByte,
        method: paddingMode === 'le' ? 'Relative LE'
          : paddingMode === 'be' ? 'Relative BE'
          : 'Relative',
        paddingMode: paddingMode,
        valuesLabel: valuesLabel,
        previewShort: previewShort,
        previewFull: previewFull,
        source: r.source || 'search'
      };
    });

    _set({
      candidates: candidates,
      selectedCandidateId: candidates[0] ? candidates[0].id : null,
      compareIds: [],
      isSearching: false,
      status: 'Found ' + candidates.length + ' candidate(s).'
    });
  }

  // ---- Actions ----
  function setRomFromLoad(result, systemName) {
    _set({
      romBytes: result.data || null,
      romName: result.name || '',
      romSystem: systemName || 'Unknown',
      romSize: result.size || 0,
      candidates: [],
      selectedCandidateId: null,
      compareIds: [],
      tableContent: '',
      tableEntries: [],
      tableSource: '',
      isApplied: false,
      status: 'ROM ready. Search text or load a .tbl.'
    });
  }

  function setSearchText(v) {
    _set({ searchText: String(v || '') });
  }
  function setMethod(v) { _set({ method: String(v || 'relative') }); }
  function setCharset(v) { _set({ charset: String(v || 'ASCII') }); }
  function setByteWidth(v) { _set({ byteWidth: Number(v) === 16 ? 16 : 8 }); }
  function setEndianness(v) { _set({ endianness: v === 'big' ? 'big' : 'little' }); }
  function setMatchCase(v) { _set({ matchCase: v === true }); }
  function setWildcard(v) { _set({ wildcard: v === true }); }
  function setPreviewFilter(v) { _set({ previewFilter: String(v || '') }); }

  function selectCandidate(id) {
    _set({ selectedCandidateId: id || null });
  }

  function toggleCompare(id) {
    var list = (_state.compareIds || []).slice();
    var i = list.indexOf(id);
    if (i >= 0) {
      list.splice(i, 1);
    } else {
      if (list.length >= 2) list.shift();
      list.push(id);
    }
    _set({ compareIds: list });
  }

  function clearCompare() { _set({ compareIds: [] }); }

  function runSearch() {
    if (!_state.romBytes) { _set({ status: 'Load ROM first.' }); return; }
    var text = String(_state.searchText || '').trim();
    if (!text) { _set({ status: 'Enter text in-game.' }); return; }
    _ensureWorker();
    if (!_worker) { _set({ status: 'Search worker unavailable.' }); return; }
    pushHistory(text);
    _set({
      isSearching: true,
      progress: 0,
      status: 'Searching...',
      candidates: [],
      selectedCandidateId: null,
      compareIds: []
    });
    var rb = _state.romBytes;
    var romBuffer = rb.buffer.slice(rb.byteOffset, rb.byteOffset + rb.byteLength);
    try {
      _worker.postMessage({
        type: 'relativeSearch',
        payload: {
          romBuffer: romBuffer,
          query: text,
          hexQuery: '',
          mode: 'text',
          paddingMode: 'auto',
          queryBytes: null,
          queryCandidates: [],
          systemName: _state.romSystem || '',
          maxResults: 200
        }
      }, [romBuffer]);
    } catch (e) {
      _set({ isSearching: false, status: 'Search dispatch failed: ' + (e.message || '') });
    }
  }

  function clearResults() {
    _set({
      candidates: [],
      selectedCandidateId: null,
      compareIds: [],
      previewFilter: '',
      status: 'Results cleared.'
    });
  }

  function loadTableFromFile(content, fileName) {
    var entries = parseTblToEntries(content);
    if (!entries.length) {
      _set({ status: 'File has no valid entries.' });
      return;
    }
    _set({
      tableContent: entriesToTbl(entries),
      tableEntries: entries,
      tableSource: 'file:' + (fileName || 'unknown.tbl'),
      isApplied: false,
      status: 'Loaded ' + entries.length + ' entries from ' + (fileName || 'file') + '.'
    });
  }

  function applySelectedToEditTable() {
    var sel = _state.selectedCandidateId;
    if (!sel) { _set({ status: 'Select a candidate first.' }); return; }
    var cand = null;
    for (var i = 0; i < _state.candidates.length; i++) {
      if (_state.candidates[i].id === sel) { cand = _state.candidates[i]; break; }
    }
    if (!cand) { _set({ status: 'Candidate not found.' }); return; }
    var entries = parseTblToEntries(cand.previewFull);
    _set({
      tableContent: entriesToTbl(entries),
      tableEntries: entries,
      tableSource: 'generated:' + cand.id,
      isApplied: false,
      status: 'Applied candidate ' + cand.offset.toString(16).toUpperCase() +
        ' to Edit Table (' + entries.length + ' entries).'
    });
  }

  function updateTableEntry(id, patch) {
    var next = _state.tableEntries.map(function (en) {
      if (en.id !== id) return en;
      return Object.assign({}, en, patch || {});
    });
    _set({
      tableEntries: next,
      tableContent: entriesToTbl(next)
    });
  }

  function addTableEntry() {
    var idc = _state.tableEntries.length + 1;
    var newEntry = {
      id: 'e_new_' + Date.now(),
      hex: '00',
      char: '',
      bytes: '00',
      comment: '',
      isLine: false,
      isEnd: false
    };
    var next = _state.tableEntries.concat([newEntry]);
    _set({
      tableEntries: next,
      tableContent: entriesToTbl(next)
    });
  }

  function removeTableEntry(id) {
    var next = _state.tableEntries.filter(function (en) { return en.id !== id; });
    _set({
      tableEntries: next,
      tableContent: entriesToTbl(next)
    });
  }

  function sortTable() {
    var next = _state.tableEntries.slice().sort(function (a, b) {
      var ah = parseInt(a.hex, 16);
      var bh = parseInt(b.hex, 16);
      if (isNaN(ah) || isNaN(bh)) return 0;
      return ah - bh;
    });
    _set({
      tableEntries: next,
      tableContent: entriesToTbl(next)
    });
  }

  function clearTable() {
    _set({
      tableContent: '',
      tableEntries: [],
      tableSource: '',
      isApplied: false,
      status: 'Table cleared.'
    });
  }

  function downloadTable() {
    var content = entriesToTbl(_state.tableEntries);
    if (!content) { _set({ status: 'Nothing to download.' }); return; }
    var base = (_state.romName || 'ketor').replace(/\.[^.]+$/, '');
    var name = base + '.tbl';
    var blob = new Blob([content], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    _set({ status: 'Downloaded ' + name });
  }

  function applyForRom() {
    if (!_state.tableEntries.length) {
      _set({ status: 'Edit table is empty.' });
      return;
    }
    _set({
      isApplied: true,
      status: 'Table applied for ROM. Proceeding to Search Text...'
    });
    // Notify workbench to switch activity
    try {
      global.dispatchEvent(new CustomEvent('ketor:navigate-activity', {
        detail: { activity: 'search', source: 'table-apply' }
      }));
    } catch (_) { }
  }

  function reset() {
    _set({
      romBytes: null, romName: '', romSystem: '', romSize: 0,
      searchText: '', candidates: [], selectedCandidateId: null,
      compareIds: [], previewFilter: '',
      tableContent: '', tableEntries: [], tableSource: '', isApplied: false,
      isSearching: false, status: '', progress: 0
    });
  }

  _set({ searchHistory: loadHistory() });

  K.table.getState = getState;
  K.table.subscribe = subscribe;
  K.table.useTable = useTable;
  K.table.setRomFromLoad = setRomFromLoad;
  K.table.setSearchText = setSearchText;
  K.table.setMethod = setMethod;
  K.table.setCharset = setCharset;
  K.table.setByteWidth = setByteWidth;
  K.table.setEndianness = setEndianness;
  K.table.setMatchCase = setMatchCase;
  K.table.setWildcard = setWildcard;
  K.table.setPreviewFilter = setPreviewFilter;
  K.table.selectCandidate = selectCandidate;
  K.table.toggleCompare = toggleCompare;
  K.table.clearCompare = clearCompare;
  K.table.runSearch = runSearch;
  K.table.clearResults = clearResults;
  K.table.loadTableFromFile = loadTableFromFile;
  K.table.applySelectedToEditTable = applySelectedToEditTable;
  K.table.updateTableEntry = updateTableEntry;
  K.table.addTableEntry = addTableEntry;
  K.table.removeTableEntry = removeTableEntry;
  K.table.sortTable = sortTable;
  K.table.clearTable = clearTable;
  K.table.downloadTable = downloadTable;
  K.table.applyForRom = applyForRom;
  K.table.reset = reset;

})(window);