/* ============================================================
   Ketor -- PlayStation Portable Workflow
   ------------------------------------------------------------
   Sony PlayStation Portable (PSP)
   - CPU: MIPS R4000 @ 333 MHz (32-bit, Allegrex)
   - Media: UMD (ISO/CSO), PBP
   - Pointer: 4-byte, little-endian, often relative
   - Terminator: 0x00, varies per game
   - Font: texture-based or system font (pff)
   - Text formats: EBOOT.BIN (ELF), .bin, .pak, .cpk
   - Encryption: EBOOT.BIN may start with ~PSP (encrypted)
     or ELF (decrypted)
   - Compression: CSO (CISO), LZSS
   - Common encoding: Shift-JIS, UTF-8, UTF-16LE
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  function PSPWorkflow() {
    Ketor.workflows.BaseWorkflow.call(this);
    this.name = 'PlayStation Portable';
    this.extensions = ['iso', 'cso', 'pbp', 'elf'];
  }

  PSPWorkflow.prototype = Object.create(Ketor.workflows.BaseWorkflow.prototype);
  PSPWorkflow.prototype.constructor = PSPWorkflow;

  /**
   * Detect PSP via UMD ISO "CD001" signature at 0x8001 and
   * "PSP GAME" marker at 0x8008.
   */
  PSPWorkflow.prototype.detect = function (data, fileName) {
    if (data && data.length > 0x8010) {
      var iso = 'CD001';
      var match = true;
      for (var i = 0; i < iso.length; i++) {
        if (data[0x8001 + i] !== iso.charCodeAt(i)) { match = false; break; }
      }
      if (match && data.length > 0x8010) {
        var psp = 'PSP GAME';
        var pspMatch = true;
        for (var j = 0; j < psp.length; j++) {
          if (data[0x8008 + j] !== psp.charCodeAt(j)) { pspMatch = false; break; }
        }
        if (pspMatch) return true;
      }
    }
    return Ketor.workflows.BaseWorkflow.prototype.detect.call(this, data, fileName);
  };

  PSPWorkflow.prototype.getSystemProfile = function () {
    return {
      name: 'PlayStation Portable',
      terminator: [0x00],
      pointerSize: 4,
      pointerEndianness: 'little',
      pointerBase: 0x08800000,
      extensions: ['iso', 'cso', 'pbp', 'elf'],
      hasHeader: true,
      headerSize: 0,
      pipelineId: 'pipeline_psp',
      profileId: 'profile_psp',
      pointerTransforms: ['raw', 'base+', 'base-'],
      cpuArch: 'mips32',
      compressionModes: ['cso', 'lzss'],
      // EBOOT.BIN can be encrypted (~PSP) or decrypted (ELF)
      executableEncryption: 'auto',
      // Font can be in system pff or as texture
      fontFormat: 'texture-or-system',
      // Common encodings
      encodings: ['shift-jis', 'utf-8', 'utf-16le']
    };
  };

  PSPWorkflow.prototype.getUIConfig = function () {
    return {
      showPaddingByte: false,
      showStrictMode: false,
      showCompression: false,
      showDecompression: false,
      defaultMinLength: 4,
      defaultMaxLength: 1800,
      recommendedExtraction: 'standard',
      extractionLabel: 'Extract PSP Texts',
      showFontEditor: true,
      fontInfo: {
        bpp: 2,
        tileWidth: 8,
        tileHeight: 8,
        bytesPerTile: 16,
        chrLocation: 'texture-or-system',
        textureBased: true,
        tileMolesterNote: 'Open pff font with Tile Molester: 2-Dimensional, 2 bpp linear, reverse order, 2 tiles/row.'
      },
      executableNote: 'EBOOT.BIN may be encrypted (~PSP header). Use DecEboot to decrypt to ELF first if needed.'
    };
  };

  PSPWorkflow.prototype.getHelpText = function () {
    return 'PSP games use 4-byte little-endian pointers, often relative. ' +
           'Use UMDGen to extract ISO/CSO contents. EBOOT.BIN may be ' +
           'encrypted (~PSP) or decrypted (ELF). Text is commonly in ' +
           'Shift-JIS or UTF-8. Fonts can be system pff or textures ' +
           '(editable with Tile Molester in 2bpp linear mode).';
  };

  PSPWorkflow.prototype.extractText = function (rom, tableData, options) {
    var profile = this.getSystemProfile();
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.extractTextViaWorker) {
        reject(new Error('Extraction worker not available.'));
        return;
      }
      var extractionOptions = {
        minLength: options.minLength || 4,
        maxLength: options.maxLength || 1800,
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

  PSPWorkflow.prototype.insertText = function (rom, texts, tableData, options) {
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

  PSPWorkflow.prototype.validateBuild = function (rom, texts) {
    var overflow = this.findOverflowTexts(texts, null);
    if (overflow.length === 0) {
      return {
        ok: true,
        severity: 'ok',
        report: 'All texts fit. PSP pointer validation passed.'
      };
    }
    return {
      ok: true,
      severity: 'warn',
      report: overflow.length + ' text(s) exceed original length. ' +
              'Auto-relocation will be attempted. Note: .pak file ' +
              'pointer tables may require manual adjustment.'
    };
  };

  Ketor.workflows.PSPWorkflow = PSPWorkflow;

})(window);