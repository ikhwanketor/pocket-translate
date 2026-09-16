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

/* Ketor - Table State v4 (multi-sample + wildcard capture) */

(function (global) {
  'use strict';
  var K = global.Ketor = global.Ketor || {};
  var R = global.React;
  if (!R) return;
  K.table = K.table || {};
  var e = R.createElement;
  var uS = R.useState;
  var uE = R.useEffect;

  // ---- Shared UI Kit: KtBox (collapsible box) ----
  function KtBox(props) {
    var id = String(props.id || 'box');
    var st = uS(props.defaultCollapsed === true);
    var collapsed = st[0];
    var setCollapsed = st[1];

    uE(function () {
      try {
        var raw = global.sessionStorage.getItem('ketor.collapse.state');
        var map = raw ? JSON.parse(raw) : {};
        if (typeof map[id] === 'boolean') setCollapsed(map[id]);
      } catch (_) { }
    }, [id]);

    function toggle() {
      var next = !collapsed;
      setCollapsed(next);
      try {
        var raw = global.sessionStorage.getItem('ketor.collapse.state');
        var map = raw ? JSON.parse(raw) : {};
        map[id] = next;
        global.sessionStorage.setItem('ketor.collapse.state', JSON.stringify(map));
      } catch (_) { }
    }

    return e('div', {
      className: 'kt-ui-box' + (collapsed ? ' kt-ui-box-collapsed' : ''),
      style: Object.assign({
        display: 'flex', flexDirection: 'column', minHeight: 0,
        border: '1px solid var(--kt-widget-border-default)',
        borderRadius: 3, background: 'var(--kt-sidebar-bg)',
        overflow: 'hidden'
      }, props.style || {})
    },
      e('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 8px', flex: '0 0 auto',
          borderBottom: collapsed ? 'none' : '1px solid var(--kt-widget-border-default)',
          background: 'var(--kt-sidebar-bg)'
        }
      },
        e('button', {
          type: 'button', onClick: toggle,
          title: collapsed ? 'Expand' : 'Collapse',
          style: {
            width: 18, height: 18, padding: 0,
            background: 'transparent', border: 'none',
            color: 'var(--kt-sidebar-fg)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 2
          }
        }, K.ui.icon(collapsed ? 'chevron-right' : 'chevron-down', { size: 12 })),
        e('div', {
          style: {
            flex: 1, minWidth: 0, fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            opacity: 0.7, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis'
          }
        }, props.title || ''),
        props.actions ? e('div', { style: { display: 'flex', gap: 4, alignItems: 'center', flex: '0 0 auto' } }, props.actions) : null
      ),
      !collapsed ? e('div', {
        style: Object.assign({
          flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: 8
        }, props.bodyStyle || {})
      }, props.children) : null
    );
  }

  K.ui.KtBox = KtBox;

  // ---- State ----
  var HISTORY_KEY = 'ketor.table.history';
  var HISTORY_LIMIT = 20;

  var _state = {
    romBytes: null, romName: '', romSystem: '', romSize: 0,
    searchMode: 'relative',
    sampleText: '',
    wildcardEnabled: false,
    wildcardChar: '*',
    byteWidth: 8,
    endianness: 'little',
    charset: 'ASCII',
    advancedOpen: false,
    searchHistory: [],
    results: [],
    selectedResultIdx: -1,
    previewTbl: '',
    capturedBytes: [],
    compareFileName: '',
    compareTbl: '',
    editEntries: [],
    editSource: '',
    isApplied: false,
    isSearching: false,
    status: ''
  };

  var _listeners = new Set();
  function _set(p) {
    var changed = false, next = _state;
    Object.keys(p).forEach(function (k) {
      if (_state[k] !== p[k]) {
        if (!changed) { next = Object.assign({}, _state); changed = true; }
        next[k] = p[k];
      }
    });
    if (changed) { _state = next; _notify(); }
  }
  function _notify() { _listeners.forEach(function (f) { try { f(); } catch (_) { } }); }
  function getState() { return _state; }
  function subscribe(fn) {
    if (typeof fn !== 'function') return function () { };
    _listeners.add(fn);
    return function () { _listeners.delete(fn); };
  }
  function useTable() { return R.useSyncExternalStore(subscribe, getState, getState); }

  function loadHistory() {
    try {
      var raw = global.sessionStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      var a = JSON.parse(raw);
      return Array.isArray(a) ? a.slice(0, HISTORY_LIMIT) : [];
    } catch (_) { return []; }
  }
  function saveHistory(l) {
    try { global.sessionStorage.setItem(HISTORY_KEY, JSON.stringify(l.slice(0, HISTORY_LIMIT))); } catch (_) { }
  }
  function pushHistory(v) {
    var s = String(v || '').trim();
    if (!s) return;
    var l = loadHistory().filter(function (x) { return x !== s; });
    l.unshift(s);
    if (l.length > HISTORY_LIMIT) l = l.slice(0, HISTORY_LIMIT);
    saveHistory(l);
    _set({ searchHistory: l });
  }

  // ---- TBL parse/generate ----
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
        comment: autoComment(ch),
        isLine: isLine, isEnd: isEnd
      });
    });
    return out;
  }

  function autoComment(ch) {
    var s = String(ch || '');
    var u = s.toUpperCase();
    if (u === '[LINE]' || u === '[NEWLINE]') return 'line break';
    if (u === '[END]' || u === '[NULL]') return 'end of text';
    if (u === '[SPACE]' || s === ' ') return 'space';
    if (u === '[START]') return 'start marker';
    if (u === '[TAB]') return 'tab';
    if (u.indexOf('[UNK_') === 0) return 'unknown byte - review';
    if (s.length === 1) {
      var cp = s.charCodeAt(0);
      if (cp >= 65 && cp <= 90) return 'uppercase';
      if (cp >= 97 && cp <= 122) return 'lowercase';
      if (cp >= 48 && cp <= 57) return 'digit';
      if ('.,!?:;-/'.indexOf(s) >= 0) return 'punctuation';
    }
    return '';
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

  function ruleAssignChar(v) {
    var b = v & 0xFF;
    if (b === 0x20) return ' ';
    if (b === 0x0A || b === 0x0D) return '[LINE]';
    if (b === 0x00) return '[END]';
    if (b === 0x09) return '[TAB]';
    return '[UNK_' + b.toString(16).toUpperCase().padStart(2, '0') + ']';
  }

  function captureWildcardBytes(result) {
    if (!_state.wildcardEnabled) return [];
    if (_state.byteWidth !== 8) return [];
    var sample = String(result.sampleText || '');
    var wc = _state.wildcardChar.charCodeAt(0);
    if (!sample || !wc) return [];
    var data = _state.romBytes;
    var cap = [];
    var seen = {};
    for (var k = 0; k < sample.length; k++) {
      if (sample.charCodeAt(k) !== wc) continue;
      var pos = result.offset + k;
      if (pos < 0 || pos >= data.length) continue;
      var v = data[pos] & 0xFF;
      if (seen[v]) continue;
      seen[v] = true;
      cap.push({ pos: k, value: v, char: ruleAssignChar(v) });
    }
    return cap;
  }

  function buildPreviewFromResult(result, captured) {
    var lines = [];
    var handled = {};
    (captured || []).forEach(function (c) {
      var h = c.value.toString(16).toUpperCase().padStart(2, '0');
      if (handled[h]) return;
      handled[h] = true;
      var ch = c.char;
      if (ch === ' ') ch = '[SPACE]';
      lines.push(h + '=' + ch);
    });
    var keys = Object.keys(result.values || {});
    keys.sort();
    keys.forEach(function (key) {
      var cp = key.charCodeAt(0);
      var val = (result.values[key] & 0xFF);
      if (cp === 65 || cp === 97) {
        for (var lo = 0; lo < 26; lo++) {
          var b = (val + lo) & 0xFF;
          var hx = b.toString(16).toUpperCase().padStart(2, '0');
          if (handled[hx]) continue;
          handled[hx] = true;
          lines.push(hx + '=' + String.fromCharCode(cp + lo));
        }
      } else {
        var h2 = val.toString(16).toUpperCase().padStart(2, '0');
        if (handled[h2]) return;
        handled[h2] = true;
        lines.push(h2 + '=' + key);
      }
    });
    return lines.join('\n');
  }

  function setRomFromLoad(result, systemName) {
    _set({
      romBytes: result.data || null,
      romName: result.name || '',
      romSystem: systemName || 'Unknown',
      romSize: result.size || 0,
      results: [], selectedResultIdx: -1, previewTbl: '', capturedBytes: [],
      compareFileName: '', compareTbl: '',
      editEntries: [], editSource: '', isApplied: false,
      status: 'ROM ready.'
    });
  }

  function setSearchMode(v) { _set({ searchMode: v === 'value-scan' ? 'value-scan' : 'relative' }); }
  function setSampleText(v) { _set({ sampleText: String(v || '') }); }
  function setWildcardEnabled(v) { _set({ wildcardEnabled: v === true }); }
  function setWildcardChar(v) {
    var s = String(v || '');
    var c = s.length > 0 ? s.charAt(0) : '*';
    _set({ wildcardChar: c });
  }
  function setByteWidth(v) { _set({ byteWidth: Number(v) === 16 ? 16 : 8 }); }
  function setEndianness(v) { _set({ endianness: v === 'big' ? 'big' : 'little' }); }
  function setCharset(v) { _set({ charset: String(v || 'ASCII') }); }
  function toggleAdvanced() { _set({ advancedOpen: !_state.advancedOpen }); }

  function runSearch() {
    if (!_state.romBytes) { _set({ status: 'Load ROM first.' }); return; }
    var text = String(_state.sampleText || '');
    var lines = text.split('\n').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    if (!lines.length) { _set({ status: 'Enter text in-game (one per line).' }); return; }
    _set({ isSearching: true, status: 'Searching ' + lines.length + ' sample(s)...', results: [], selectedResultIdx: -1, previewTbl: '', capturedBytes: [] });
    pushHistory(lines.join('\n'));
    setTimeout(function () {
      try {
        var all = [];
        var maxPer = Math.max(50, Math.floor(500 / lines.length));
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          var res = K.core.runMonkeyMoore(_state.romBytes, {
            mode: _state.searchMode,
            keyword: line,
            wildcardEnabled: _state.wildcardEnabled,
            wildcardChar: _state.wildcardChar,
            byteWidth: _state.byteWidth,
            endianness: _state.endianness,
            maxResults: maxPer
          });
          for (var j = 0; j < res.results.length; j++) {
            var r = res.results[j];
            r.sampleIndex = i;
            r.sampleText = line;
            all.push(r);
          }
        }
        var previewTbl = '';
        var captured = [];
        if (all.length > 0) {
          captured = captureWildcardBytes(all[0]);
          previewTbl = buildPreviewFromResult(all[0], captured);
        }
        _set({
          results: all,
          selectedResultIdx: all.length > 0 ? 0 : -1,
          previewTbl: previewTbl,
          capturedBytes: captured,
          isSearching: false,
          status: 'Found ' + all.length + ' result(s) from ' + lines.length + ' sample(s).'
        });
      } catch (err) {
        _set({ isSearching: false, status: 'Search failed: ' + (err.message || '') });
      }
    }, 10);
  }

  function clearResults() {
    _set({ results: [], selectedResultIdx: -1, previewTbl: '', capturedBytes: [], status: 'Results cleared.' });
  }

  function selectResult(idx) {
    var i = Number(idx);
    if (!Number.isFinite(i) || i < 0 || i >= _state.results.length) return;
    var r = _state.results[i];
    var captured = captureWildcardBytes(r);
    _set({
      selectedResultIdx: i,
      previewTbl: buildPreviewFromResult(r, captured),
      capturedBytes: captured
    });
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
  function clearCompare() { _set({ compareFileName: '', compareTbl: '', status: 'Compare cleared.' }); }

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
      var m = Object.assign({}, en, patch || {});
      if (typeof m.hex === 'string') m.bytes = (m.hex.match(/.{1,2}/g) || []).join(' ');
      if (patch && patch.char !== undefined && (!patch.comment)) m.comment = autoComment(m.char);
      return m;
    });
    _set({ editEntries: next });
  }
  function addEditEntry() {
    var next = _state.editEntries.concat([{
      id: 'e_new_' + Date.now(), hex: '00', char: '', bytes: '00',
      comment: '', isLine: false, isEnd: false
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
      sampleText: '', results: [], selectedResultIdx: -1,
      previewTbl: '', capturedBytes: [],
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
  K.table.setSampleText = setSampleText;
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