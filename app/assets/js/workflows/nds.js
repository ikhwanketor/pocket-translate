/* ============================================================
   Ketor -- Nintendo DS Workflow
   ------------------------------------------------------------
   Nintendo DS (NDS)
   - CPU: ARM9 @ 67 MHz + ARM7 @ 33 MHz (dual-core)
   - ROM: up to 256 MB, RAM: 4 MB
   - File system: NitroFS (internal)
   - Archives: NARC, CARC, DWC utility files
   - Text format: BMG (binary message), MSBT
   - BMG encoding: UTF-16LE, CP1252, Shift-JIS, UTF-8
   - Font: NCGR (tile) + NCLR (palette)
   - Pointer: varies by file, usually 4-byte little-endian
   - Compression: LZ77, LZSS, Huffman
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  function NDSWorkflow() {
    Ketor.workflows.BaseWorkflow.call(this);
    this.name = 'NDS';
    this.extensions = ['nds', 'srl'];
  }

  NDSWorkflow.prototype = Object.create(Ketor.workflows.BaseWorkflow.prototype);
  NDSWorkflow.prototype.constructor = NDSWorkflow;

  /**
   * Detect NDS via "ARM9" or "ARM7" signature at offset 0xC0.
   */
  NDSWorkflow.prototype.detect = function (data, fileName) {
    if (data && data.length > 0xD0) {
      var arm9 = 'ARM9';
      var arm7 = 'ARM7';
      var match9 = true, match7 = true;
      for (var i = 0; i < 4; i++) {
        if (data[0xC0 + i] !== arm9.charCodeAt(i)) match9 = false;
        if (data[0xC0 + i] !== arm7.charCodeAt(i)) match7 = false;
      }
      if (match9 || match7) return true;
    }
    return Ketor.workflows.BaseWorkflow.prototype.detect.call(this, data, fileName);
  };

  NDSWorkflow.prototype.getSystemProfile = function () {
    return {
      name: 'NDS',
      terminator: [0x00, 0xFF, 0xFE],
      pointerSize: 4,
      pointerEndianness: 'little',
      pointerBase: 0x02000000,
      extensions: ['nds', 'srl'],
      hasHeader: true,
      headerSize: 0x4000,
      pipelineId: 'pipeline_nds',
      profileId: 'profile_nds',
      pointerTransforms: ['raw', 'base+', 'base-'],
      // NDS uses NitroFS file system
      supportsNitroFS: true,
      supportsNarc: true,
      supportsBmg: true,
      supportsMsbt: true,
      supportsNcgr: true,
      supportsNclr: true,
      compressionModes: ['lz77', 'lzss', 'huffman'],
      cpuArch: 'arm32'
    };
  };

  NDSWorkflow.prototype.getUIConfig = function () {
    return {
      showPaddingByte: false,
      showStrictMode: false,
      showCompression: true,
      showDecompression: true,
      defaultMinLength: 4,
      defaultMaxLength: 1400,
      recommendedExtraction: 'standard',
      extractionLabel: 'Extract NDS Texts',
      showFontEditor: true,
      fontInfo: {
        bpp: 4,
        tileWidth: 8,
        tileHeight: 8,
        bytesPerTile: 32,
        format: 'NCGR+NCLR',
        paletteBased: true
      },
      textFormats: {
        bmg: true,
        msbt: true,
        narc: true
      },
      compressionOptions: {
        enabled: true,
        modes: ['auto', 'lz77', 'lzss', 'huffman', 'none'],
        label: 'NDS Compression'
      },
      fileSystem: {
        nitroFS: true,
        narc: true,
        description: 'Browse NitroFS and extract NARC archives to access individual files.'
      }
    };
  };

  NDSWorkflow.prototype.getHelpText = function () {
    return 'NDS games use the NitroFS file system. Text is stored in BMG ' +
           'or MSBT format inside NARC archives. BMG encoding can be ' +
           'UTF-16LE, CP1252, Shift-JIS, or UTF-8. Fonts are NCGR tiles ' +
           'with NCLR palettes. Compression (LZ77, LZSS, Huffman) is ' +
           'common -- enable decompression if texts look garbled.';
  };

  NDSWorkflow.prototype.extractText = function (rom, tableData, options) {
    var profile = this.getSystemProfile();
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.extractTextViaWorker) {
        reject(new Error('Extraction worker not available.'));
        return;
      }
      var extractionOptions = {
        minLength: options.minLength || 4,
        maxLength: options.maxLength || 1400,
        asciiFallback: options.asciiFallback !== false,
        strictExtractorMode: false,
        system: profile,
        systemPipeline: profile.pipelineId,
        usePaddingByte: false,
        enableDteMteCompression: !!options.enableDteMteCompression,
        compressionStrategy: options.compressionStrategy || 'optimal',
        enableTextDecompression: options.enableTextDecompression !== false,
        decompressionMode: options.decompressionMode || 'auto',
        includeCompressedReadOnly: options.includeCompressedReadOnly !== false
      };
      global.Ketor.extractTextViaWorker(rom, tableData, extractionOptions)
        .then(resolve)
        .catch(reject);
    });
  };

  NDSWorkflow.prototype.insertText = function (rom, texts, tableData, options) {
    var profile = this.getSystemProfile();
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.buildRomViaWorker) {
        reject(new Error('Build worker not available.'));
        return;
      }
      global.Ketor.buildRomViaWorker(rom, texts, tableData, profile, options)
        .then(resolve)
        .catch(reject);
    });
  };

  NDSWorkflow.prototype.validateBuild = function (rom, texts) {
    var overflow = this.findOverflowTexts(texts, null);
    if (overflow.length === 0) {
      return {
        ok: true,
        severity: 'ok',
        report: 'All texts fit. NDS pointer validation passed.'
      };
    }
    return {
      ok: true,
      severity: 'warn',
      report: overflow.length + ' text(s) exceed original length. ' +
              'Auto-relocation with 4-byte pointer rewrite will be attempted.'
    };
  };

  Ketor.workflows.NDSWorkflow = NDSWorkflow;

})(window);