/* ============================================================
   Ketor -- Nintendo 64 Workflow
   ------------------------------------------------------------
   Nintendo 64
   - CPU: MIPS R4300i @ 93.75 MHz (64-bit)
   - ROM: monolithic cartridge, 4-64 MB
   - Pointer: 4-byte, big-endian
   - Pointer formula: (offset - 12B24) / 4 for some games
   - Byte 4 of pointer indicates compressed file type
     (text, music, etc.) in some games
   - Terminator: 0x00, varies per game
   - Font: usually texture-based (not tile)
   - Compression: vpk0 (LZSS + Huffman), MIO0, Yaz0, Yay0
   - Modern approach: decompilation (SM64, OoT) is easier
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  function N64Workflow() {
    Ketor.workflows.BaseWorkflow.call(this);
    this.name = 'Nintendo 64';
    this.extensions = ['n64', 'z64', 'v64'];
  }

  N64Workflow.prototype = Object.create(Ketor.workflows.BaseWorkflow.prototype);
  N64Workflow.prototype.constructor = N64Workflow;

  /**
   * Detect N64 via byte order signatures at offset 0.
   * - Big-endian (.z64): 80 37 12 40
   * - Byte-swapped (.v64): 37 80 40 12
   * - Little-endian (.n64): 40 12 37 80
   */
  N64Workflow.prototype.detect = function (data, fileName) {
    if (data && data.length >= 4) {
      if (data[0] === 0x80 && data[1] === 0x37 &&
          data[2] === 0x12 && data[3] === 0x40) return true;
      if (data[0] === 0x37 && data[1] === 0x80 &&
          data[2] === 0x40 && data[3] === 0x12) return true;
      if (data[0] === 0x40 && data[1] === 0x12 &&
          data[2] === 0x37 && data[3] === 0x80) return true;
    }
    return Ketor.workflows.BaseWorkflow.prototype.detect.call(this, data, fileName);
  };

  N64Workflow.prototype.getSystemProfile = function () {
    return {
      name: 'Nintendo 64',
      terminator: [0x00],
      pointerSize: 4,
      pointerEndianness: 'big',
      pointerBase: 0x80000000,
      extensions: ['n64', 'z64', 'v64'],
      hasHeader: false,
      headerSize: 0,
      pipelineId: 'pipeline_n64',
      profileId: 'profile_n64',
      pointerTransforms: ['raw', 'base+', 'base-'],
      // N64-specific pointer: some games use (offset - 12B24) / 4
      pointerFormula: 'n64_compressed',
      // Compression formats
      compressionModes: ['vpk0', 'mio0', 'yaz0', 'yay0'],
      supportsDecompilation: true,
      cpuArch: 'mips64'
    };
  };

  N64Workflow.prototype.getUIConfig = function () {
    return {
      showPaddingByte: false,
      showStrictMode: false,
      showCompression: true,
      showDecompression: true,
      defaultMinLength: 4,
      defaultMaxLength: 1200,
      recommendedExtraction: 'standard',
      extractionLabel: 'Extract N64 Texts',
      showFontEditor: true,
      fontInfo: {
        bpp: 4,
        tileWidth: 8,
        tileHeight: 8,
        bytesPerTile: 32,
        chrLocation: 'texture',
        textureBased: true
      },
      compressionOptions: {
        enabled: true,
        modes: ['auto', 'vpk0', 'mio0', 'yaz0', 'yay0', 'none'],
        label: 'N64 Compression'
      },
      decompilationMode: {
        enabled: true,
        label: 'Decompilation Workflow',
        description: 'Some games (SM64, OoT) have full decompilation projects. Load source, edit, rebuild.'
      }
    };
  };

  N64Workflow.prototype.getHelpText = function () {
    return 'N64 games use 4-byte big-endian pointers. Many games use ' +
           'compression (vpk0, MIO0, Yaz0, Yay0). Text is often stored ' +
           'as textures, which are harder to edit than tile fonts. ' +
           'For games with decompilation projects (SM64, OoT), editing ' +
           'source code and rebuilding is easier than direct ROM hacking.';
  };

  N64Workflow.prototype.extractText = function (rom, tableData, options) {
    var profile = this.getSystemProfile();
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.extractTextViaWorker) {
        reject(new Error('Extraction worker not available.'));
        return;
      }
      var extractionOptions = {
        minLength: options.minLength || 4,
        maxLength: options.maxLength || 1200,
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

  N64Workflow.prototype.insertText = function (rom, texts, tableData, options) {
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

  N64Workflow.prototype.validateBuild = function (rom, texts) {
    var overflow = this.findOverflowTexts(texts, null);
    if (overflow.length === 0) {
      return {
        ok: true,
        severity: 'ok',
        report: 'All texts fit. N64 pointer validation passed.'
      };
    }
    return {
      ok: true,
      severity: 'warn',
      report: overflow.length + ' text(s) exceed original length. ' +
              'Relocation may require pointer table update. ' +
              'Consider using decompilation workflow for easier editing.'
    };
  };

  Ketor.workflows.N64Workflow = N64Workflow;

})(window);