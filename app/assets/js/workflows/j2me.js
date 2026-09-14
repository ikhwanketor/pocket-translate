/* ============================================================
   Ketor -- Java ME (J2ME) Workflow
   ------------------------------------------------------------
   Java 2 Micro Edition (J2ME) / MIDlet
   - Format: .jar (ZIP archive) + .jad (descriptor)
   - Code: Java bytecode (.class files, Dalvik-like)
   - Text locations:
     1. Hardcoded strings in .class constant pool
        (CONSTANT_Utf8_info, Modified UTF-8 encoding,
         u2 length prefix before data)
     2. Resource files: .lng, .properties, .dat, custom
     3. Gameloft format: .TEXTS + TEXTS.KEYS, or "EN"/"NN"
        files with language blocks at start
     4. MANIFEST.MF (in JAR) and .jad (descriptor)
   - JAD attributes: MIDlet-Name, MIDlet-Version,
     MIDlet-Vendor, MIDlet-Jar-URL, MIDlet-Jar-Size,
     MIDlet-1 (name, icon, class), MicroEdition-Configuration,
     MicroEdition-Profile
   - Constant pool string editing: MUST update u2 length
     field (2 bytes big-endian) when changing string length,
     otherwise ClassFormatError occurs.
   - ProGuard obfuscation is common; strings still readable.
   - Tools: JD-GUI (decompile), VisualClassBytes (constant
     pool editor), MobiTrans (in-class translator),
     ClassExplorer, HxD/UEdit32 (hex editor)
   - Testing: J2ME Loader, JL-MOD, KEmulator
   - Workflow:
     1. Extract .jar with WinRAR/7-Zip
     2. Decompile .class with JD-GUI to find strings
     3. Edit constant pool (length-aware) or hex edit
     4. Repack .jar
     5. Test with J2ME Loader
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  function J2MEWorkflow() {
    Ketor.workflows.BaseWorkflow.call(this);
    this.name = 'Java ME (J2ME)';
    this.extensions = ['jar', 'jad', 'class'];
  }

  J2MEWorkflow.prototype = Object.create(Ketor.workflows.BaseWorkflow.prototype);
  J2MEWorkflow.prototype.constructor = J2MEWorkflow;

  /**
   * Detect J2ME via ZIP header (PK\x03\x04) and
   * .jar/.jad/.class extension, or JAD text format
   * (starts with "MIDlet-Name:" or "Manifest-Version:").
   */
  J2MEWorkflow.prototype.detect = function (data, fileName) {
    var ext = (fileName || '').split('.').pop().toLowerCase();
    if (ext === 'jar' || ext === 'jad' || ext === 'class') {
      return true;
    }
    if (data && data.length > 4) {
      // ZIP magic: PK\x03\x04 (JAR is ZIP)
      if (data[0] === 0x50 && data[1] === 0x4B &&
          data[2] === 0x03 && data[3] === 0x04) {
        return true;
      }
      // JAD text format detection
      var head = '';
      for (var i = 0; i < Math.min(data.length, 200); i++) {
        head += String.fromCharCode(data[i]);
      }
      if (head.indexOf('MIDlet-Name:') !== -1 ||
          head.indexOf('MIDlet-Jar-URL:') !== -1 ||
          head.indexOf('MicroEdition-Configuration:') !== -1) {
        return true;
      }
    }
    return Ketor.workflows.BaseWorkflow.prototype.detect.call(this, data, fileName);
  };

  /**
   * Parse JAD descriptor attributes.
   * Returns an object with MIDlet-Name, MIDlet-Version, etc.
   */
  J2MEWorkflow.prototype.parseJad = function (jadText) {
    var result = {};
    if (!jadText) return result;
    var lines = String(jadText).replace(/\r/g, '').split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line || line.charAt(0) === '#') continue;
      var colon = line.indexOf(':');
      if (colon <= 0) continue;
      var key = line.substring(0, colon).trim();
      var value = line.substring(colon + 1).trim();
      result[key] = value;
    }
    return result;
  };

  /**
   * Parse MIDlet-1 attribute: name, icon, class.
   * Example: "Assas, /icon.png, AssC"
   */
  J2MEWorkflow.prototype.parseMidlet1 = function (value) {
    if (!value) return null;
    var parts = String(value).split(',');
    if (parts.length < 3) return null;
    return {
      name: parts[0].trim(),
      icon: parts[1].trim(),
      className: parts[2].trim()
    };
  };

  J2MEWorkflow.prototype.getSystemProfile = function () {
    return {
      name: 'Java ME (J2ME)',
      terminator: [0x00],
      pointerSize: 4,
      pointerEndianness: 'big',
      pointerBase: 0,
      extensions: ['jar', 'jad', 'class'],
      hasHeader: false,
      headerSize: 0,
      pipelineId: 'pipeline_j2me',
      profileId: 'profile_j2me',
      // J2ME-specific
      containerFormat: 'JAR (ZIP archive)',
      descriptorFormat: 'JAD (text)',
      codeFormat: 'Java bytecode (.class)',
      // Constant pool string encoding
      constantPoolEncoding: 'modified-utf8',
      // String length field
      stringLengthField: {
        type: 'u2',
        endianness: 'big',
        bytes: 2,
        description: 'CONSTANT_Utf8_info length prefix must be updated when string length changes'
      },
      // ProGuard obfuscation common
      obfuscationCommon: true,
      // Text locations
      textLocations: {
        hardcoded: '.class constant pool (Modified UTF-8)',
        manifest: 'MANIFEST.MF (inside JAR)',
        jad: '.jad descriptor (MIDlet-Name, MIDlet-Vendor, etc.)',
        resourceFiles: '.lng, .properties, .dat, custom'
      },
      // Resource file formats
      resourceFormats: {
        lng: 'Language files (key-value or custom)',
        properties: 'Key-value text files',
        dat: 'Custom binary data',
        noExtension: 'Gameloft: "EN"/"NN" files with language blocks',
        gameloftTexts: '.TEXTS + TEXTS.KEYS (keys = string IDs, texts = data)'
      },
      // Tools
      tools: {
        decompile: ['JD-GUI', 'JAD', 'Procyon', 'CFR'],
        constantPool: ['VisualClassBytes', 'ClassExplorer', 'ASM'],
        inClassTranslate: ['MobiTrans', 'InClassTrans'],
        hexEditor: ['HxD', 'UEdit32', 'WinHex'],
        repack: ['WinRAR', '7-Zip'],
        emulator: ['J2ME Loader', 'JL-MOD', 'KEmulator']
      },
      // Testing
      testMethods: ['j2me-loader', 'kemulator', 'real-device']
    };
  };

  J2MEWorkflow.prototype.getUIConfig = function () {
    return {
      showPaddingByte: false,
      showStrictMode: false,
      showCompression: false,
      showDecompression: false,
      defaultMinLength: 2,
      defaultMaxLength: 512,
      recommendedExtraction: 'standard',
      extractionLabel: 'Extract J2ME Texts',
      showFontEditor: false, // J2ME fonts are system bitmap fonts
      // Constant pool info
      constantPoolInfo: {
        encoding: 'Modified UTF-8',
        lengthField: 'u2 (2 bytes, big-endian)',
        warning: 'When changing string length in constant pool, you MUST update the u2 length field. Otherwise ClassFormatError occurs.'
      },
      // JAD info
      jadInfo: {
        attributes: ['MIDlet-Name', 'MIDlet-Version', 'MIDlet-Vendor',
                     'MIDlet-Jar-URL', 'MIDlet-Jar-Size', 'MIDlet-1',
                     'MicroEdition-Configuration', 'MicroEdition-Profile'],
        description: 'JAD is a text descriptor for the JAR. Edit it to change app name, vendor, or version.'
      },
      // Resource file info
      resourceInfo: {
        formats: ['.lng', '.properties', '.dat', 'no-extension'],
        description: 'Resource files may contain language strings. Common formats: .lng (key-value or custom), .properties (key=value), Gameloft "EN"/"NN" files.'
      },
      // Tool reference
      toolReference: {
        decompile: ['JD-GUI', 'Procyon', 'CFR'],
        constantPool: ['VisualClassBytes', 'ClassExplorer'],
        inClassTranslate: ['MobiTrans', 'InClassTrans'],
        hexEditor: ['HxD', 'UEdit32'],
        emulator: ['J2ME Loader', 'JL-MOD', 'KEmulator']
      },
      // ProGuard warning
      proGuardWarning: {
        enabled: true,
        message: 'This game may be obfuscated with ProGuard. Class/method names will be scrambled, but strings in the constant pool are still readable and editable.'
      }
    };
  };

  J2MEWorkflow.prototype.getHelpText = function () {
    return 'J2ME games are distributed as .jar (ZIP archive) with a ' +
           '.jad descriptor. Text is stored in two places: (1) hardcoded ' +
           'strings in .class constant pool (Modified UTF-8, with u2 ' +
           'length prefix), and (2) resource files (.lng, .properties, ' +
           '.dat). Use JD-GUI to decompile and find strings, then edit ' +
           'the constant pool (update the u2 length field!) or hex edit. ' +
           'Test with J2ME Loader. ProGuard obfuscation may scramble ' +
           'class names but strings remain readable.';
  };

  J2MEWorkflow.prototype.extractText = function (rom, tableData, options) {
    var profile = this.getSystemProfile();
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.extractTextViaWorker) {
        reject(new Error('Extraction worker not available.'));
        return;
      }
      var extractionOptions = {
        minLength: options.minLength || 2,
        maxLength: options.maxLength || 512,
        asciiFallback: true,
        strictExtractorMode: false,
        system: profile,
        systemPipeline: profile.pipelineId,
        usePaddingByte: false,
        enableDteMteCompression: false,
        compressionStrategy: 'optimal',
        enableTextDecompression: false,
        includeCompressedReadOnly: false,
        // J2ME-specific
        containerFormat: 'JAR',
        constantPoolEncoding: 'modified-utf8',
        stringLengthField: 'u2-big-endian',
        // Resource file handling
        scanResourceFiles: options.scanResourceFiles !== false,
        resourceExtensions: ['.lng', '.properties', '.dat', '.txt'],
        // JAD parsing
        parseJad: options.parseJad !== false,
        // ProGuard awareness
        proGuardAware: true
      };
      global.Ketor.extractTextViaWorker(rom, tableData, extractionOptions)
        .then(resolve)
        .catch(reject);
    });
  };

  J2MEWorkflow.prototype.insertText = function (rom, texts, tableData, options) {
    var profile = this.getSystemProfile();
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.buildRomViaWorker) {
        reject(new Error('Build worker not available.'));
        return;
      }
      var insertOptions = {
        usePaddingByte: false,
        pointerGroups: options.pointerGroups || [],
        // J2ME-specific
        updateConstantPoolLength: options.updateConstantPoolLength !== false,
        constantPoolEncoding: 'modified-utf8',
        stringLengthField: 'u2-big-endian',
        repackJar: options.repackJar !== false,
        updateJad: options.updateJad !== false,
        // Resource file rewriting
        rewriteResourceFiles: options.rewriteResourceFiles !== false
      };
      global.Ketor.buildRomViaWorker(rom, texts, tableData, profile, insertOptions)
        .then(resolve)
        .catch(reject);
    });
  };

  J2MEWorkflow.prototype.validateBuild = function (rom, texts) {
    var overflow = this.findOverflowTexts(texts, null);
    if (overflow.length === 0) {
      return {
        ok: true,
        severity: 'ok',
        report: 'All texts fit. J2ME constant pool validation passed.'
      };
    }
    return {
      ok: true,
      severity: 'warn',
      report: overflow.length + ' text(s) exceed original length. ' +
              'Constant pool u2 length field will be updated. ' +
              'JAR will be repacked. Test with J2ME Loader.'
    };
  };

  Ketor.workflows.J2MEWorkflow = J2MEWorkflow;

})(window);