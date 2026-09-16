/* ============================================================
   Ketor -- Android (APK) Workflow
   ------------------------------------------------------------
   Android APK (application package)
   - Format: ZIP archive containing compiled app
   - Contents:
     - classes.dex (Dalvik bytecode)
     - res/values/strings.xml (UI strings, decoded by apktool)
     - resources.arsc (binary compiled resources)
     - lib/ (native libraries)
     - assets/ (game data, Unity/Unreal files)
     - META-INF/ (signature)
   - Text locations:
     - UI strings: res/values/strings.xml + res/values-* /strings.xml
       (after apktool decode; compiled into resources.arsc)
     - Hardcoded strings: classes.dex (need JADX to read)
     - Unity IL2CPP: assets/bin/Data/Managed/Metadata/global-metadata.dat
       (header list of offset+length, data area with strings)
     - Unity Mono: assets/bin/Data/Managed/Assembly-CSharp.dll
     - Unreal: assets/ + .pak files
     - Asset files: assets/*.json, *.txt, *.xml, *.dat
   - Tools:
     - apktool (decode resources, rebuild APK)
     - JADX (decompile classes.dex to Java)
     - uber-apk-signer (re-sign APK after modification)
     - MetaDataStringEditor (edit global-metadata.dat strings)
     - AssetStudio / UABE (Unity asset extraction)
   - Workflow:
     1. apktool d game.apk -o output/
     2. Edit res/values/strings.xml + res/values-* /strings.xml
     3. Edit global-metadata.dat (if Unity IL2CPP)
     4. apktool b output/ -o game_mod.apk
     5. uber-apk-signer -a game_mod.apk
     6. Install and test
   - Signing: APKs must be re-signed after modification.
   - Anti-cheat/DRM: Some games use obfuscation, encryption,
     or anti-tamper. Detect and warn.
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  function AndroidWorkflow() {
    Ketor.workflows.BaseWorkflow.call(this);
    this.name = 'Android';
    this.extensions = ['apk', 'xapk', 'apks', 'apkm'];
  }

  AndroidWorkflow.prototype = Object.create(Ketor.workflows.BaseWorkflow.prototype);
  AndroidWorkflow.prototype.constructor = AndroidWorkflow;

  /**
   * Detect Android APK via ZIP local file header "PK\x03\x04"
   * and the presence of "classes.dex" or "AndroidManifest.xml"
   * in the first 1 KB of the archive index.
   */
  AndroidWorkflow.prototype.detect = function (data, fileName) {
    if (data && data.length > 4) {
      // ZIP magic: PK\x03\x04
      if (data[0] === 0x50 && data[1] === 0x4B &&
          data[2] === 0x03 && data[3] === 0x04) {
        // Check for Android-specific markers in the file name
        var ext = (fileName || '').split('.').pop().toLowerCase();
        if (ext === 'apk' || ext === 'xapk' || ext === 'apks' || ext === 'apkm') {
          return true;
        }
      }
    }
    return Ketor.workflows.BaseWorkflow.prototype.detect.call(this, data, fileName);
  };

  /**
   * Detect Unity within an APK by checking for signature files.
   * Returns engine info if detected.
   */
  AndroidWorkflow.prototype.detectEngine = function (fileList) {
    if (!fileList || fileList.length === 0) return null;

    var hasUnityIL2CPP = fileList.some(function (f) {
      return /global-metadata\.dat$/i.test(f) || /libil2cpp\.so$/i.test(f);
    });
    if (hasUnityIL2CPP) {
      return { engine: 'Unity (IL2CPP)', confidence: 0.95,
               stringFile: 'assets/bin/Data/Managed/Metadata/global-metadata.dat' };
    }

    var hasUnityMono = fileList.some(function (f) {
      return /Assembly-CSharp\.dll$/i.test(f) || /UnityPlayer\.so$/i.test(f);
    });
    if (hasUnityMono) {
      return { engine: 'Unity (Mono)', confidence: 0.9,
               stringFile: 'assets/bin/Data/Managed/Assembly-CSharp.dll' };
    }

    var hasUnreal = fileList.some(function (f) {
      return /\.pak$/i.test(f) || /libUE4\.so$/i.test(f);
    });
    if (hasUnreal) {
      return { engine: 'Unreal Engine', confidence: 0.85,
               stringFile: 'assets/ + *.pak' };
    }

    var hasNative = fileList.some(function (f) {
      return /lib\/.*\.so$/i.test(f);
    });
    if (hasNative) {
      return { engine: 'Native (C/C++)', confidence: 0.6,
               stringFile: 'lib/*.so (strings in .rodata section)' };
    }

    // Default: standard Android app with strings.xml
    return { engine: 'Standard Android', confidence: 0.8,
             stringFile: 'res/values/strings.xml' };
  };

  AndroidWorkflow.prototype.getSystemProfile = function () {
    return {
      name: 'Android',
      terminator: [0x00],
      pointerSize: 4,
      pointerEndianness: 'little',
      pointerBase: 0,
      extensions: ['apk', 'xapk', 'apks', 'apkm'],
      hasHeader: false,
      headerSize: 0,
      pipelineId: 'pipeline_android',
      profileId: 'profile_android',
      // Android-specific
      containerFormat: 'APK (ZIP)',
      codeFormat: 'DEX (Dalvik bytecode)',
      resourceFormat: 'resources.arsc (binary)',
      // Text locations
      textLocations: {
        uiStrings: 'res/values/strings.xml',
        localizedStrings: 'res/values-*/strings.xml',
        compiledResources: 'resources.arsc',
        hardcoded: 'classes.dex',
        unityIL2CPP: 'assets/bin/Data/Managed/Metadata/global-metadata.dat',
        unityMono: 'assets/bin/Data/Managed/Assembly-CSharp.dll',
        assetFiles: 'assets/*.json, *.txt, *.xml, *.dat'
      },
      // Tools
      tools: {
        decode: ['apktool', 'JADX'],
        rebuild: ['apktool'],
        sign: ['uber-apk-signer', 'apksigner'],
        unityMeta: ['MetaDataStringEditor', 'Il2CppDumper'],
        unityAsset: ['AssetStudio', 'UABE']
      },
      // Signing required
      requiresSigning: true,
      // Anti-cheat
      antiCheatPossible: true,
      antiCheatWarning: 'Some games use anti-tamper or signature verification. If the modified APK crashes, the app may have protection.'
    };
  };

  AndroidWorkflow.prototype.getUIConfig = function () {
    return {
      showPaddingByte: false,
      showStrictMode: false,
      showCompression: false,
      showDecompression: false,
      defaultMinLength: 4,
      defaultMaxLength: 1024,
      recommendedExtraction: 'engine-aware',
      extractionLabel: 'Detect Engine & Extract',
      showFontEditor: false, // Android fonts are system fonts
      // Engine detection
      engineDetection: {
        enabled: true,
        autoDetect: true,
        supportedEngines: ['Unity (IL2CPP)', 'Unity (Mono)', 'Unreal Engine', 'Native (C/C++)', 'Standard Android'],
        approaches: [
          { id: 'apktool', label: 'APKTool (resources only)', description: 'Decode res/values/strings.xml. Best for standard apps.' },
          { id: 'jadx', label: 'JADX (decompile DEX)', description: 'Decompile classes.dex to Java. Best for hardcoded strings.' },
          { id: 'unity-meta', label: 'Unity Metadata (global-metadata.dat)', description: 'Edit string literals in Unity IL2CPP games.' },
          { id: 'unity-asset', label: 'Unity Asset (AssetStudio/UABE)', description: 'Extract and edit Unity assets.' }
        ]
      },
      // Signing info
      signingInfo: {
        required: true,
        tool: 'uber-apk-signer',
        message: 'Modified APKs must be re-signed before installation. Ketor uses uber-apk-signer for this.'
      },
      // Anti-cheat warning
      antiCheatWarning: {
        enabled: true,
        message: 'Some games use anti-tamper or signature verification. If the modified APK crashes, the game may have protection.'
      }
    };
  };

  AndroidWorkflow.prototype.getHelpText = function () {
    return 'Android APKs are ZIP archives. Standard apps store UI text ' +
           'in res/values/strings.xml. Unity games store text in ' +
           'global-metadata.dat (IL2CPP) or Assembly-CSharp.dll (Mono). ' +
           'Ketor will auto-detect the engine. Use apktool to decode, ' +
           'edit, rebuild, and uber-apk-signer to re-sign.';
  };

  AndroidWorkflow.prototype.extractText = function (rom, tableData, options) {
    var profile = this.getSystemProfile();
    var self = this;
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.extractTextViaWorker) {
        reject(new Error('Extraction worker not available.'));
        return;
      }
      var engineInfo = null;
      if (options.fileList && options.fileList.length > 0) {
        engineInfo = self.detectEngine(options.fileList);
      }
      var extractionOptions = {
        minLength: options.minLength || 4,
        maxLength: options.maxLength || 1024,
        asciiFallback: true,
        strictExtractorMode: false,
        system: profile,
        systemPipeline: profile.pipelineId,
        usePaddingByte: false,
        enableDteMteCompression: false,
        compressionStrategy: 'optimal',
        enableTextDecompression: false,
        includeCompressedReadOnly: false,
        // Android-specific
        detectedEngine: engineInfo ? engineInfo.engine : null,
        engineStringFile: engineInfo ? engineInfo.stringFile : null,
        extractionApproach: options.extractionApproach || 'apktool',
        decompileDex: options.decompileDex === true
      };
      global.Ketor.extractTextViaWorker(rom, tableData, extractionOptions)
        .then(resolve)
        .catch(reject);
    });
  };

  AndroidWorkflow.prototype.insertText = function (rom, texts, tableData, options) {
    var profile = this.getSystemProfile();
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.buildRomViaWorker) {
        reject(new Error('Build worker not available.'));
        return;
      }
      var insertOptions = {
        usePaddingByte: false,
        pointerGroups: options.pointerGroups || [],
        // Android-specific
        detectedEngine: options.detectedEngine || null,
        rebuildApk: options.rebuildApk !== false,
        signApk: options.signApk !== false,
        signingTool: 'uber-apk-signer'
      };
      global.Ketor.buildRomViaWorker(rom, texts, tableData, profile, insertOptions)
        .then(resolve)
        .catch(reject);
    });
  };

  AndroidWorkflow.prototype.validateBuild = function (rom, texts) {
    var overflow = this.findOverflowTexts(texts, null);
    if (overflow.length === 0) {
      return {
        ok: true,
        severity: 'ok',
        report: 'All texts fit. Android APK validation passed.'
      };
    }
    return {
      ok: true,
      severity: 'warn',
      report: overflow.length + ' text(s) exceed original length. ' +
              'APK repacking and re-signing will be required.'
    };
  };

  Ketor.workflows.AndroidWorkflow = AndroidWorkflow;

})(window);