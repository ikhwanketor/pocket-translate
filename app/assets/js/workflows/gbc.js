/* ============================================================
   Ketor -- Game Boy Color Workflow
   ------------------------------------------------------------
   Nintendo Game Boy Color (CGB)
   - CPU: Sharp LR35902 @ 8 MHz (double speed mode)
   - ROM: max 8 MB, RAM: 32 KB, VRAM: 16 KB
   - Pointer: 2-byte, little-endian, bank-relative
   - Terminator: typically 0x50, varies per game
   - Font: 2bpp tile, 8x8 pixels (color palette aware)
   - Encoding: custom per game
   - Bank size: 0x4000 (16 KB)
   - Detection: header flag at 0x143 is 0x80 or 0xC0
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  function GBCWorkflow() {
    Ketor.workflows.BaseWorkflow.call(this);
    this.name = 'GBC';
    this.extensions = ['gbc'];
  }

  GBCWorkflow.prototype = Object.create(Ketor.workflows.BaseWorkflow.prototype);
  GBCWorkflow.prototype.constructor = GBCWorkflow;

  /**
   * Detect GBC via Nintendo logo + CGB flag at 0x143.
   * Flag value: 0x80 = GBC-compatible, 0xC0 = GBC-only.
   */
  GBCWorkflow.prototype.detect = function (data, fileName) {
    if (data && data.length > 0x150) {
      var logo = [0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B,
                  0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D];
      var match = true;
      for (var i = 0; i < logo.length; i++) {
        if (data[0x104 + i] !== logo[i]) { match = false; break; }
      }
      if (match) {
        var cgbFlag = data[0x143];
        if (cgbFlag === 0x80 || cgbFlag === 0xC0) return true;
      }
    }
    return Ketor.workflows.BaseWorkflow.prototype.detect.call(this, data, fileName);
  };

  GBCWorkflow.prototype.getSystemProfile = function () {
    return {
      name: 'GBC',
      terminator: [0x50],
      pointerSize: 2,
      pointerEndianness: 'little',
      pointerBase: 0x4000,
      extensions: ['gbc'],
      hasHeader: false,
      headerSize: 0,
      bankSize: 0x4000,
      pipelineId: 'pipeline_gbc',
      profileId: 'profile_gbc',
      pointerFormula: 'gb_bank_relative',
      // GBC supports color palettes; fonts may use palette attributes
      supportsColor: true
    };
  };

  GBCWorkflow.prototype.getUIConfig = function () {
    return {
      showPaddingByte: false,
      showStrictMode: true,
      showCompression: false,
      showDecompression: false,
      defaultMinLength: 3,
      defaultMaxLength: 640,
      recommendedExtraction: 'strict',
      extractionLabel: 'Extract GBC Texts',
      showFontEditor: true,
      fontInfo: {
        bpp: 2,
        tileWidth: 8,
        tileHeight: 8,
        bytesPerTile: 16,
        chrLocation: 'bank-relative',
        supportsPalette: true
      }
    };
  };

  GBCWorkflow.prototype.getHelpText = function () {
    return 'Game Boy Color games are similar to Game Boy but with ' +
           'color palettes and larger ROM capacity (up to 8 MB). ' +
           'Pointers are 2-byte bank-relative, fonts are 2bpp tiles. ' +
           'Load the ROM and .tbl, then Extract.';
  };

  GBCWorkflow.prototype.extractText = function (rom, tableData, options) {
    var profile = this.getSystemProfile();
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.extractTextViaWorker) {
        reject(new Error('Extraction worker not available.'));
        return;
      }
      var extractionOptions = {
        minLength: options.minLength || 3,
        maxLength: options.maxLength || 640,
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

  GBCWorkflow.prototype.insertText = function (rom, texts, tableData, options) {
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

  GBCWorkflow.prototype.validateBuild = function (rom, texts) {
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
              'Auto-relocation will be attempted within the same bank.'
    };
  };

  Ketor.workflows.GBCWorkflow = GBCWorkflow;

})(window);