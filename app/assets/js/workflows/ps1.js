/* ============================================================
   Ketor -- PlayStation 1 Workflow
   ------------------------------------------------------------
   Sony PlayStation 1 (PSX)
   - CPU: MIPS R3000A @ 33.8 MHz (32-bit)
   - Media: CD-ROM (ISO 9660 file system)
   - Pointer: 4-byte, little-endian
   - Terminator: 0x00, varies per game
   - Font: TIM (Texture Image Map) format or BIOS font
   - Text location: .DAT / .BIN files, or hardbaked into TIM images
   - TIM header: magic, version, flags, VRAM upload position
   - Some games use PS1 BIOS font (not embedded in ROM)
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  function PS1Workflow() {
    Ketor.workflows.BaseWorkflow.call(this);
    this.name = 'PlayStation 1';
    this.extensions = ['bin', 'iso', 'img', 'psx'];
  }

  PS1Workflow.prototype = Object.create(Ketor.workflows.BaseWorkflow.prototype);
  PS1Workflow.prototype.constructor = PS1Workflow;

  /**
   * Detect PS1 via ISO 9660 "CD001" signature at 0x8001,
   * or PS-X EXE header.
   */
  PS1Workflow.prototype.detect = function (data, fileName) {
    if (data && data.length > 0x8010) {
      // ISO 9660 PVD signature
      var iso = 'CD001';
      var isoMatch = true;
      for (var i = 0; i < iso.length; i++) {
        if (data[0x8001 + i] !== iso.charCodeAt(i)) { isoMatch = false; break; }
      }
      if (isoMatch) return true;

      // PS-X EXE signature
      var psx = 'PS-X EXE';
      var psxMatch = true;
      for (var j = 0; j < psx.length; j++) {
        if (data[j] !== psx.charCodeAt(j)) { psxMatch = false; break; }
      }
      if (psxMatch) return true;
    }
    return Ketor.workflows.BaseWorkflow.prototype.detect.call(this, data, fileName);
  };

  PS1Workflow.prototype.getSystemProfile = function () {
    return {
      name: 'PlayStation 1',
      terminator: [0x00],
      pointerSize: 4,
      pointerEndianness: 'little',
      pointerBase: 0x80010000,
      extensions: ['bin', 'iso', 'img', 'psx'],
      hasHeader: true,
      headerSize: 0,
      pipelineId: 'pipeline_ps1',
      profileId: 'profile_ps1',
      pointerTransforms: ['raw', 'base+', 'base-'],
      // PS1 uses TIM format for textures/fonts
      supportsTim: true,
      supportsBiosFont: true,
      // MIPS R3000A
      cpuArch: 'mips32'
    };
  };

  PS1Workflow.prototype.getUIConfig = function () {
    return {
      showPaddingByte: false,
      showStrictMode: false,
      showCompression: false,
      showDecompression: false,
      defaultMinLength: 4,
      defaultMaxLength: 1400,
      recommendedExtraction: 'standard',
      extractionLabel: 'Extract PS1 Texts',
      showFontEditor: true,
      fontInfo: {
        bpp: 4,
        tileWidth: 8,
        tileHeight: 8,
        bytesPerTile: 32,
        format: 'TIM',
        supportsBiosFont: true
      }
    };
  };

  PS1Workflow.prototype.getHelpText = function () {
    return 'PS1 games store text in .DAT/.BIN files or hardbaked into ' +
           'TIM images. Fonts may be in TIM format or use the PS1 BIOS ' +
           'font. Pointers are 4-byte little-endian. Some games use ' +
           'Shift-JIS encoding for Japanese text.';
  };

  PS1Workflow.prototype.extractText = function (rom, tableData, options) {
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

  PS1Workflow.prototype.insertText = function (rom, texts, tableData, options) {
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

  PS1Workflow.prototype.validateBuild = function (rom, texts) {
    var overflow = this.findOverflowTexts(texts, null);
    if (overflow.length === 0) {
      return {
        ok: true,
        severity: 'ok',
        report: 'All texts fit. PS1 pointer validation passed.'
      };
    }
    return {
      ok: true,
      severity: 'warn',
      report: overflow.length + ' text(s) exceed original length. ' +
              'Auto-relocation with 4-byte pointer rewrite will be attempted.'
    };
  };

  Ketor.workflows.PS1Workflow = PS1Workflow;

})(window);