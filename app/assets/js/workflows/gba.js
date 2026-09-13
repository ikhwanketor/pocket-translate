/* ============================================================
   Ketor -- Game Boy Advance Workflow
   ------------------------------------------------------------
   Nintendo Game Boy Advance
   - CPU: ARM7TDMI @ 16.78 MHz (32-bit)
   - ROM: up to 32 MB, RAM: 256 KB, VRAM: 96 KB
   - Pointer: 4-byte, little-endian
   - Terminator: typically 0xFF, varies per game
   - Font: 4bpp linear (GBA) or 1bpp/2bpp
   - Encoding: custom per game
   - Compression: LZ77, Huffman, RLE (BIOS standard)
   - Pointer formula: (offset + 0x08000000) then reverse byte order
   - VWF: Variable Width Font may be present in JP games
   - DWE: Double Word Encoding with padding byte
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  function GBAWorkflow() {
    Ketor.workflows.BaseWorkflow.call(this);
    this.name = 'GBA';
    this.extensions = ['gba'];
  }

  GBAWorkflow.prototype = Object.create(Ketor.workflows.BaseWorkflow.prototype);
  GBAWorkflow.prototype.constructor = GBAWorkflow;

  /**
   * Detect GBA via "NINTENDO" text at offset 0xA0.
   * Every commercial GBA ROM has this.
   */
  GBAWorkflow.prototype.detect = function (data, fileName) {
    if (data && data.length > 0xB0) {
      var sig = 'NINTENDO';
      var match = true;
      for (var i = 0; i < sig.length; i++) {
        if (data[0xA0 + i] !== sig.charCodeAt(i)) { match = false; break; }
      }
      if (match) return true;
    }
    return Ketor.workflows.BaseWorkflow.prototype.detect.call(this, data, fileName);
  };

  GBAWorkflow.prototype.getSystemProfile = function () {
    return {
      name: 'GBA',
      terminator: [0xFF],
      pointerSize: 4,
      pointerEndianness: 'little',
      pointerBase: 0x08000000,
      extensions: ['gba'],
      hasHeader: false,
      headerSize: 0,
      pipelineId: 'pipeline_gba',
      profileId: 'profile_gba',
      // GBA pointer transforms:
      // gba:       offset | 0x08000000
      // gba_offset: raw offset
      // gba_mirror1: offset | 0x09000000
      // gba_mirror2: offset | 0x0A000000
      pointerTransforms: ['raw', 'base+', 'base-', 'gba', 'gba_offset', 'gba_mirror1', 'gba_mirror2'],
      // BIOS-supported compression
      compressionModes: ['lz10', 'lz11', 'huffman', 'rle'],
      // DWE (Double Word Encoding) support
      supportsDwe: true,
      // VWF may be present
      supportsVwf: true
    };
  };

  GBAWorkflow.prototype.getUIConfig = function () {
    return {
      showPaddingByte: true,     // DWE padding for GBA
      showStrictMode: false,
      showCompression: true,
      showDecompression: true,
      defaultMinLength: 4,
      defaultMaxLength: 1024,
      recommendedExtraction: 'standard',
      extractionLabel: 'Extract GBA Texts',
      showFontEditor: true,
      fontInfo: {
        bpp: 4,
        tileWidth: 8,
        tileHeight: 8,
        bytesPerTile: 32,
        chrLocation: 'vram-or-rom',
        supportsVwf: true
      },
      dweOptions: {
        enabled: true,
        label: 'DWE Padding',
        description: 'Double Word Encoding: adds 0x00 padding after single-byte tokens.'
      },
      compressionOptions: {
        enabled: true,
        modes: ['auto', 'lz10', 'lz11', 'huffman', 'rle', 'none'],
        label: 'GBA BIOS Compression'
      }
    };
  };

  GBAWorkflow.prototype.getHelpText = function () {
    return 'GBA games use 4-byte little-endian pointers (offset + ' +
           '0x08000000, then reversed byte order). Fonts are usually ' +
           '4bpp. Compression (LZ77, Huffman, RLE) is common -- enable ' +
           'decompression if texts look garbled. DWE padding is used ' +
           'in some games to align text to 2-byte boundaries.';
  };

  GBAWorkflow.prototype.extractText = function (rom, tableData, options) {
    var profile = this.getSystemProfile();
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.extractTextViaWorker) {
        reject(new Error('Extraction worker not available.'));
        return;
      }
      var extractionOptions = {
        minLength: options.minLength || 4,
        maxLength: options.maxLength || 1024,
        asciiFallback: options.asciiFallback !== false,
        strictExtractorMode: false,
        system: profile,
        systemPipeline: profile.pipelineId,
        usePaddingByte: !!options.usePaddingByte,
        enableDteMteCompression: options.enableDteMteCompression !== false,
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

  GBAWorkflow.prototype.insertText = function (rom, texts, tableData, options) {
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

  GBAWorkflow.prototype.validateBuild = function (rom, texts) {
    var overflow = this.findOverflowTexts(texts, null);
    if (overflow.length === 0) {
      return {
        ok: true,
        severity: 'ok',
        report: 'All texts fit. GBA 4-byte pointer validation passed.'
      };
    }
    // GBA supports auto-relocation with 4-byte pointer update
    return {
      ok: true,
      severity: 'warn',
      report: overflow.length + ' text(s) exceed original length. ' +
              'GBA auto-relocation with 4-byte pointer rewrite will be attempted.'
    };
  };

  Ketor.workflows.GBAWorkflow = GBAWorkflow;

})(window);