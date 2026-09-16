/* ============================================================
   Ketor - Table Activity State
   ------------------------------------------------------------
   Monkey-Moore style candidate list (Offset / Values / Preview).
   Reuses legacy relative search worker (async, non-blocking).
   Persists search history + active table to sessionStorage.
   ============================================================ */

/* ============================================================
   Ketor - Table Activity State (v3)
   ------------------------------------------------------------
   Monkey-Moore settings in sidebar, results in left panel top
   (3 columns: Offset / Values / Preview-in-game), preview .tbl
   (hex=char) + compare in left panel bottom, edit table in
   right panel.
   ============================================================ */

(function (global) {
  'use strict';
  var K = global.Ketor = global.Ketor || {};
  var R = global.React;
  if (!R) return;
  K.table = K.table || {};

  var HISTORY_KEY = 'ketor.table.history';
  var HISTORY_LIMIT = 20;

  var _state = {
    romBytes: null, romName: '', romSystem: '', romSize: 0,

    // Sidebar search params (Monkey-Moore style)
    searchMode: 'relative', // 'relative' | 'value-scan'
    keyword: '',
    wildcardEnabled: false,
    wildcardChar: '*',
    byteWidth: 8,
    endianness: 'little',
    charset: 'ASCII',
    advancedOpen: false,
    searchHistory: [],

    // Results
    results: [],
    selectedResultIdx: -1,
    previewTbl: '',          // hex=char preview of selected result
    compareFileName: '',
    compareTbl: '',          // raw content of loaded .tbl for compare

    // Edit table
    editEntries: [],
    editSource: '',
    isApplied: false,

    isSearching: false,
    status: ''
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

  // History
  function loadHistory() {
    try {
      var raw = global.sessionStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      var a = JSON.parse(raw);
      return Array.isArray(a) ? a.slice(0, HISTORY_LIMIT) : [];
    } catch (_) { return []; }
  }
  function saveHistory(list) {
    try {
      global.sessionStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_LIMIT)));
    } catch (_) { }
  }
  function pushHistory(v) {
    var s = String(v || '').trim();
    if (!s) return;
    var list = loadHistory().filter(function (x) { return x !== s; });
    list.unshift(s);
    if (list.length > HISTORY_LIMIT) list = list.slice(0, HISTORY_LIMIT);
    saveHistory(list);
    _set({ searchHistory: list });
  }

  // TBL parse/generate
  function parseTbl(content) {
    var lines = String(content || '').replace(/\r/g, '').split('\n');
    var out = [];
    var idx = 0;
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
      idx++;
      out.push({
        id: 'e' + idx, hex: hex, char: ch,
        bytes: (hex.match(/.{1,2}/g) || []).join(' '),
        comment: ''
      });
    });
    return out;
  }

  function entriesToTbl(entries) {
    return (entries || []).map(function (en) {
      var prefix = '';
      if (en.isLine) prefix = '*';
      if (en.isEnd) prefix = '\\';
      var ch = en.char || '';
      if (ch === ' ') ch = '[SPACE]';
      return prefix + en.hex + '=' + ch;
    }).join('\n');
  }

  // Convert a Monkey-Moore result into a .tbl preview (hex=char)
  // Anchor: the first value in values map. Generate A-Z / a-z if
  // anchor is 'A' or 'a'. Otherwise just the anchor char.
  function resultToTblPreview(result) {
    if (!result || !result.values) return '';
    var keys = Object.keys(result.values);
    if (keys.length === 0) return '';
    var lines = [];
    var handled = {};
    keys.forEach(function (key) {
      var cp = key.charCodeAt(0);
      var val = result.values[key] & 0xFF;
      if (cp === 65 || cp === 97) {
        for (var lo = 0; lo < 26; lo++) {
          var b = (val + lo) & 0xFF;
          var hex = b.toString(16).toUpperCase().padStart(2, '0');
          if (handled[hex]) continue;
          handled[hex] = true;
          lines.push(hex + '=' + String.fromCharCode(cp + lo));
        }
      } else {
        var h2 = val.toString(16).toUpperCase().padStart(2, '0');
        if (!handled[h2]) {
          handled[h2] = true;
          lines.push(h2 + '=' + key);
        }
      }
    });
    return lines.join('\n');
  }

  // ---- Actions ----
  function setRomFromLoad(result, systemName) {
    _set({
      romBytes: result.data || null,
      romName: result.name || '',
      romSystem: systemName || 'Unknown',
      romSize: result.size || 0,
      results: [],
      selectedResultIdx: -1,
      previewTbl: '',
      compareFileName: '',
      compareTbl: '',
      editEntries: [],
      editSource: '',
      isApplied: false,
      status: 'ROM ready.'
    });
  }

  function setSearchMode(v) { _set({ searchMode: v === 'value-scan' ? 'value-scan' : 'relative' }); }
  function setKeyword(v) { _set({ keyword: String(v || '') }); }
  function setWildcardEnabled(v) { _set({ wildcardEnabled: v === true }); }
  function setWildcardChar(v) { _set({ wildcardChar: String(v || '*').charAt(0) || '*' }); }
  function setByteWidth(v) { _set({ byteWidth: Number(v) === 16 ? 16 : 8 }); }
  function setEndianness(v) { _set({ endianness: v === 'big' ? 'big' : 'little' }); }
  function setCharset(v) { _set({ charset: String(v || 'ASCII') }); }
  function toggleAdvanced() { _set({ advancedOpen: !_state.advancedOpen }); }

  function runSearch() {
    if (!_state.romBytes) { _set({ status: 'Load ROM first.' }); return; }
    var kw = String(_state.keyword || '').trim();
    if (!kw) { _set({ status: 'Enter text in-game.' }); return; }
    _set({ isSearching: true, status: 'Searching...', results: [], selectedResultIdx: -1, previewTbl: '' });
    pushHistory(kw);
    // Defer to next tick so spinner shows
    setTimeout(function () {
      try {
        var res = K.core.runMonkeyMoore(_state.romBytes, {
          mode: _state.searchMode,
          keyword: kw,
          wildcardEnabled: _state.wildcardEnabled,
          wildcardChar: _state.wildcardChar,
          byteWidth: _state.byteWidth,
          endianness: _state.endianness,
          maxResults: 500
        });
        _set({
          results: res.results,
          selectedResultIdx: res.results.length > 0 ? 0 : -1,
          previewTbl: res.results.length > 0 ? resultToTblPreview(res.results[0]) : '',
          isSearching: false,
          status: 'Found ' + res.results.length + ' result(s).'
        });
      } catch (err) {
        _set({ isSearching: false, status: 'Search failed: ' + (err.message || '') });
      }
    }, 10);
  }

  function clearResults() {
    _set({ results: [], selectedResultIdx: -1, previewTbl: '', status: 'Results cleared.' });
  }

  function selectResult(idx) {
    var i = Number(idx);
    if (!Number.isFinite(i) || i < 0 || i >= _state.results.length) return;
    var r = _state.results[i];
    _set({ selectedResultIdx: i, previewTbl: resultToTblPreview(r) });
  }

  function loadTableFile(content, fileName) {
    var entries = parseTbl(content);
    if (!entries.length) { _set({ status: 'File has no valid entries.' }); return; }
    _set({
      editEntries: entries,
      editSource: 'file:' + (fileName || 'unknown.tbl'),
      isApplied: false,
      status: 'Loaded ' + entries.length + ' entries from ' + (fileName || 'file') + '.'
    });
  }

  function loadCompareFile(content, fileName) {
    _set({
      compareFileName: fileName || '',
      compareTbl: String(content || ''),
      status: 'Loaded compare file: ' + (fileName || '') + '.'
    });
  }

  function clearCompare() {
    _set({ compareFileName: '', compareTbl: '', status: 'Compare cleared.' });
  }

  function applyPreviewToEditTable() {
    if (!_state.previewTbl) { _set({ status: 'No preview to apply.' }); return; }
    var entries = parseTbl(_state.previewTbl);
    if (!entries.length) { _set({ status: 'Preview has no valid entries.' }); return; }
    _set({
      editEntries: entries,
      editSource: 'generated',
      isApplied: false,
      status: 'Applied preview (' + entries.length + ' entries) to Edit Table.'
    });
  }

  function updateEditEntry(id, patch) {
    var next = _state.editEntries.map(function (en) {
      if (en.id !== id) return en;
      var merged = Object.assign({}, en, patch || {});
      if (typeof merged.hex === 'string') {
        merged.bytes = (merged.hex.match(/.{1,2}/g) || []).join(' ');
      }
      return merged;
    });
    _set({ editEntries: next });
  }
  function addEditEntry() {
    var next = _state.editEntries.concat([{
      id: 'e_new_' + Date.now(), hex: '00', char: '',
      bytes: '00', comment: '', isLine: false, isEnd: false
    }]);
    _set({ editEntries: next });
  }
  function removeEditEntry(id) {
    _set({ editEntries: _state.editEntries.filter(function (en) { return en.id !== id; }) });
  }
  function sortEditTable() {
    var next = _state.editEntries.slice().sort(function (a, b) {
      var ah = parseInt(a.hex, 16), bh = parseInt(b.hex, 16);
      if (isNaN(ah) || isNaN(bh)) return 0;
      return ah - bh;
    });
    _set({ editEntries: next });
  }
  function clearEditTable() {
    _set({ editEntries: [], editSource: '', isApplied: false, status: 'Edit Table cleared.' });
  }
  function downloadEditTable() {
    if (!_state.editEntries.length) { _set({ status: 'Nothing to download.' }); return; }
    var content = entriesToTbl(_state.editEntries);
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
    if (!_state.editEntries.length) { _set({ status: 'Edit Table is empty.' }); return; }
    _set({ isApplied: true, status: 'Table applied for ROM. Proceeding to Search Text...' });
    try {
      global.dispatchEvent(new CustomEvent('ketor:navigate-activity', {
        detail: { activity: 'search', source: 'table-apply' }
      }));
    } catch (_) { }
  }

  function reset() {
    _set({
      romBytes: null, romName: '', romSystem: '', romSize: 0,
      keyword: '', results: [], selectedResultIdx: -1, previewTbl: '',
      compareFileName: '', compareTbl: '',
      editEntries: [], editSource: '', isApplied: false,
      isSearching: false, status: ''
    });
  }

  _set({ searchHistory: loadHistory() });

  K.table.getState = getState;
  K.table.subscribe = subscribe;
  K.table.useTable = useTable;
  K.table.setRomFromLoad = setRomFromLoad;
  K.table.setSearchMode = setSearchMode;
  K.table.setKeyword = setKeyword;
  K.table.setWildcardEnabled = setWildcardEnabled;
  K.table.setWildcardChar = setWildcardChar;
  K.table.setByteWidth = setByteWidth;
  K.table.setEndianness = setEndianness;
  K.table.setCharset = setCharset;
  K.table.toggleAdvanced = toggleAdvanced;
  K.table.runSearch = runSearch;
  K.table.clearResults = clearResults;
  K.table.selectResult = selectResult;
  K.table.loadTableFile = loadTableFile;
  K.table.loadCompareFile = loadCompareFile;
  K.table.clearCompare = clearCompare;
  K.table.applyPreviewToEditTable = applyPreviewToEditTable;
  K.table.updateEditEntry = updateEditEntry;
  K.table.addEditEntry = addEditEntry;
  K.table.removeEditEntry = removeEditEntry;
  K.table.sortEditTable = sortEditTable;
  K.table.clearEditTable = clearEditTable;
  K.table.downloadEditTable = downloadEditTable;
  K.table.applyForRom = applyForRom;
  K.table.reset = reset;

})(window);