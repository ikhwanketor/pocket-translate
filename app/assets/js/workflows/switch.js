/* ============================================================
   Ketor -- Nintendo Switch Workflow
   ------------------------------------------------------------
   Nintendo Switch (NX)
   - CPU: ARM Cortex-A57 (quad-core) + Cortex-A53
   - RAM: 4 GB
   - ROM: XCI (cartridge), NSP (eShop), NCA (content archive)
   - Encryption: NCAs are fully encrypted (AES-XTS).
     - NCA header is 0x400 bytes at offset 0
     - Section header at 0x4 (within Section Header Block)
       indicates crypto type: 1 = none (plaintext),
       2 = other crypto, 3 = regular crypto, 4 = unknown
   - File system: RomFS + ExeFS (inside NCA, inside PFS0)
   - Text format: MSBT (magic "MsgStdBn")
     - Blocks: LBL1 (labels), TXT2 (text), ATR1 (attributes),
       TSY1 (style info)
     - Control tags: start with 0xE, end with 0xF (6 bytes)
     - Text encoding: UTF-16LE (typical), UTF-8 possible
   - MSBT often packaged in SZS (zlib-compressed SARC) or SARC
   - Font: BFFNT (binary Nintendo font), or system font
   - Testing: LayeredFS (Atmosphere), Yuzu/Ryujinx emulator
   - Rebuild: hactool + makerom (or LayeredFS overlay)
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  function SwitchWorkflow() {
    Ketor.workflows.BaseWorkflow.call(this);
    this.name = 'Nintendo Switch';
    this.extensions = ['xci', 'nsp', 'nca', 'nro', 'nso'];
  }

  SwitchWorkflow.prototype = Object.create(Ketor.workflows.BaseWorkflow.prototype);
  SwitchWorkflow.prototype.constructor = SwitchWorkflow;

  /**
   * Detect Switch via NCA magic "NCA3" at offset 0x200,
   * or XCI/NSP structure signatures.
   */
  SwitchWorkflow.prototype.detect = function (data, fileName) {
    if (data && data.length > 0x210) {
      // NCA magic at 0x200
      var ncaMagic = 'NCA3';
      var matchNca = true;
      for (var i = 0; i < 4; i++) {
        if (data[0x200 + i] !== ncaMagic.charCodeAt(i)) { matchNca = false; break; }
      }
      if (matchNca) return true;
    }
    if (data && data.length > 0x10) {
      // XCI/NSP PFS0 magic at offset 0
      var pfs0 = 'PFS0';
      var matchPfs = true;
      for (var j = 0; j < 4; j++) {
        if (data[j] !== pfs0.charCodeAt(j)) { matchPfs = false; break; }
      }
      if (matchPfs) return true;
    }
    return Ketor.workflows.BaseWorkflow.prototype.detect.call(this, data, fileName);
  };

  /**
   * Detect whether an NCA is encrypted by reading the crypto type
   * byte at section header block offset +0x400+(sectionid*0x200)+0x4.
   * Crypto type: 1 = none (plaintext), 2 = other, 3 = regular, 4 = unknown.
   */
  SwitchWorkflow.prototype.detectEncryption = function (data) {
    if (!data || data.length < 0x600) return { encrypted: true, cryptoType: -1 };

    // Read NCA header magic at 0x200
    var ncaMagic = 'NCA3';
    var isNca = true;
    for (var i = 0; i < 4; i++) {
      if (data[0x200 + i] !== ncaMagic.charCodeAt(i)) { isNca = false; break; }
    }
    if (!isNca) {
      // Check XCI/NSP PFS0 at offset 0
      if (data.length > 4 && data[0] === 0x50 && data[1] === 0x46 &&
          data[2] === 0x53 && data[3] === 0x30) {
        // PFS0 container -- read first NCA inside
        // The first NCA starts after PFS0 header + string table + file entries
        // This is approximate; full parsing requires PFS0 header analysis
        return { encrypted: true, cryptoType: -1, container: 'PFS0' };
      }
      return { encrypted: true, cryptoType: -1, container: 'unknown' };
    }

    // Read crypto type from first section header block
    // Section header block is at 0x400 + (sectionid * 0x200) + 0x4
    var sectionId = 0;
    var sectionHeaderOffset = 0x400 + (sectionId * 0x200);
    if (sectionHeaderOffset + 0x10 > data.length) {
      return { encrypted: true, cryptoType: -1 };
    }
    var cryptoType = data[sectionHeaderOffset + 0x4];
    var encrypted = cryptoType === 2 || cryptoType === 3 || cryptoType === 4;
    return {
      encrypted: encrypted,
      cryptoType: cryptoType,
      cryptoLabel: cryptoType === 1 ? 'plaintext' :
                   cryptoType === 2 ? 'other-crypto' :
                   cryptoType === 3 ? 'regular-crypto' : 'unknown'
    };
  };

  SwitchWorkflow.prototype.getSystemProfile = function () {
    return {
      name: 'Nintendo Switch',
      terminator: [0x00],
      pointerSize: 4,
      pointerEndianness: 'little',
      pointerBase: 0x00000000, // Switch uses virtual address + file offset
      extensions: ['xci', 'nsp', 'nca', 'nro', 'nso'],
      hasHeader: true,
      headerSize: 0x400, // NCA header
      pipelineId: 'pipeline_switch',
      profileId: 'profile_switch',
      pointerTransforms: ['raw', 'base+', 'base-'],
      cpuArch: 'arm64',
      // Encryption info
      encrypted: true,
      requiresDecryption: true,
      // MSBT format support
      supportsMsbt: true,
      msbtMagic: 'MsgStdBn',
      msbtBlocks: ['LBL1', 'TXT2', 'ATR1', 'TSY1'],
      msbtEncoding: 'utf-16le',
      // Archive support
      supportsSzs: true,   // zlib-compressed SARC
      supportsSarc: true,  // SARC archive
      supportsPfs0: true,  // PFS0 archive
      // Font format
      fontFormat: 'bffnt-or-system',
      // Testing methods
      testMethods: ['layeredfs', 'yuzu', 'ryujinx'],
      // Key files required for decryption
      keyFiles: ['prod.keys', 'title.keys']
    };
  };

  SwitchWorkflow.prototype.getUIConfig = function () {
    return {
      showPaddingByte: false,
      showStrictMode: false,
      showCompression: false,
      showDecompression: false,
      defaultMinLength: 4,
      defaultMaxLength: 2048,
      recommendedExtraction: 'standard',
      extractionLabel: 'Extract Switch Texts',
      showFontEditor: true,
      fontInfo: {
        bpp: 4,
        tileWidth: 8,
        tileHeight: 8,
        bytesPerTile: 32,
        chrLocation: 'bffnt-texture',
        textureBased: true,
        format: 'BFFNT'
      },
      // Encryption UI
      encryptionInfo: {
        supportsEncryptionDetection: true,
        requiresKeys: true,
        keyFiles: ['prod.keys', 'title.keys'],
        message: 'If the ROM is encrypted, provide prod.keys and title.keys for decryption. If already decrypted, no keys are needed.'
      },
      // MSBT info
      textFormatInfo: {
        format: 'MSBT',
        blocks: ['LBL1 (labels)', 'TXT2 (text)', 'ATR1 (attributes)', 'TSY1 (style)'],
        encoding: 'UTF-16LE',
        controlTags: 'Start with 0xE, end with 0xF (6 bytes)',
        packaging: 'MSBT files are packaged in SZS (zlib SARC) or SARC archives'
      },
      // LayeredFS info
      layeredFSInfo: {
        path: 'atmosphere/contents/{title_id}/romfs/',
        description: 'Place translated romFS files in the LayeredFS directory for automatic loading.'
      }
    };
  };

  SwitchWorkflow.prototype.getHelpText = function () {
    return 'Nintendo Switch ROMs are encrypted NCA files inside XCI/NSP ' +
           'containers. If the ROM is encrypted, provide prod.keys and ' +
           'title.keys for decryption. If already decrypted, the app will ' +
           'detect it and skip decryption. Text is stored in MSBT format ' +
           '(UTF-16LE) inside SZS/SARC archives within romFS. Edit MSBT ' +
           'files, repack, and install via LayeredFS at ' +
           'atmosphere/contents/{title_id}/romfs/. Test with Yuzu or Ryujinx.';
  };

  SwitchWorkflow.prototype.extractText = function (rom, tableData, options) {
    var profile = this.getSystemProfile();
    var encryptionStatus = this.detectEncryption(rom);

    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.extractTextViaWorker) {
        reject(new Error('Extraction worker not available.'));
        return;
      }

      // If encrypted, the extraction worker needs keys
      var needsDecryption = encryptionStatus.encrypted;
      var extractionOptions = {
        minLength: options.minLength || 4,
        maxLength: options.maxLength || 2048,
        asciiFallback: options.asciiFallback !== false,
        strictExtractorMode: false,
        system: profile,
        systemPipeline: profile.pipelineId,
        usePaddingByte: false,
        enableDteMteCompression: false,
        compressionStrategy: options.compressionStrategy || 'optimal',
        enableTextDecompression: true,
        decompressionMode: options.decompressionMode || 'auto',
        includeCompressedReadOnly: false,
        // Switch-specific
        encryptionStatus: encryptionStatus,
        needsDecryption: needsDecryption,
        prodKeys: options.prodKeys || null,
        titleKeys: options.titleKeys || null,
        msbtEncoding: 'utf-16le',
        supportedBlocks: ['LBL1', 'TXT2', 'ATR1', 'TSY1']
      };

      global.Ketor.extractTextViaWorker(rom, tableData, extractionOptions)
        .then(resolve)
        .catch(reject);
    });
  };

  SwitchWorkflow.prototype.insertText = function (rom, texts, tableData, options) {
    var profile = this.getSystemProfile();
    var encryptionStatus = this.detectEncryption(rom);

    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.buildRomViaWorker) {
        reject(new Error('Build worker not available.'));
        return;
      }
      var insertOptions = {
        usePaddingByte: false,
        pointerGroups: options.pointerGroups || [],
        // Switch-specific
        encryptionStatus: encryptionStatus,
        needsEncryption: encryptionStatus.encrypted,
        prodKeys: options.prodKeys || null,
        titleKeys: options.titleKeys || null,
        msbtEncoding: 'utf-16le',
        rebuildMode: options.rebuildMode || 'layeredfs'
      };
      global.Ketor.buildRomViaWorker(rom, texts, tableData, profile, insertOptions)
        .then(resolve)
        .catch(reject);
    });
  };

  SwitchWorkflow.prototype.validateBuild = function (rom, texts) {
    var overflow = this.findOverflowTexts(texts, null);
    var encryptionStatus = this.detectEncryption(rom);

    if (overflow.length === 0) {
      return {
        ok: true,
        severity: 'ok',
        report: 'All texts fit. Switch MSBT validation passed. ' +
                'Encryption status: ' + encryptionStatus.cryptoLabel + '.'
      };
    }
    return {
      ok: true,
      severity: 'warn',
      report: overflow.length + ' text(s) exceed original length. ' +
              'MSBT repacking will be applied. ' +
              'For LayeredFS testing, place files in ' +
              'atmosphere/contents/{title_id}/romfs/'
    };
  };

  Ketor.workflows.SwitchWorkflow = SwitchWorkflow;

})(window);