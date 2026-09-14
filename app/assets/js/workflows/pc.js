/* ============================================================
   Ketor -- PC (Modern Games) Workflow
   ------------------------------------------------------------
   PC games (.exe & modern engines)
   - No single "ROM" format; engine detection is key
   - Common engines:
     - Unity: UnityPlayer.dll, GameAssembly.dll (IL2CPP),
       _Data/Managed (Mono), _Data/il2cpp_data (IL2CPP)
     - Unreal: *.uproject, Engine/, Content/, *.pak
     - Ren'Py: *.rpy, *.rpyc, *.rpa, renpy/
     - RPG Maker: Game.rgss3a (VX Ace), data/*.rvdata2,
       www/ (MV/MZ), *.rgss3a
     - Godot: project.godot, *.pck, *.tscn, *.gd
     - GameMaker: *.yy, *.win, data.win
     - Wolf RPG: Data.wolf, *.wolf
     - KiriKiri: *.xp3, data.xp3
     - NScripter: *.nscript.dat, *.nsa
     - TyranoScript: *.tyrano, data/
   - Text locations vary per engine:
     - Unity: StringTable, resources.assets, global-metadata.dat
     - Unreal: *.pak, *.uasset, *.locres
     - Ren'Py: *.rpy, *.rpyc
     - RPG Maker: data/*.json, *.rvdata2
   - Tools:
     - GameStringer (multi-engine, auto-detect)
     - XUnity.AutoTranslator (Unity)
     - RenpyThief (Ren'Py, RPG Maker)
     - LunaTranslator (hook + OCR)
     - Translator++ (visual novel engines)
     - MTool (RPG Maker, Ren'Py)
     - MORT (OCR real-time)
   - Translation approaches:
     1. File patching (best quality, permanent)
     2. Runtime injection (DLL hook, may trigger anti-cheat)
     3. Screen OCR (real-time, no modification)
   - Anti-cheat warning: EAC, BattlEye, etc. block injection.
     Only use on single-player offline games.
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  function PCWorkflow() {
    Ketor.workflows.BaseWorkflow.call(this);
    this.name = 'PC';
    this.extensions = ['exe', 'dll', 'pak', 'rpy', 'rpyc', 'rpa',
                       'uproject', 'pck', 'win', 'xp3', 'rgss3a',
                       'wolf', 'dat', 'assets', 'bundle'];
  }

  PCWorkflow.prototype = Object.create(Ketor.workflows.BaseWorkflow.prototype);
  PCWorkflow.prototype.constructor = PCWorkflow;

  /**
   * Engine detection rules.
   * Order matters: check most specific first.
   * Each rule has: engine name, primary signals, secondary signals,
   * and detection function.
   */
  PCWorkflow.prototype.engineRules = [
    {
      engine: 'Ren\'Py',
      primary: ['*.rpy', '*.rpyc', '*.rpa'],
      secondary: ['renpy/', 'game/', '*.rpyb'],
      detect: function (files) {
        return files.some(function (f) {
          return /\.rpyc?$/i.test(f) || /\.rpa$/i.test(f);
        }) || files.some(function (f) {
          return /^renpy[\/\\]/i.test(f);
        });
      },
      extractMethod: 'rpa-archive',
      tools: ['RenpyThief', 'Translator++', 'MTool', 'RenPyLens']
    },
    {
      engine: 'RPG Maker (VX Ace)',
      primary: ['Game.rgss3a'],
      secondary: ['Data/', '*.rvdata2', 'RGSS301.dll'],
      detect: function (files) {
        return files.some(function (f) {
          return /rgss3a$/i.test(f) || /\.rvdata2$/i.test(f);
        });
      },
      extractMethod: 'rgss-archive',
      tools: ['Translator++', 'MTool', 'DazedTL']
    },
    {
      engine: 'RPG Maker (MV/MZ)',
      primary: ['www/', 'js/'],
      secondary: ['package.json', '*.json', 'nw.dll'],
      detect: function (files) {
        return files.some(function (f) {
          return /^www[\/\\]/i.test(f) || /^js[\/\\]/i.test(f);
        }) && files.some(function (f) {
          return /package\.json$/i.test(f);
        });
      },
      extractMethod: 'json-files',
      tools: ['Translator++', 'MTool', 'DazedTL']
    },
    {
      engine: 'Unity (IL2CPP)',
      primary: ['GameAssembly.dll', 'global-metadata.dat'],
      secondary: ['UnityPlayer.dll', '_Data/il2cpp_data/'],
      detect: function (files) {
        return files.some(function (f) {
          return /GameAssembly\.dll$/i.test(f);
        }) || files.some(function (f) {
          return /global-metadata\.dat$/i.test(f);
        });
      },
      extractMethod: 'il2cpp-metadata',
      tools: ['XUnity.AutoTranslator', 'GameStringer', 'UABEA']
    },
    {
      engine: 'Unity (Mono)',
      primary: ['UnityPlayer.dll', '_Data/Managed/'],
      secondary: ['UnityCrashHandler64.exe', '*.assets'],
      detect: function (files) {
        return files.some(function (f) {
          return /UnityPlayer\.dll$/i.test(f);
        }) || files.some(function (f) {
          return /_Data[\/\\]Managed[\/\\]/i.test(f);
        });
      },
      extractMethod: 'mono-managed',
      tools: ['XUnity.AutoTranslator', 'GameStringer', 'UABEA']
    },
    {
      engine: 'Unreal Engine',
      primary: ['*.uproject', 'Engine/'],
      secondary: ['Content/', '*.pak', '*.uasset', '*.locres'],
      detect: function (files) {
        return files.some(function (f) {
          return /\.uproject$/i.test(f) || /^Engine[\/\\]/i.test(f);
        }) || files.some(function (f) {
          return /\.pak$/i.test(f);
        });
      },
      extractMethod: 'pak-archive',
      tools: ['GameStringer', 'UEExtractor', 'FModel']
    },
    {
      engine: 'Godot',
      primary: ['project.godot', '*.pck'],
      secondary: ['*.tscn', '*.gd', '*.gdshader'],
      detect: function (files) {
        return files.some(function (f) {
          return /project\.godot$/i.test(f) || /\.pck$/i.test(f);
        });
      },
      extractMethod: 'pck-archive',
      tools: ['GameStringer', 'GodotPCKExplorer', 'GDRE Tools']
    },
    {
      engine: 'KiriKiri',
      primary: ['*.xp3', 'data.xp3'],
      secondary: ['*.ks', '*.tjs'],
      detect: function (files) {
        return files.some(function (f) {
          return /\.xp3$/i.test(f);
        });
      },
      extractMethod: 'xp3-archive',
      tools: ['LunaTranslator', 'Translator++', 'GARbro']
    },
    {
      engine: 'NScripter',
      primary: ['*.nscript.dat', '*.nsa'],
      secondary: ['*.nscript'],
      detect: function (files) {
        return files.some(function (f) {
          return /\.nscript/i.test(f) || /\.nsa$/i.test(f);
        });
      },
      extractMethod: 'nscript',
      tools: ['LunaTranslator', 'Translator++']
    },
    {
      engine: 'GameMaker',
      primary: ['data.win', '*.win'],
      secondary: ['*.yy', '*.yyp'],
      detect: function (files) {
        return files.some(function (f) {
          return /data\.win$/i.test(f) || /\.win$/i.test(f);
        });
      },
      extractMethod: 'win-data',
      tools: ['UndertaleModTool', 'GameStringer']
    },
    {
      engine: 'Wolf RPG',
      primary: ['Data.wolf', '*.wolf'],
      secondary: ['*.wolf'],
      detect: function (files) {
        return files.some(function (f) {
          return /\.wolf$/i.test(f);
        });
      },
      extractMethod: 'wolf-archive',
      tools: ['Translator++', 'DazedTL']
    }
  ];

  /**
   * Detect PC game by analyzing a list of file names.
   * @param {string[]} fileList - Array of file paths/names
   * @returns {{engine: string, confidence: number, rule: Object}|null}
   */
  PCWorkflow.prototype.detectEngineFromFiles = function (fileList) {
    if (!fileList || fileList.length === 0) return null;

    for (var i = 0; i < this.engineRules.length; i++) {
      var rule = this.engineRules[i];
      try {
        if (rule.detect(fileList)) {
          return {
            engine: rule.engine,
            confidence: 0.9,
            rule: rule,
            extractMethod: rule.extractMethod,
            tools: rule.tools
          };
        }
      } catch (e) {
        // Skip rule on error
      }
    }
    return null;
  };

  /**
   * Main detect: uses extension as fallback.
   */
  PCWorkflow.prototype.detect = function (data, fileName) {
    var ext = (fileName || '').split('.').pop().toLowerCase();
    if (this.extensions.indexOf(ext) !== -1) return true;
    return false;
  };

  PCWorkflow.prototype.getSystemProfile = function () {
    return {
      name: 'PC',
      terminator: [0x00],
      pointerSize: 4,
      pointerEndianness: 'little',
      pointerBase: 0,
      extensions: ['exe', 'dll', 'pak', 'rpy', 'rpyc', 'rpa',
                   'uproject', 'pck', 'win', 'xp3', 'rgss3a',
                   'wolf', 'dat', 'assets', 'bundle'],
      hasHeader: false,
      headerSize: 0,
      pipelineId: 'pipeline_pc',
      profileId: 'profile_pc',
      // PC-specific
      engineDetected: null,
      supportsEngineDetection: true,
      supportsFilePatching: true,
      supportsRuntimeInjection: true,
      supportsOcrFallback: true,
      // Anti-cheat warning
      antiCheatWarning: 'Runtime injection (DLL hook) may trigger anti-cheat systems. Only use on single-player offline games.',
      // Supported engines (for UI listing)
      supportedEngines: this.engineRules.map(function (r) { return r.engine; })
    };
  };

  PCWorkflow.prototype.getUIConfig = function () {
    return {
      showPaddingByte: false,
      showStrictMode: false,
      showCompression: false,
      showDecompression: false,
      defaultMinLength: 4,
      defaultMaxLength: 1024,
      recommendedExtraction: 'engine-aware',
      extractionLabel: 'Detect Engine & Extract',
      showFontEditor: false, // PC games rarely need font editing
      // Engine detection UI
      engineDetection: {
        enabled: true,
        autoDetect: true,
        supportedEngines: this.engineRules.map(function (r) { return r.engine; }),
        // Translation approaches
        approaches: [
          { id: 'file-patch', label: 'File Patching (Permanent)', description: 'Best quality. Modifies game files directly.' },
          { id: 'runtime-inject', label: 'Runtime Injection (DLL Hook)', description: 'No file changes, but may trigger anti-cheat.' },
          { id: 'screen-ocr', label: 'Screen OCR (Real-time)', description: 'No modification. Overlay translation while playing.' }
        ]
      },
      // Anti-cheat warning
      antiCheatWarning: {
        enabled: true,
        message: 'Runtime injection (DLL hook) may trigger anti-cheat systems (EAC, BattlEye). Only use on single-player offline games.'
      }
    };
  };

  PCWorkflow.prototype.getHelpText = function () {
    return 'PC games use many different engines. Ketor will auto-detect ' +
           'the engine by scanning the game folder for signature files ' +
           '(UnityPlayer.dll, *.uproject, *.rpyc, Game.rgss3a, etc.). ' +
           'Choose a translation approach: file patching (permanent), ' +
           'runtime injection (DLL hook), or screen OCR (real-time). ' +
           'Only use runtime injection on single-player offline games.';
  };

  /**
   * PC extraction delegates to engine-specific parsers.
   * The actual extraction is handled by the extraction worker,
   * which receives the detected engine and the game folder.
   */
  PCWorkflow.prototype.extractText = function (rom, tableData, options) {
    var profile = this.getSystemProfile();
    var self = this;
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.extractTextViaWorker) {
        reject(new Error('Extraction worker not available.'));
        return;
      }
      // Engine detection from file list if provided
      var engineInfo = null;
      if (options.fileList && options.fileList.length > 0) {
        engineInfo = self.detectEngineFromFiles(options.fileList);
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
        enableTextDecompression: true,
        decompressionMode: 'auto',
        includeCompressedReadOnly: false,
        // PC-specific
        detectedEngine: engineInfo ? engineInfo.engine : null,
        engineRule: engineInfo ? engineInfo.rule : null,
        extractMethod: engineInfo ? engineInfo.extractMethod : null,
        translationApproach: options.translationApproach || 'file-patch'
      };
      global.Ketor.extractTextViaWorker(rom, tableData, extractionOptions)
        .then(resolve)
        .catch(reject);
    });
  };

  PCWorkflow.prototype.insertText = function (rom, texts, tableData, options) {
    var profile = this.getSystemProfile();
    return new Promise(function (resolve, reject) {
      if (!global.Ketor || !global.Ketor.buildRomViaWorker) {
        reject(new Error('Build worker not available.'));
        return;
      }
      var insertOptions = {
        usePaddingByte: false,
        pointerGroups: options.pointerGroups || [],
        // PC-specific
        detectedEngine: options.detectedEngine || null,
        translationApproach: options.translationApproach || 'file-patch',
        antiCheatSafe: options.antiCheatSafe !== false
      };
      global.Ketor.buildRomViaWorker(rom, texts, tableData, profile, insertOptions)
        .then(resolve)
        .catch(reject);
    });
  };

  PCWorkflow.prototype.validateBuild = function (rom, texts) {
    var overflow = this.findOverflowTexts(texts, null);
    if (overflow.length === 0) {
      return {
        ok: true,
        severity: 'ok',
        report: 'All texts fit. PC engine-specific validation passed.'
      };
    }
    return {
      ok: true,
      severity: 'warn',
      report: overflow.length + ' text(s) exceed original length. ' +
              'For PC games, repacking the engine-specific archive ' +
              'will be required.'
    };
  };

  Ketor.workflows.PCWorkflow = PCWorkflow;

})(window);