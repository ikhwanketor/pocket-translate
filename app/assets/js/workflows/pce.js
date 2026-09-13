/* ============================================================
   Ketor -- PC Engine / TurboGrafx-16 Workflow
   ------------------------------------------------------------
   NEC PC Engine / TurboGrafx-16 / SuperGrafx
   - CPU: Hudson HuC6280 (6502-based, 8-bit) @ 7.16 MHz
   - ROM: HuCard up to 2 MB, CD-ROM² up to 700 MB
   - Pointer: 2-byte, little-endian, bank-relative
   - Bank size: 0x2000 (8 KB)
   - Text end byte: 0xFC (common)
   - Space byte: 0x5F (common)
   - Font: 8x8 or 16x16 tile, 1bpp (System Card font)
   - CD variant: extract first track with CDMage
   - Encoding: Shift-JIS or custom per game
   - Pointer format varies: some games store just the 8K
     logical boundary + bank separately; others use 2-byte
     bank-relative pointers.
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  function PCEWorkflow() {
    Ketor.workflows.BaseWorkflow.call(this);
    this.name = 'PC Engine/TG-16';
    this.extensions = ['pce', 'sgx'];
  }

  PCEWorkflow.prototype = Object.create(Ketor.workflows.BaseWorkflow.prototype);
  PCEWorkflow.prototype.constructor = PCEWorkflow;

  /**
   * PC Engine has no standard header signature.
   * Detection is by extension only, unless a HuCard-specific
   * signature is present at a known offset.
   */
  PCEWorkflow.prototype.detect = function (data, fileName) {
    return Ketor.workflows.BaseWorkflow.prototype.detect.call(this, data, fileName);
  };

  PCEWorkflow.prototype.getSystemProfile = function () {
    return {
      name: 'PC Engine/TG-16',
      terminator: [0xFC],
      pointerSize: 2,
      pointerEndianness: 'little',
      pointerBase: 0x2000,
      extensions: ['pce', 'sgx'],
      hasHeader: false,
      headerSize: 0,
      bankSize: 0x2000,
      pipelineId: 'pipeline_pce',
      profileId: 'profile_pce',
      pointerFormula: 'pce_bank_relative',
      // CD-ROM² variant support: extract first data track
      // with CDMage (MODE1/2048) before loading.
      supportsCdRom: true,
      cpuArch: 'huC6280',
      // Common control bytes
      controlBytes: {
        textEnd: 0xFC,
        space: 0x5F
      }
    };
  };

  PCEWorkflow.prototype.getUIConfig = function () {
    return {
      showPaddingByte: false,
      showStrictMode: true,
      showCompression: false,
      showDecompression: false,
      defaultMinLength: 3,
      defaultMaxLength: 512,
      recommendedExtraction: 'strict',
      extractionLabel: 'Extract PCE Texts',
      showFontEditor: true,
      fontInfo: {
        bpp: 1,
        tileWidth: 8,
        tileHeight: 8,
        bytesPerTile: 8,
        chrLocation: 'rom-or-system-card',
        supportsSystemCardFont: true
      },
      cdRomNote: 'For CD-ROM² games, extract the first data track with CDMage (MODE1/2048) before loading.'
    };
  };

  PCEWorkflow.prototype.getHelpText = function () {
    return 'PC Engine uses a 6502-based CPU similar to NES. ROM banks ' +
           'are 0x2000 (8 KB) in size. Pointers are 2-byte bank-relative. ' +
           'Common text end byte is 0xFC, space byte is 0x5F. ' +
           'For CD-ROM² games, extract the first data track with CDMage ' +
           '(MODE1/2048) before loading.';
  };

  PCEWorkflow.prototype.extractText = function (rom, tableData, options) {
    var profile = this.getSystemProfile();
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.extractTextViaWorker) {
        reject(new Error('Extraction worker not available.'));
        return;
      }
      var extractionOptions = {
        minLength: options.minLength || 3,
        maxLength: options.maxLength || 512,
        asciiFallback: false,
        strictExtractorMode: true,
        system: profile,
        systemPipeline: profile.pipelineId,
        usePaddingByte: false,
        enableDteMteCompression: !!options.enableDteMteCompression,
        compressionStrategy: options.compressionStrategy || 'optimal',
        enableTextDecompression: false,
        includeCompressedReadOnly: false
      };
      global.Ketor.extractTextViaWorker(rom, tableData, extractionOptions)
        .then(resolve)
        .catch(reject);
    });
  };

  PCEWorkflow.prototype.insertText = function (rom, texts, tableData, options) {
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

  PCEWorkflow.prototype.validateBuild = function (rom, texts) {
    var overflow = this.findOverflowTexts(texts, null);
    if (overflow.length === 0) {
      return {
        ok: true,
        severity: 'ok',
        report: 'All texts fit within original byte length.'
      };
    }
    return {
      ok: true,
      severity: 'warn',
      report: overflow.length + ' text(s) exceed original length. ' +
              'Auto-relocation within the same 8 KB bank will be attempted.'
    };
  };

  Ketor.workflows.PCEWorkflow = PCEWorkflow;

})(window);