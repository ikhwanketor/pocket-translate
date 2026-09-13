/* ============================================================
   Ketor -- Nintendo 3DS Workflow
   ------------------------------------------------------------
   Nintendo 3DS
   - CPU: ARM11 MPCore @ 268 MHz (quad-core) + ARM9
   - RAM: 128 MB
   - ROM: NCCH/CCI/CXI/CIA (encrypted, must decrypt first)
   - File system: RomFS + ExeFS
   - Text format: MSBT (standard Nintendo LMS format)
     - Blocks: TXT2 (text), LBL1 (labels), ATR1 (attributes),
       TSY1 (style), NLI1 (unknown)
     - Text encoding: UTF-16LE (typically)
     - MSBT files often inside .szs archives
   - Pointer: 4-byte, little-endian
   - Font: texture-based (BFFNT) or system font
   - Compression: zlib, LZSS
   - Requires CFW (Luma3DS) for testing, or Citra emulator
   - LayeredFS allows testing without rebuild
   - makerom rebuilds CIA
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  function ThreeDSWorkflow() {
    Ketor.workflows.BaseWorkflow.call(this);
    this.name = 'Nintendo 3DS';
    this.extensions = ['3ds', 'cci', 'cxi', 'cia'];
  }

  ThreeDSWorkflow.prototype = Object.create(Ketor.workflows.BaseWorkflow.prototype);
  ThreeDSWorkflow.prototype.constructor = ThreeDSWorkflow;

  /**
   * Detect 3DS via NCSD or NCCH signature at 0x100.
   */
  ThreeDSWorkflow.prototype.detect = function (data, fileName) {
    if (data && data.length > 0x110) {
      var ncsd = 'NCSD';
      var ncch = 'NCCH';
      var matchNcsd = true, matchNcch = true;
      for (var i = 0; i < 4; i++) {
        if (data[0x100 + i] !== ncsd.charCodeAt(i)) matchNcsd = false;
        if (data[0x100 + i] !== ncch.charCodeAt(i)) matchNcch = false;
      }
      if (matchNcsd || matchNcch) return true;
    }
    return Ketor.workflows.BaseWorkflow.prototype.detect.call(this, data, fileName);
  };

  ThreeDSWorkflow.prototype.getSystemProfile = function () {
    return {
      name: 'Nintendo 3DS',
      terminator: [0x00],
      pointerSize: 4,
      pointerEndianness: 'little',
      pointerBase: 0x00100000,
      extensions: ['3ds', 'cci', 'cxi', 'cia'],
      hasHeader: true,
      headerSize: 0x200,
      pipelineId: 'pipeline_3ds',
      profileId: 'profile_3ds',
      pointerTransforms: ['raw', 'base+', 'base-'],
      cpuArch: 'arm32',
      encrypted: true,
      requiresDecryption: true,
      // MSBT format support
      supportsMsbt: true,
      msbtBlocks: ['TXT2', 'LBL1', 'ATR1', 'TSY1', 'NLI1'],
      msbtEncoding: 'utf-16le',
      // Archive support
      supportsSzs: true,
      supportsSarc: true,
      // Compression
      compressionModes: ['zlib', 'lzss'],
      // Font format
      fontFormat: 'bffnt-or-system',
      // Testing methods
      testMethods: ['luma3ds-layeredfs', 'citra-emulator']
    };
  };

  ThreeDSWorkflow.prototype.getUIConfig = function () {
    return {
      showPaddingByte: false,
      showStrictMode: false,
      showCompression: false,
      showDecompression: false,
      defaultMinLength: 4,
      defaultMaxLength: 2048,
      recommendedExtraction: 'standard',
      extractionLabel: 'Extract 3DS Texts',
      showFontEditor: true,
      fontInfo: {
        bpp: 4,
        tileWidth: 8,
        tileHeight: 8,
        bytesPerTile: 32,
        chrLocation: 'texture',
        textureBased: true,
        format: 'BFFNT'
      },
      requiresDecryption: true,
      decryptionNote: 'This ROM is encrypted. Decrypt with Decrypt9 or use a decrypted dump before loading.',
      textFormatNote: 'Text is stored in MSBT format inside .szs archives. Blocks: TXT2 (text), LBL1 (labels), ATR1 (attributes).',
      testNote: 'Test with LayeredFS (SD:/luma/titles/{TID}/romfs/) or Citra emulator.'
    };
  };

  ThreeDSWorkflow.prototype.getHelpText = function () {
    return '3DS ROMs are encrypted and must be decrypted first ' +
           '(using Decrypt9 or a decrypted dump). Text is usually in ' +
           'MSBT format (UTF-16LE) inside RomFS, often packaged in ' +
           '.szs archives. Pointers are 4-byte little-endian. ' +
           'Test with LayeredFS or Citra emulator. Rebuild CIA with makerom.';
  };

  ThreeDSWorkflow.prototype.extractText = function (rom, tableData, options) {
    var profile = this.getSystemProfile();
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.extractTextViaWorker) {
        reject(new Error('Extraction worker not available.'));
        return;
      }
      var extractionOptions = {
        minLength: options.minLength || 4,
        maxLength: options.maxLength || 2048,
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

  ThreeDSWorkflow.prototype.insertText = function (rom, texts, tableData, options) {
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

  ThreeDSWorkflow.prototype.validateBuild = function (rom, texts) {
    var overflow = this.findOverflowTexts(texts, null);
    if (overflow.length === 0) {
      return {
        ok: true,
        severity: 'ok',
        report: 'All texts fit. 3DS MSBT validation passed.'
      };
    }
    return {
      ok: true,
      severity: 'warn',
      report: overflow.length + ' text(s) exceed original length. ' +
              'MSBT files may need repacking. Auto-relocation will be attempted.'
    };
  };

  Ketor.workflows.ThreeDSWorkflow = ThreeDSWorkflow;

})(window);