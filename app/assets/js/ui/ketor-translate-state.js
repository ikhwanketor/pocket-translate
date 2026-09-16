/* Ketor Translate State - shared store for translation activity */
(function (global) {
  'use strict';
  var K = global.Ketor = global.Ketor || {};
  var R = global.React;
  if (!R) return;
  K.translate = K.translate || {};

  var _state = {
    romBytes: null, romName: '', romSystem: '', romSize: 0,
    tableData: null, tableContent: '',
    texts: [], filter: '', page: 1, perPage: 20,
    selectedTextId: null, modifiedRom: null,
    isBusy: false, status: '', progress: 0,
    sourceLang: 'en', targetLang: 'id',
    options: {
      minLength: 3, maxLength: 1024,
      asciiFallback: true, usePaddingByte: false,
      enableDteMteCompression: true,
      enableTextDecompression: false
    }
  };

  var _listeners = new Set();
  var _workers = { extractor: null, table: null, build: null };
  var _extractBuffer = [];
  var _pendingTableName = null;

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

  function useTranslate() {
    return R.useSyncExternalStore(subscribe, getState, getState);
  }

  // ---- Workers ----
  function _ensureWorkers() {
    var lg = K.legacy || {};
    if (!_workers.extractor && typeof lg.createTextExtractorWorker === 'function') {
      _workers.extractor = lg.createTextExtractorWorker();
      _workers.extractor.onmessage = _onExtractMsg;
      _workers.extractor.onerror = function (e) {
        _set({ isBusy: false, status: 'Extractor error' });
      };
    }
    if (!_workers.table && typeof lg.createTableWorker === 'function') {
      _workers.table = lg.createTableWorker();
      _workers.table.onmessage = _onTableMsg;
    }
    if (!_workers.build && typeof lg.createBuildWorker === 'function') {
      _workers.build = lg.createBuildWorker();
      _workers.build.onmessage = _onBuildMsg;
    }
  }

  // ---- Table ----
  function loadTableContent(content, fileName) {
    _set({ tableContent: content });
    _ensureWorkers();
    if (!_workers.table) { _set({ status: 'Table worker unavailable.' }); return; }
    _pendingTableName = fileName || 'custom.tbl';
    _workers.table.postMessage({
      type: 'parseTable',
      payload: { content: content, fileName: _pendingTableName, parseId: Date.now() }
    });
  }

  function _onTableMsg(ev) {
    var d = ev.data || {};
    if (d.type !== 'tableParsed') return;
    if (!d.entryCount) {
      _set({ status: 'Table empty/invalid.', tableData: null });
      return;
    }
    _set({
      tableData: {
        name: d.fileName || _pendingTableName,
        singleByte: d.singleByte || {},
        multiByte: d.multiByte || {},
        entryCount: d.entryCount,
        hasMultiByte: d.hasMultiByte === true
      },
      status: 'Table loaded: ' + d.entryCount + ' entries.'
    });
  }

  // ---- Extract ----
  function extractTexts() {
    _ensureWorkers();
    if (!_workers.extractor) { _set({ status: 'Extractor unavailable.' }); return; }
    if (!_state.romBytes || !_state.tableData) {
      _set({ status: 'Load ROM and table first.' }); return;
    }
    _set({ isBusy: true, progress: 5, status: 'Extracting...', texts: [] });
    _extractBuffer = [];

    var rb = _state.romBytes;
    var romBuffer = rb.buffer.slice(rb.byteOffset, rb.byteOffset + rb.byteLength);

    _workers.extractor.postMessage({
      romBuffer: romBuffer,
      tableData: {
        singleByte: _state.tableData.singleByte,
        multiByte: _state.tableData.multiByte
      },
      options: {
        minLength: _state.options.minLength,
        maxLength: _state.options.maxLength,
        asciiFallback: _state.options.asciiFallback,
        system: {
          name: _state.romSystem, terminator: [0x00],
          pointerSize: 4, pointerEndianness: 'little', pointerBase: 0
        },
        systemPipeline: 'pipeline_generic',
        usePaddingByte: _state.options.usePaddingByte,
        strictExtractorMode: false,
        enableTextDecompression: _state.options.enableTextDecompression,
        decompressionMode: 'auto',
        includeCompressedReadOnly: true
      }
    }, [romBuffer]);
  }

  function _onExtractMsg(ev) {
    var d = ev.data || {};
    if (d.type === 'progress') {
      _set({ progress: Math.max(0, Math.min(100, Number(d.value) || 0)) });
      return;
    }
    if (d.type === 'resultChunk') {
      if (Array.isArray(d.texts) && d.texts.length) {
        _extractBuffer = _extractBuffer.concat(d.texts);
      }
      if (d.done) {
        var final = _extractBuffer.slice();
        _extractBuffer = [];
        _set({
          texts: final, isBusy: false, progress: 100,
          status: 'Extracted ' + final.length + ' entries.'
        });
        setTimeout(function () { _set({ progress: 0 }); }, 800);
      }
      return;
    }
    if (d.type === 'error') {
      _extractBuffer = [];
      _set({ isBusy: false, progress: 0, status: 'Extract error: ' + (d.message || '') });
    }
  }

  // ---- Update ----
  function updateTranslation(textId, newText) {
    var id = Number(textId);
    if (!isFinite(id)) return;
    var next = _state.texts.slice();
    var changed = false;
    for (var i = 0; i < next.length; i++) {
      if (next[i].id !== id) continue;
      var prev = next[i].translatedText || '';
      var val = String(newText || '');
      if (prev === val) return;
      next[i] = Object.assign({}, next[i], { translatedText: val });
      changed = true;
      break;
    }
    if (changed) _set({ texts: next });
  }

  function setFilter(f) { _set({ filter: String(f || ''), page: 1 }); }
  function setPage(p) { _set({ page: Math.max(1, Number(p) || 1) }); }
  function selectText(id) { _set({ selectedTextId: id }); }
  function setSourceLang(v) { _set({ sourceLang: String(v || 'en') }); }
  function setTargetLang(v) { _set({ targetLang: String(v || 'id') }); }
  function setOptions(patch) {
    _set({ options: Object.assign({}, _state.options, patch) });
  }

  function reset() {
    _set({
      romBytes: null, romName: '', romSystem: '', romSize: 0,
      tableData: null, tableContent: '',
      texts: [], filter: '', page: 1, selectedTextId: null,
      modifiedRom: null, isBusy: false, status: '', progress: 0
    });
  }

  function setRomFromLoad(result, systemName) {
    _set({
      romBytes: result.data,
      romName: result.name,
      romSize: result.size,
      romSystem: systemName || 'Unknown',
      texts: [], modifiedRom: null,
      status: 'ROM ready. Load a table to extract texts.'
    });
  }

  // ---- Build ----
  function _buildMasterMap(tableData, target) {
    if (tableData.singleByte) {
      Object.keys(tableData.singleByte).forEach(function (k) {
        var ch = String(tableData.singleByte[k] || '');
        if (!ch) return;
        target[ch] = new Uint8Array([parseInt(k, 10) & 0xFF]);
      });
    }
    if (tableData.multiByte) {
      Object.keys(tableData.multiByte).forEach(function (hex) {
        var ch = String(tableData.multiByte[hex] || '');
        if (!ch || ch.length === 0) return;
        var bytes = hex.match(/.{1,2}/g).map(function (h) {
          return parseInt(h, 16) & 0xFF;
        });
        target[ch] = new Uint8Array(bytes);
      });
    }
  }

  function buildModifiedRom() {
    _ensureWorkers();
    if (!_workers.build) { _set({ status: 'Build unavailable.' }); return; }
    if (!_state.romBytes || !_state.texts.length || !_state.tableData) {
      _set({ status: 'ROM, table, and texts required.' }); return;
    }
    _set({ isBusy: true, progress: 10, status: 'Building...' });

    var mch = {};
    _buildMasterMap(_state.tableData, mch);
    Object.keys(mch).forEach(function (k) {
      mch[k] = Array.from(mch[k]);
    });

    var rb = _state.romBytes;
    var romBuffer = rb.buffer.slice(rb.byteOffset, rb.byteOffset + rb.byteLength);

    _workers.build.postMessage({
      type: 'buildRom',
      payload: {
        originalRom: romBuffer,
        allTexts: _state.texts,
        tableData: { masterCharToHex: mch },
        system: {
          name: _state.romSystem, terminator: [0x00],
          pointerSize: 4, pointerEndianness: 'little', pointerBase: 0
        },
        usePaddingByte: _state.options.usePaddingByte,
        pointerGroups: []
      }
    }, [romBuffer]);
  }

  function _onBuildMsg(ev) {
    var d = ev.data || {};
    if (d.type === 'progress') { _set({ progress: Number(d.value) || 0 }); return; }
    if (d.type === 'buildResult') {
      var p = d.modifiedRom;
      var bytes = p instanceof Uint8Array ? p
        : (p instanceof ArrayBuffer ? new Uint8Array(p) : new Uint8Array(p || []));
      _set({
        modifiedRom: bytes, isBusy: false, progress: 100,
        status: 'Build OK: ' + Math.round(bytes.length / 1024) + ' KB'
      });
      setTimeout(function () { _set({ progress: 0 }); }, 800);
      return;
    }
    if (d.type === 'error') {
      _set({ isBusy: false, progress: 0, status: 'Build error: ' + (d.message || '') });
    }
  }

  // ---- CSV ----
  function exportCsv() {
    var lg = K.legacy || {};
    if (typeof lg.exportCSV === 'function') {
      var base = (_state.romName || 'ketor').replace(/\.[^.]+$/, '');
      lg.exportCSV(_state.texts, base + '_translation.csv');
      _set({ status: 'CSV exported.' });
    }
  }

  function importCsvContent(content) {
    var lg = K.legacy || {};
    if (typeof lg.parseCSV !== 'function') return;
    try {
      var map = lg.parseCSV(content);
      var count = 0;
      var next = _state.texts.map(function (t) {
        if (map.has(t.id)) {
          count++;
          return Object.assign({}, t, { translatedText: map.get(t.id) });
        }
        return t;
      });
      _set({ texts: next, status: 'Imported ' + count + ' translations.' });
    } catch (e) {
      _set({ status: 'CSV import failed: ' + (e.message || '') });
    }
  }

  // ---- Export ROM ----
  function downloadModifiedRom() {
    if (!_state.modifiedRom) return;
    var name = (_state.romName || 'translated.rom').replace(/\.[^.]+$/, '') + '_translated.rom';
    var blob = new Blob([_state.modifiedRom], { type: 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    _set({ status: 'ROM downloaded: ' + name });
  }

  // ---- Auto-translate ----
  function autoTranslateText(textId) {
    var lg = K.legacy || {};
    var tr = K.core && K.core.translate;
    if (typeof tr !== 'function') { _set({ status: 'Translator not available.' }); return; }
    var row = null;
    for (var i = 0; i < _state.texts.length; i++) {
      if (_state.texts[i].id === Number(textId)) { row = _state.texts[i]; break; }
    }
    if (!row) return;
    var src = row.originalText || '';
    if (!src.trim()) return;

    _set({ status: 'Translating #' + textId + '...' });
    tr(src, _state.sourceLang, _state.targetLang, {
      onProgress: function () { }
    }).then(function (r) {
      updateTranslation(textId, r.text);
      _set({ status: 'Translated #' + textId + ' via ' + r.provider + '.' });
    }).catch(function (e) {
      _set({ status: 'Translate failed: ' + (e.message || '') });
    });
  }

  K.translate.getState = getState;
  K.translate.subscribe = subscribe;
  K.translate.useTranslate = useTranslate;
  K.translate.loadTableContent = loadTableContent;
  K.translate.extractTexts = extractTexts;
  K.translate.updateTranslation = updateTranslation;
  K.translate.setFilter = setFilter;
  K.translate.setPage = setPage;
  K.translate.selectText = selectText;
  K.translate.setSourceLang = setSourceLang;
  K.translate.setTargetLang = setTargetLang;
  K.translate.setOptions = setOptions;
  K.translate.buildModifiedRom = buildModifiedRom;
  K.translate.downloadModifiedRom = downloadModifiedRom;
  K.translate.exportCsv = exportCsv;
  K.translate.importCsvContent = importCsvContent;
  K.translate.autoTranslateText = autoTranslateText;
  K.translate.reset = reset;
  K.translate.setRomFromLoad = setRomFromLoad;

})(window);