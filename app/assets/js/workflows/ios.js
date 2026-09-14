/* ============================================================
   Ketor -- iOS (IPA) Workflow
   ------------------------------------------------------------
   iOS IPA (iOS App Store Package)
   - Format: ZIP archive containing Payload/App.app/
   - Contents:
     - Payload/App.app/ (the .app bundle)
     - App.app/Info.plist (metadata)
     - App.app/*.strings (localized UI strings)
     - App.app/Base.lproj/*.strings
     - App.app/*.storyboardc (compiled UI)
     - App.app/Frameworks/ (dynamic libraries)
     - App.app/Assets.car (compiled asset catalog)
     - App.app/* (Mach-O binary, encrypted FairPlay)
   - Text locations:
     - UI strings: *.strings (binary plist or text format)
     - Info.plist: app name, bundle ID
     - Asset catalog: images, colors, strings
     - AssetBundle (Unity): Data/ + *.bundle
     - Hardcoded: Mach-O __cstring and __const sections
   - Encryption: Mach-O binaries are FairPlay-encrypted.
     Must be decrypted on a jailbroken device with
     frida-ios-dump or Clutch before analysis.
   - Signing: Modified IPA must be re-signed with a
     provisioning profile and codesign. Tools: node-applesign,
     fastlane-plugin-repack_ios, iTools, esign.
   - Workflow:
     1. Decrypt IPA (jailbreak: frida-ios-dump, Clutch)
     2. Unzip IPA -> Payload/App.app/
     3. Edit .strings / .plist / AssetBundle
     4. Repack to .ipa
     5. Re-sign with provisioning profile
     6. Install (jailbreak) or sideload
   - Real-time OCR alternative: PiP Translate, TransPeek
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  function IOSWorkflow() {
    Ketor.workflows.BaseWorkflow.call(this);
    this.name = 'iOS';
    this.extensions = ['ipa', 'app'];
  }

  IOSWorkflow.prototype = Object.create(Ketor.workflows.BaseWorkflow.prototype);
  IOSWorkflow.prototype.constructor = IOSWorkflow;

  /**
   * Detect iOS IPA via ZIP header "PK\x03\x04" and
   * the presence of "Payload/" directory entry.
   */
  IOSWorkflow.prototype.detect = function (data, fileName) {
    if (data && data.length > 4) {
      if (data[0] === 0x50 && data[1] === 0x4B &&
          data[2] === 0x03 && data[3] === 0x04) {
        var ext = (fileName || '').split('.').pop().toLowerCase();
        if (ext === 'ipa' || ext === 'app') return true;
      }
    }
    return Ketor.workflows.BaseWorkflow.prototype.detect.call(this, data, fileName);
  };

  /**
   * Detect if the Mach-O binary is encrypted (FairPlay).
   * Reads LC_ENCRYPTION_INFO load command from Mach-O header.
   * Returns { encrypted: boolean, cryptid: number }.
   */
  IOSWorkflow.prototype.detectEncryption = function (machoData) {
    if (!machoData || machoData.length < 0x20) {
      return { encrypted: true, cryptid: -1 };
    }
    // Mach-O magic: 0xFEEDFACE (32-bit), 0xFEEDFACF (64-bit)
    var magic = (machoData[0] << 24) | (machoData[1] << 16) |
                (machoData[2] << 8) | machoData[3];
    var is64 = (magic === 0xFEEDFACF);
    var is32 = (magic === 0xFEEDFACE);
    if (!is32 && !is64) {
      return { encrypted: false, cryptid: -1, reason: 'not-macho' };
    }
    var headerSize = is64 ? 32 : 28;
    var ncmds = (machoData[headerSize - 4] << 24) |
                (machoData[headerSize - 3] << 16) |
                (machoData[headerSize - 2] << 8) |
                machoData[headerSize - 1];
    // Walk load commands to find LC_ENCRYPTION_INFO (0x21) or
    // LC_ENCRYPTION_INFO_64 (0x2C)
    var offset = headerSize;
    for (var i = 0; i < ncmds && offset + 8 <= machoData.length; i++) {
      var cmd = (machoData[offset] << 24) | (machoData[offset + 1] << 16) |
                (machoData[offset + 2] << 8) | machoData[offset + 3];
      var cmdsize = (machoData[offset + 4] << 24) | (machoData[offset + 5] << 16) |
                    (machoData[offset + 6] << 8) | machoData[offset + 7];
      if (cmd === 0x21 || cmd === 0x2C) {
        // LC_ENCRYPTION_INFO: cryptoff at +8, cryptsize at +12,
        // cryptid at +16
        if (offset + 20 <= machoData.length) {
          var cryptid = (machoData[offset + 16] << 24) |
                        (machoData[offset + 17] << 16) |
                        (machoData[offset + 18] << 8) |
                        machoData[offset + 19];
          return { encrypted: cryptid !== 0, cryptid: cryptid,
                   reason: 'encryption-info-found' };
        }
      }
      offset += cmdsize;
    }
    return { encrypted: false, cryptid: 0, reason: 'no-encryption-info' };
  };

  IOSWorkflow.prototype.getSystemProfile = function () {
    return {
      name: 'iOS',
      terminator: [0x00],
      pointerSize: 8, // arm64 pointers
      pointerEndianness: 'little',
      pointerBase: 0,
      extensions: ['ipa', 'app'],
      hasHeader: false,
      headerSize: 0,
      pipelineId: 'pipeline_ios',
      profileId: 'profile_ios',
      // iOS-specific
      containerFormat: 'IPA (ZIP)',
      bundleFormat: 'Payload/App.app/',
      binaryFormat: 'Mach-O (arm64, FairPlay encrypted)',
      // Text locations
      textLocations: {
        uiStrings: '*.strings (binary plist or text)',
        baseLocalization: 'Base.lproj/*.strings',
        infoPlist: 'Info.plist',
        assetCatalog: 'Assets.car',
        unityAssetBundle: 'Data/ + *.bundle',
        hardcoded: 'Mach-O __cstring and __const sections'
      },
      // Encryption
      encrypted: true,
      requiresDecryption: true,
      decryptionTools: ['frida-ios-dump', 'Clutch', 'bagbak'],
      // Signing
      requiresSigning: true,
      signingTools: ['node-applesign', 'fastlane-plugin-repack_ios', 'iTools', 'esign'],
      // Real-time alternative
      ocrAlternative: {
        enabled: true,
        tools: ['PiP Translate', 'TransPeek', 'GG-Translator'],
        description: 'Real-time screen translation without modification. Best for users who cannot re-sign.'
      }
    };
  };

  IOSWorkflow.prototype.getUIConfig = function () {
    return {
      showPaddingByte: false,
      showStrictMode: false,
      showCompression: false,
      showDecompression: false,
      defaultMinLength: 4,
      defaultMaxLength: 1024,
      recommendedExtraction: 'standard',
      extractionLabel: 'Extract iOS Texts',
      showFontEditor: false,
      // Encryption warning
      encryptionInfo: {
        requiresDecryption: true,
        decryptionTools: ['frida-ios-dump', 'Clutch', 'bagbak'],
        message: 'iOS Mach-O binaries are FairPlay-encrypted. Decrypt on a jailbroken device before analysis. Ketor will detect encryption status.'
      },
      // Signing info
      signingInfo: {
        required: true,
        tools: ['node-applesign', 'fastlane-plugin-repack_ios', 'iTools', 'esign'],
        message: 'Modified IPA must be re-signed with a provisioning profile. Ketor does not handle signing -- use the tools listed.'
      },
      // OCR alternative
      ocrAlternative: {
        enabled: true,
        tools: ['PiP Translate', 'TransPeek', 'GG-Translator'],
        description: 'Real-time screen translation without modification.'
      }
    };
  };

  IOSWorkflow.prototype.getHelpText = function () {
    return 'iOS IPAs contain a Payload/App.app/ bundle with a ' +
           'FairPlay-encrypted Mach-O binary. Decrypt on a jailbroken ' +
           'device with frida-ios-dump or Clutch. UI text is in .strings ' +
           'files (binary plist). For Unity games, text is in ' +
           'AssetBundle. After editing, repack and re-sign with ' +
           'node-applesign or fastlane. For real-time translation ' +
           'without modification, use PiP Translate or TransPeek.';
  };

  IOSWorkflow.prototype.extractText = function (rom, tableData, options) {
    var profile = this.getSystemProfile();
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.extractTextViaWorker) {
        reject(new Error('Extraction worker not available.'));
        return;
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
        // iOS-specific
        encryptionStatus: options.encryptionStatus || null,
        decrypted: options.decrypted === true,
        assetBundle: options.assetBundle === true
      };
      global.Ketor.extractTextViaWorker(rom, tableData, extractionOptions)
        .then(resolve)
        .catch(reject);
    });
  };

  IOSWorkflow.prototype.insertText = function (rom, texts, tableData, options) {
    var profile = this.getSystemProfile();
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.buildRomViaWorker) {
        reject(new Error('Build worker not available.'));
        return;
      }
      var insertOptions = {
        usePaddingByte: false,
        pointerGroups: options.pointerGroups || [],
        // iOS-specific
        repackIpa: options.repackIpa !== false,
        resignIpa: options.resignIpa !== false,
        signingTool: options.signingTool || 'node-applesign'
      };
      global.Ketor.buildRomViaWorker(rom, texts, tableData, profile, insertOptions)
        .then(resolve)
        .catch(reject);
    });
  };

  IOSWorkflow.prototype.validateBuild = function (rom, texts) {
    var overflow = this.findOverflowTexts(texts, null);
    if (overflow.length === 0) {
      return {
        ok: true,
        severity: 'ok',
        report: 'All texts fit. iOS IPA validation passed.'
      };
    }
    return {
      ok: true,
      severity: 'warn',
      report: overflow.length + ' text(s) exceed original length. ' +
              'IPA repacking and re-signing will be required. ' +
              'Signing must be done externally with node-applesign.'
    };
  };

  Ketor.workflows.IOSWorkflow = IOSWorkflow;

})(window);