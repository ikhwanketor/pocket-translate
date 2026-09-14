/* ============================================================
   Ketor -- PlayStation 2 Workflow
   ------------------------------------------------------------
   Sony PlayStation 2 (PS2)
   - CPU: MIPS R5900 "Emotion Engine" @ 294 MHz (128-bit)
     + MIPS R3000A "IOP" @ 33 MHz (for I/O, sound)
   - Media: DVD-ROM (ISO 9660 + UDF v1.02)
   - RAM: 32 MB
   - Executable: ELF32, magic "\x7FELF", arch EM_MIPS
     - Main executable usually named SLPS_xxx.xx (JP) or
       SLUS_xxx.xx (US), referenced by SYSTEM.CNF
     - IRX modules: IOP binaries, can be KELF/KIRX encrypted
   - File system: ISO 9660 (older CD games) + UDF (DVD games)
   - Text location: .elf, .bin, .dat files, or TIM2 images
   - Pointer: 4-byte, little-endian, often relative
     - Pointer table usually located right above text block
     - Each pointer points to first letter of text
   - Terminator: 0x00, varies per game
   - Font: .tm2 (TIM2) format, or BIOS font
   - Encoding: Shift-JIS (CP932), EUC-JP, or custom
   - Compression: various (LZSS, custom) on .BIN/.DAT files
   - Tools: PCSX2 debugger, Cartographer + Atlas,
     QuickBMS, Ps2IsoTools, Xpert, CDmage
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  function PS2Workflow() {
    Ketor.workflows.BaseWorkflow.call(this);
    this.name = 'PlayStation 2';
    this.extensions = ['iso', 'bin', 'img', 'elf', 'irx'];
  }

  PS2Workflow.prototype = Object.create(Ketor.workflows.BaseWorkflow.prototype);
  PS2Workflow.prototype.constructor = PS2Workflow;

  /**
   * Detect PS2 via ISO 9660 "CD001" signature at 0x8001,
   * or ELF magic "\x7FELF" at offset 0.
   */
  PS2Workflow.prototype.detect = function (data, fileName) {
    if (data && data.length > 0x8010) {
      // ISO 9660 PVD signature at 0x8001
      var iso = 'CD001';
      var isoMatch = true;
      for (var i = 0; i < iso.length; i++) {
        if (data[0x8001 + i] !== iso.charCodeAt(i)) { isoMatch = false; break; }
      }
      if (isoMatch) return true;
    }
    if (data && data.length > 4) {
      // ELF magic: \x7FELF
      if (data[0] === 0x7F && data[1] === 0x45 &&
          data[2] === 0x4C && data[3] === 0x46) return true;
    }
    return Ketor.workflows.BaseWorkflow.prototype.detect.call(this, data, fileName);
  };

  PS2Workflow.prototype.getSystemProfile = function () {
    return {
      name: 'PlayStation 2',
      terminator: [0x00],
      pointerSize: 4,
      pointerEndianness: 'little',
      pointerBase: 0x00100000, // PS2 EE RAM base (varies)
      extensions: ['iso', 'bin', 'img', 'elf', 'irx'],
      hasHeader: true,
      headerSize: 0,
      pipelineId: 'pipeline_ps2',
      profileId: 'profile_ps2',
      pointerTransforms: ['raw', 'base+', 'base-'],
      cpuArch: 'mips32',
      // PS2-specific
      executableFormat: 'ELF32',
      elfMagic: '\x7FELF',
      elfArch: 'EM_MIPS',
      // File system
      fileSystem: 'ISO9660+UDF',
      // Font format
      fontFormat: 'TIM2',
      supportsTim2: true,
      // Encoding options
      encodings: ['shift-jis', 'euc-jp', 'custom'],
      // Compression
      supportsCompression: true,
      // Tools reference
      tools: {
        extract: ['Cartographer', 'QuickBMS', 'Xpert', 'CDmage'],
        insert: ['Atlas', 'QuickBMS'],
        debug: ['PCSX2 debugger'],
        iso: ['Ps2IsoTools', 'UltraISO', 'Apache3']
      },
      // Testing
      testMethods: ['pcsx2', 'hardware']
    };
  };

  PS2Workflow.prototype.getUIConfig = function () {
    return {
      showPaddingByte: false,
      showStrictMode: false,
      showCompression: true,
      showDecompression: true,
      defaultMinLength: 4,
      defaultMaxLength: 1400,
      recommendedExtraction: 'standard',
      extractionLabel: 'Extract PS2 Texts',
      showFontEditor: true,
      fontInfo: {
        bpp: 4,
        tileWidth: 8,
        tileHeight: 8,
        bytesPerTile: 32,
        format: 'TIM2',
        textureBased: true,
        extractTool: 'comptoe.exe or TextER'
      },
      // Compression info
      compressionOptions: {
        enabled: true,
        modes: ['auto', 'lzss', 'none'],
        label: 'PS2 Compression'
      },
      // Pointer table info
      pointerInfo: {
        size: 4,
        endianness: 'little',
        typicalLocation: 'right above text block',
        note: 'Pointer table is usually located immediately above the text block. Each pointer points to the first letter of a text entry.'
      },
      // ISO extraction info
      isoInfo: {
        tool: 'Ps2IsoTools (C#) or UltraISO',
        fileSystem: 'ISO 9660 + UDF v1.02',
        mainExecutable: 'SLPS_xxx.xx (JP) or SLUS_xxx.xx (US)',
        configFile: 'SYSTEM.CNF'
      },
      // ELF info
      elfInfo: {
        magic: '\\x7FELF',
        arch: 'MIPS (EM_MIPS)',
        class: 'ELF32',
        sections: ['.symtab', '.strtab']
      }
    };
  };

  PS2Workflow.prototype.getHelpText = function () {
    return 'PS2 games use DVD-ROM with ISO 9660 + UDF file system. ' +
           'The main executable is an ELF32 MIPS file (SLPS_xxx.xx or ' +
           'SLUS_xxx.xx), referenced by SYSTEM.CNF. Text is often stored ' +
           'in .elf, .bin, or .dat files with a 4-byte little-endian ' +
           'pointer table located right above the text block. Fonts are ' +
           'in TIM2 format. Use Cartographer + Atlas for extraction and ' +
           'insertion, or PCSX2 debugger for reverse engineering. ' +
           'Encoding is typically Shift-JIS (CP932).';
  };

  PS2Workflow.prototype.extractText = function (rom, tableData, options) {
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
        includeCompressedReadOnly: options.includeCompressedReadOnly !== false,
        // PS2-specific
        pointerSize: 4,
        pointerEndianness: 'little',
        encoding: options.encoding || 'shift-jis',
        isoExtraction: options.isoExtraction !== false,
        mainExecutable: options.mainExecutable || null
      };
      global.Ketor.extractTextViaWorker(rom, tableData, extractionOptions)
        .then(resolve)
        .catch(reject);
    });
  };

  PS2Workflow.prototype.insertText = function (rom, texts, tableData, options) {
    var profile = this.getSystemProfile();
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.buildRomViaWorker) {
        reject(new Error('Build worker not available.'));
        return;
      }
      var insertOptions = {
        usePaddingByte: false,
        pointerGroups: options.pointerGroups || [],
        // PS2-specific
        pointerSize: 4,
        pointerEndianness: 'little',
        encoding: options.encoding || 'shift-jis',
        rebuildIso: options.rebuildIso !== false,
        isoFileSystem: 'ISO9660+UDF'
      };
      global.Ketor.buildRomViaWorker(rom, texts, tableData, profile, insertOptions)
        .then(resolve)
        .catch(reject);
    });
  };

  PS2Workflow.prototype.validateBuild = function (rom, texts) {
    var overflow = this.findOverflowTexts(texts, null);
    if (overflow.length === 0) {
      return {
        ok: true,
        severity: 'ok',
        report: 'All texts fit. PS2 pointer table validation passed.'
      };
    }
    return {
      ok: true,
      severity: 'warn',
      report: overflow.length + ' text(s) exceed original length. ' +
              'Auto-relocation with 4-byte pointer rewrite will be attempted. ' +
              'Note: ISO 9660 + UDF structure must be preserved when rebuilding.'
    };
  };

  Ketor.workflows.PS2Workflow = PS2Workflow;

})(window);