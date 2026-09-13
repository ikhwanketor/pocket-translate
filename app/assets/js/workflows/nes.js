/* ============================================================
   Ketor -- NES Workflow
   ------------------------------------------------------------
   Nintendo Entertainment System (Famicom)
   - CPU: 6502 8-bit
   - Pointer: 2-byte, little-endian, base 0x8000
   - Terminator: 0x00
   - Font: CHR tile 2bpp, 8x8
   - Header: iNES, 16 bytes ("NES\x1A")
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  function NESWorkflow() {
    Ketor.workflows.BaseWorkflow.call(this);
    this.name = 'NES';
    this.extensions = ['nes'];
  }

  NESWorkflow.prototype = Object.create(Ketor.workflows.BaseWorkflow.prototype);
  NESWorkflow.prototype.constructor = NESWorkflow;

  /**
   * Detect NES via iNES header signature.
   */
  NESWorkflow.prototype.detect = function (data, fileName) {
    if (data && data.length >= 4) {
      if (data[0] === 0x4E && data[1] === 0x45 &&
          data[2] === 0x53 && data[3] === 0x1A) {
        return true;
      }
    }
    return Ketor.workflows.BaseWorkflow.prototype.detect.call(this, data, fileName);
  };

  NESWorkflow.prototype.getSystemProfile = function () {
    return {
      name: 'NES',
      terminator: [0x00],
      pointerSize: 2,
      pointerEndianness: 'little',
      pointerBase: 0x8000,
      extensions: ['nes'],
      hasHeader: true,
      headerSize: 16,
      pipelineId: 'pipeline_nes',
      profileId: 'profile_nes'
    };
  };

  NESWorkflow.prototype.getUIConfig = function () {
    return {
      showPaddingByte: false,
      showStrictMode: true,
      showCompression: false,
      showDecompression: false,
      defaultMinLength: 3,
      defaultMaxLength: 512,
      recommendedExtraction: 'strict',
      extractionLabel: 'Extract NES Texts',
      showFontEditor: true,
      fontInfo: {
        bpp: 2,
        tileWidth: 8,
        tileHeight: 8,
        bytesPerTile: 16,
        chrLocation: 'after-prg'
      }
    };
  };

  NESWorkflow.prototype.getHelpText = function () {
    return 'NES games use 2-byte pointers and 2bpp CHR fonts. ' +
           'Load the ROM and a .tbl file, then click Extract. ' +
           'Keep translations within the original byte length ' +
           'to avoid repointing.';
  };

  /**
   * NES-specific extraction.
   * Currently delegates to core.js worker; will be migrated
   * to a fully dedicated module in a later batch.
   */
  NESWorkflow.prototype.extractText = function (rom, tableData, options) {
    var profile = this.getSystemProfile();

    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.extractTextViaWorker) {
        reject(new Error('Extraction worker not available. Load core.js first.'));
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

  /**
   * NES-specific insertion.
   * Delegates to rebuildRom in core.js.
   */
  NESWorkflow.prototype.insertText = function (rom, texts, tableData, options) {
    var profile = this.getSystemProfile();
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.buildRomViaWorker) {
        reject(new Error('Build worker not available. Load core.js first.'));
        return;
      }
      global.Ketor.buildRomViaWorker(rom, texts, tableData, profile, options)
        .then(resolve)
        .catch(reject);
    });
  };

  NESWorkflow.prototype.validateBuild = function (rom, texts) {
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
              'Auto-relocation will be applied if free space is found in PRG banks.'
    };
  };

  Ketor.workflows.NESWorkflow = NESWorkflow;

})(window);