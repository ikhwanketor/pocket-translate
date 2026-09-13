/* ============================================================
   Ketor -- Game Boy Workflow
   ------------------------------------------------------------
   Nintendo Game Boy (DMG-01)
   - CPU: Sharp LR35902 (Z80-like, 8-bit)
   - ROM: max 1 MB (bank switching via MBC)
   - Pointer: 2-byte, little-endian, bank-relative
   - Terminator: typically 0x50, varies per game
   - Font: 2bpp tile, 8x8 pixels
   - Encoding: custom per game (tile order = encoding order)
   - Bank size: 0x4000 (16 KB)
   - Pointer formula: see getPointerFormula() below
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  function GBWorkflow() {
    Ketor.workflows.BaseWorkflow.call(this);
    this.name = 'Game Boy';
    this.extensions = ['gb'];
  }

  GBWorkflow.prototype = Object.create(Ketor.workflows.BaseWorkflow.prototype);
  GBWorkflow.prototype.constructor = GBWorkflow;

  /**
   * Detect Game Boy via Nintendo logo at offset 0x104.
   * The logo is present in every GB/GBC ROM.
   */
  GBWorkflow.prototype.detect = function (data, fileName) {
    if (data && data.length > 0x150) {
      // Nintendo logo starts at 0x104
      var logo = [0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B,
                  0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D];
      var match = true;
      for (var i = 0; i < logo.length; i++) {
        if (data[0x104 + i] !== logo[i]) { match = false; break; }
      }
      // Also check GBC flag at 0x143 -- if 0x80 or 0xC0, it is GBC
      if (match && data[0x143] !== 0x80 && data[0x143] !== 0xC0) {
        return true;
      }
    }
    return Ketor.workflows.BaseWorkflow.prototype.detect.call(this, data, fileName);
  };

  GBWorkflow.prototype.getSystemProfile = function () {
    return {
      name: 'Game Boy',
      terminator: [0x50],
      pointerSize: 2,
      pointerEndianness: 'little',
      pointerBase: 0x4000,
      extensions: ['gb'],
      hasHeader: false,
      headerSize: 0,
      bankSize: 0x4000,
      pipelineId: 'pipeline_gb',
      profileId: 'profile_gb',
      // GB-specific pointer calc: see Data Crystal reference
      // offset 0000-3FFF → +0x4000
      // offset 4000-7FFF → +0
      // offset 8000-BFFF → -0x4000
      // offset C000-FFFF → -0x8000
      pointerFormula: 'gb_bank_relative'
    };
  };

  GBWorkflow.prototype.getUIConfig = function () {
    return {
      showPaddingByte: false,
      showStrictMode: true,
      showCompression: false,
      showDecompression: false,
      defaultMinLength: 3,
      defaultMaxLength: 512,
      recommendedExtraction: 'strict',
      extractionLabel: 'Extract GB Texts',
      showFontEditor: true,
      fontInfo: {
        bpp: 2,
        tileWidth: 8,
        tileHeight: 8,
        bytesPerTile: 16,
        // GB font is usually in the same bank as text, or in
        // a dedicated bank near the start of ROM
        chrLocation: 'bank-relative'
      }
    };
  };

  GBWorkflow.prototype.getHelpText = function () {
    return 'Game Boy games use 2-byte bank-relative pointers and ' +
           '2bpp tile fonts. Each game has its own custom encoding ' +
           '(tile order = encoding order), so a .tbl file is essential. ' +
           'Load the ROM and .tbl, then Extract.';
  };

  GBWorkflow.prototype.extractText = function (rom, tableData, options) {
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

  GBWorkflow.prototype.insertText = function (rom, texts, tableData, options) {
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

  GBWorkflow.prototype.validateBuild = function (rom, texts) {
    var overflow = this.findOverflowTexts(texts, null);
    if (overflow.length === 0) {
      return {
        ok: true,
        severity: 'ok',
        report: 'All texts fit within their original byte length.'
      };
    }
    return {
      ok: true,
      severity: 'warn',
      report: overflow.length + ' text(s) exceed original length. ' +
              'Auto-relocation will be attempted if free space is ' +
              'available within the same ROM bank.'
    };
  };

  Ketor.workflows.GBWorkflow = GBWorkflow;

})(window);