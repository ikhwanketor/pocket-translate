/* ============================================================
   Ketor -- Workbench (main shell)
   ------------------------------------------------------------
   Integrates all parts into a single VS Code-style shell:
   Titlebar → ActivityBar + Sidebar + EditorColumn → StatusBar
   EditorColumn contains EditorArea (split groups) + Panel.

   Extension points:
   - Ketor.ui.registerSidebarProvider(activityId, Component)
   - Ketor.ui.registerTabProvider(kind, Component)

   Batch 13 will register providers to wire in real features
   (extract, translate, hex editor, font editor, patch, tests).
   ============================================================ */

/* ============================================================
   Ketor -- Workbench (v2)
   ------------------------------------------------------------
   Changes from v1:
   - Welcome-first: no auto-opened tab on fresh start
   - Sidebar width driven by --kt-sidebar-width CSS var on root
   - Panel resize propagates via CSS var --kt-panel-height
   - Tab drag & drop wired
   - ROM load triggers markDirty()
   ============================================================ */

/* ============================================================
   Ketor -- Workbench (v3)
   ------------------------------------------------------------
   Fixes:
   - handleActivityClick now opens tab in editor (bug fix)
   - Sidebar backdrop rendered when mobile/tablet + drawer open
   - Root class switches between mobile-sidebar-open /
     tablet-sidebar-open per breakpoint
   - 5 themes in picker
   ============================================================ */

/* ============================================================
   Ketor - Workbench (v4)
   ------------------------------------------------------------
   Uses viewport.mode ('desktop' | 'compact') from context.
   - desktop: titlebar + vertical activity bar (left)
   - compact: no titlebar, horizontal activity bar (bottom),
              compact header with kebab menu, sidebar drawer
   ============================================================ */

/* ============================================================
   Ketor - Workbench (v5)
   ------------------------------------------------------------
   Single-file shell. Same structure as the version that worked
   before Batch 12g-2b, plus:
   - compact mode (mobile + tablet portrait)
   - kebab menu button + dropdown
   - horizontal activity bar in compact mode
   ============================================================ */

/* ============================================================
   Ketor - Workbench (v6)
   ------------------------------------------------------------
   Adds ROM load handler:
   - file input [data-ketor-role=rom] wired
   - chunked load via Ketor.core.loadRomFile
   - progress shown in status bar
   - on success: dispatch ketor:rom-loaded, open Translation
     tab, show sidebar + panel log
   ============================================================ */

/* ============================================================
   Ketor - Workbench (v7)
   ------------------------------------------------------------
   Single file. Full version with all placeholder details.
   Only additions vs the working v6:
   - CSV input handler
   - kind=activityId in tab so providers resolve per activity
   - translate store wiring after ROM load
   - input selectors via getElementById (avoids quote issues)
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.ui = Ketor.ui || {};
  var React = global.React;
  if (!React) return;
  var e = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var useCallback = React.useCallback;
  var useMemo = React.useMemo;

  var ACTIVITY_META = {
    translate: {
      icon: 'globe',
      title: 'Translation',
      placeholderTitle: 'Translation Workspace',
      placeholderHint: 'Extract text with a .tbl table, edit translations, auto-relocate overflow.'
    },
    hex: {
      icon: 'hex',
      title: 'Hex Editor',
      placeholderTitle: 'Hex Editor',
      placeholderHint: 'Byte inspector with sections, pointers, categories, and Monkey-Moore relative search.'
    },
    font: {
      icon: 'paintcan',
      title: 'Font & Graphics',
      placeholderTitle: 'Font & Graphics',
      placeholderHint: 'Detect and edit font tiles, palettes, and graphics across supported consoles.'
    },
    patch: {
      icon: 'package',
      title: 'Patch & Export',
      placeholderTitle: 'Patch & Export',
      placeholderHint: 'Generate IPS, export ROM, import/export project state.'
    },
    tests: {
      icon: 'beaker',
      title: 'Tests',
      placeholderTitle: 'Test Suite',
      placeholderHint: 'Unit tests and preview pipeline checks per workflow.'
    }
  };
  Ketor.ui.ACTIVITY_META = ACTIVITY_META;

  function TitleBar(props) {
    return e('header', { className: 'kt-titlebar' },
      e(Ketor.ui.KetorMenubar, {
        context: {
          activityBarVisible: props.activityBarVisible,
          statusBarVisible: props.statusBarVisible,
          sidebarVisible: props.sidebarVisible,
          panelVisible: props.panelVisible
        }
      }),
      e('div', { className: 'kt-titlebar-title' }, 'Ketor'),
      e('div', { className: 'kt-titlebar-actions' })
    );
  }

  function CompactHeader(props) {
    return e('div', { className: 'kt-compact-header' },
      e('div', { className: 'kt-compact-title' }, props.title || 'Ketor'),
      e('button', {
        ref: props.anchorRef,
        type: 'button',
        className: 'kt-compact-kebab' + (props.kebabOpen ? ' active' : ''),
        onClick: props.onKebabToggle,
        'aria-label': 'Menu',
        'aria-expanded': props.kebabOpen
      }, Ketor.ui.icon('kebab-vertical', { size: 18 })),
      e(Ketor.ui.KetorKebabMenu, {
        open: props.kebabOpen,
        onClose: props.onCloseKebab,
        anchorRef: props.anchorRef
      })
    );
  }

  function ActivityPlaceholder(props) {
    var meta = ACTIVITY_META[props.activity] || {};
    return e('div', { className: 'kt-activity-placeholder' },
      e('div', { className: 'ap-title' }, meta.placeholderTitle || meta.title || props.activity),
      e('div', { className: 'ap-hint' }, meta.placeholderHint || '')
    );
  }

  function SidebarWrapper(props) {
    var activity = props.activity;
    var Provider = Ketor.ui.getSidebarProvider(activity);
    var meta = ACTIVITY_META[activity] || {};

    var handleResizeStart = useCallback(function (ev) {
      if (typeof props.onResize !== 'function') return;
      ev.preventDefault();
      var handleEl = ev.currentTarget;
      handleEl.classList.add('dragging');
      var startX = ev.clientX;
      var startWidth = props.width;

      var onMove = function (moveEv) {
        var delta = moveEv.clientX - startX;
        props.onResize(Math.max(170, Math.min(600, startWidth + delta)));
      };
      var onUp = function () {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        try { handleEl.classList.remove('dragging'); } catch (_) { }
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }, [props.onResize, props.width]);

    var fallbackText = 'Controls for "' + (meta.title || activity) + '" will appear here.';

    return e('div', { className: 'kt-sidebar' },
      Provider
        ? e(Provider, { activity: activity })
        : e(Ketor.ui.KetorSidebar, { title: meta.title || activity },
            e('div', {
              className: 'kt-text-dim kt-text-small',
              style: { padding: '12px 16px', lineHeight: 1.6 }
            }, fallbackText)
          ),
      e('div', {
        className: 'kt-sidebar-resize-handle',
        onMouseDown: handleResizeStart
      })
    );
  }

  function EditorColumn(props) {
    var state = props.state;
    var actions = props.actions;
    return e('div', { className: 'kt-editor-column' },
      props.isCompact
        ? e(CompactHeader, {
            title: props.compactHeaderTitle,
            kebabOpen: props.kebabOpen,
            onKebabToggle: props.onKebabToggle,
            onCloseKebab: props.onCloseKebab,
            anchorRef: props.kebabAnchorRef
          })
        : null,
      e(Ketor.ui.KetorEditorArea, {
        groups: state.editorGroups,
        activeGroupId: state.activeEditorGroupId,
        renderTabContent: props.renderTabContent,
        onActivateTab: actions.setActiveTab,
        onCloseTab: actions.closeTab,
        onSplit: actions.splitEditor,
        onCloseGroup: actions.closeEditorGroup,
        onTabDrop: actions.moveTab,
        onWelcomeAction: props.onWelcomeAction
      }),
      state.panelVisible
        ? e(Ketor.ui.KetorPanel, {
            activeTab: state.panelActiveTab,
            onTabChange: actions.setPanelActiveTab,
            onClose: function () { actions.setPanelVisible(false); },
            onResize: actions.setPanelHeight,
            height: state.panelHeight,
            tasks: props.tasks,
            logs: props.logs,
            problems: props.problems
          })
        : null
    );
  }

  function ThemePickerModal(props) {
    if (!props.open) return null;
    var themes = [
      { id: 'dark-plus', label: 'Dark+ (VS Code default)' },
      { id: 'dark-modern', label: 'Dark Modern' },
      { id: 'dark-high-contrast', label: 'Dark High Contrast' },
      { id: 'light-plus', label: 'Light+ (VS Code default)' },
      { id: 'light-ketor', label: 'Light Ketor (warm)' }
    ];
    return e('div', {
      className: 'kt-modal-overlay',
      onClick: function (ev) {
        if (ev.target === ev.currentTarget) props.onClose();
      }
    },
      e('div', { className: 'kt-modal', style: { maxWidth: '460px' } },
        e('div', { className: 'kt-modal-header' },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            Ketor.ui.icon('symbol-color', { size: 16 }),
            e('strong', null, 'Color Theme')
          ),
          e('button', {
            type: 'button',
            className: 'icon-btn',
            onClick: props.onClose
          }, Ketor.ui.icon('close', { size: 14 }))
        ),
        e('div', { className: 'kt-modal-body' },
          e('div', { className: 'kt-theme-picker' },
            themes.map(function (th) {
              return e('label', { key: th.id },
                e('input', {
                  type: 'radio',
                  name: 'kt-theme',
                  checked: props.currentTheme === th.id,
                  onChange: function () { props.onChange(th.id); }
                }),
                e('span', { className: 'kt-theme-swatch ' + th.id }),
                e('span', null, th.label)
              );
            })
          )
        ),
        e('div', { className: 'kt-modal-footer' },
          e('button', {
            type: 'button',
            className: 'kt-btn secondary',
            onClick: props.onClose
          }, 'Done')
        )
      )
    );
  }

  function registerDefaultCommands(deps) {
    var actions = deps.actions;
    var setAboutOpen = deps.setAboutOpen;
    var setThemeOpen = deps.setThemeOpen;

    function logStub(label) {
      actions.appendLog('info', label + ' - pending next batch.', 'command');
    }

    Ketor.commands.registerCommand('ketor.file.loadRom', function () {
      var input = document.getElementById('kt-input-rom');
      if (input) input.click();
      else logStub('Load ROM');
    });
    Ketor.commands.registerCommand('ketor.file.loadTable', function () {
      var input = document.getElementById('kt-input-table');
      if (input) input.click();
      else logStub('Load Table');
    });
    Ketor.commands.registerCommand('ketor.file.importProject', function () { logStub('Import Project'); });
    Ketor.commands.registerCommand('ketor.file.exportProject', function () {
      actions.markClean();
      logStub('Export Project');
    });
    Ketor.commands.registerCommand('ketor.file.saveModifiedRom', function () {
      actions.markClean();
      logStub('Save Modified ROM');
    });
    Ketor.commands.registerCommand('ketor.file.exportIps', function () {
      actions.markClean();
      logStub('Export IPS');
    });

    Ketor.commands.registerCommand('ketor.edit.undo', function () { logStub('Undo'); });
    Ketor.commands.registerCommand('ketor.edit.redo', function () { logStub('Redo'); });
    Ketor.commands.registerCommand('ketor.edit.cut', function () { logStub('Cut'); });
    Ketor.commands.registerCommand('ketor.edit.copy', function () { logStub('Copy'); });
    Ketor.commands.registerCommand('ketor.edit.paste', function () { logStub('Paste'); });
    Ketor.commands.registerCommand('ketor.edit.find', function () { logStub('Find'); });

    Ketor.commands.registerCommand('ketor.view.toggleSidebar', function () { actions.toggleSidebar(); });
    Ketor.commands.registerCommand('ketor.view.togglePanel', function () { actions.togglePanel(); });
    Ketor.commands.registerCommand('ketor.view.toggleActivityBar', function () { actions.toggleActivityBar(); });
    Ketor.commands.registerCommand('ketor.view.toggleStatusBar', function () { actions.toggleStatusBar(); });
    Ketor.commands.registerCommand('ketor.view.splitEditor', function () { actions.splitEditor(); });
    Ketor.commands.registerCommand('ketor.view.appearance', function () { setThemeOpen(true); });
    Ketor.commands.registerCommand('ketor.view.theme', function () { setThemeOpen(true); });
    Ketor.commands.registerCommand('ketor.view.showTranslate', function () { actions.setActiveActivity('translate'); });
    Ketor.commands.registerCommand('ketor.view.showBackgroundTasks', function () {
      actions.setPanelVisible(true);
      actions.setPanelActiveTab('background');
    });

    Ketor.commands.registerCommand('ketor.about.show', function () { setAboutOpen(true); });

    Ketor.commands.registerCommand('ketor.help.welcome', function () { logStub('Welcome'); });
    Ketor.commands.registerCommand('ketor.help.documentation', function () {
      window.open('https://github.com/ikhwanketor/ketor', '_blank', 'noopener');
    });
    Ketor.commands.registerCommand('ketor.help.reportIssue', function () {
      window.open('https://github.com/ikhwanketor/ketor/issues', '_blank', 'noopener');
    });
    Ketor.commands.registerCommand('ketor.help.releaseNotes', function () { logStub('Release Notes'); });
    Ketor.commands.registerCommand('ketor.help.shortcuts', function () { logStub('Keyboard Shortcuts'); });
    Ketor.commands.registerCommand('ketor.help.community', function () { logStub('Community'); });
    Ketor.commands.registerCommand('ketor.help.repository', function () {
      window.open('https://github.com/ikhwanketor/ketor', '_blank', 'noopener');
    });

    Ketor.commands.registerCommand('ketor.settings.open', function () { logStub('Settings'); });
    Ketor.commands.registerCommand('ketor.settings.theme', function () { setThemeOpen(true); });
    Ketor.commands.registerCommand('ketor.settings.shortcuts', function () { logStub('Keyboard Shortcuts Settings'); });
    Ketor.commands.registerCommand('ketor.settings.advanced', function () { logStub('Advanced Options'); });
  }

  function WorkbenchShell() {
    var wb = Ketor.ui.useWorkbench();
    var state = wb.state;
    var actions = wb.actions;
    var tasks = wb.tasks;
    var logs = wb.logs;
    var problems = wb.problems;
    var vp = wb.viewport;
    var isCompact = vp.mode === 'compact';

    var aboutState = useState(false);
    var aboutOpen = aboutState[0];
    var setAboutOpen = aboutState[1];

    var themeState = useState(false);
    var themeOpen = themeState[0];
    var setThemeOpen = themeState[1];

    var romState = useState(null);
    var romInfo = romState[0];
    var setRomInfo = romState[1];

    var kebabState = useState(false);
    var kebabOpen = kebabState[0];
    var setKebabOpen = kebabState[1];

    var kebabAnchorRef = useRef(null);
    var actionsRef = useRef(actions);
    var groupsRef = useRef(state.editorGroups);

    useEffect(function () { actionsRef.current = actions; }, [actions]);
    useEffect(function () { groupsRef.current = state.editorGroups; }, [state.editorGroups]);

    useEffect(function () {
      registerDefaultCommands({
        actions: actions,
        setAboutOpen: setAboutOpen,
        setThemeOpen: setThemeOpen
      });
    }, []);

    // ---- ROM input handler ----
    useEffect(function () {
      var input = document.getElementById('kt-input-rom');
      if (!input) return;
      function onChange(ev) {
        var f = ev.target.files && ev.target.files[0];
        ev.target.value = '';
        if (!f) return;
        var A = actionsRef.current;
        A.appendLog('info', 'Reading ' + f.name + '...', 'rom-loader');
        Ketor.core.loadRomFile(f, {
          onProgress: function (p) {
            if (p < 1) A.appendLog('info', 'Loading ' + Math.round(p * 100) + '%', 'rom-loader');
          },
          onWarning: function (m) { A.appendLog('warn', m, 'rom-loader'); }
        }).then(function (res) {
          var sys = 'Unknown';
          try {
            if (Ketor.workflows && Ketor.workflows.detectWorkflow) {
              var wf = Ketor.workflows.detectWorkflow(res.data, res.name);
              if (wf) sys = wf.name || 'Unknown';
            }
          } catch (_) { }
          setRomInfo({ name: res.name, size: res.size, system: sys });
          A.markDirty();
          if (Ketor.translate && Ketor.translate.setRomFromLoad) {
            Ketor.translate.setRomFromLoad(res, sys);
          }
          window.dispatchEvent(new CustomEvent('ketor:rom-loaded', {
            detail: { name: res.name, size: res.size, system: sys }
          }));
          var gid = groupsRef.current[0] ? groupsRef.current[0].id : 'group-1';
          A.setActiveActivity('translate');
          A.openTab(gid, {
            id: 'activity:translate',
            kind: 'translate',
            title: 'Translation',
            icon: 'globe',
            payload: { activity: 'translate' }
          });
          A.setSidebarVisible(true);
          A.setPanelVisible(true);
          A.setPanelActiveTab('log');
          A.appendLog('success',
            'ROM loaded: ' + res.name + ' (' + Ketor.core.formatSize(res.size) + ', ' + sys + ')',
            'rom-loader');
        }).catch(function (err) {
          var m = err && err.message ? err.message : String(err);
          A.appendLog('error', 'ROM load failed: ' + m, 'rom-loader');
          A.setPanelVisible(true);
          A.setPanelActiveTab('log');
        });
      }
      input.addEventListener('change', onChange);
      return function () { input.removeEventListener('change', onChange); };
    }, []);

    // ---- Table input handler ----
    useEffect(function () {
      var input = document.getElementById('kt-input-table');
      if (!input) return;
      function onChange(ev) {
        var f = ev.target.files && ev.target.files[0];
        ev.target.value = '';
        if (!f) return;
        f.text().then(function (content) {
          if (Ketor.translate && Ketor.translate.loadTableContent) {
            Ketor.translate.loadTableContent(content, f.name);
          }
          actionsRef.current.appendLog('success', 'Table: ' + f.name, 'translate');
        }).catch(function (err) {
          actionsRef.current.appendLog('error', 'Table failed: ' + (err.message || ''), 'translate');
        });
      }
      input.addEventListener('change', onChange);
      return function () { input.removeEventListener('change', onChange); };
    }, []);

    // ---- CSV input handler ----
    useEffect(function () {
      var input = document.getElementById('kt-input-csv');
      if (!input) return;
      function onChange(ev) {
        var f = ev.target.files && ev.target.files[0];
        ev.target.value = '';
        if (!f) return;
        f.text().then(function (content) {
          if (Ketor.translate && Ketor.translate.importCsvContent) {
            Ketor.translate.importCsvContent(content);
          }
          actionsRef.current.appendLog('success', 'CSV: ' + f.name, 'translate');
        }).catch(function (err) {
          actionsRef.current.appendLog('error', 'CSV failed: ' + (err.message || ''), 'translate');
        });
      }
      input.addEventListener('change', onChange);
      return function () { input.removeEventListener('change', onChange); };
    }, []);

    useEffect(function () {
      if (!isCompact && kebabOpen) setKebabOpen(false);
    }, [isCompact, kebabOpen]);

    var handleActivityClick = useCallback(function (activityId) {
      actions.setActiveActivity(activityId);
      var meta = ACTIVITY_META[activityId] || {};
      var targetGroupId = state.editorGroups[0] ? state.editorGroups[0].id : 'group-1';
      actions.openTab(targetGroupId, {
        id: 'activity:' + activityId,
        kind: activityId,
        title: meta.title || activityId,
        icon: meta.icon || 'file',
        payload: { activity: activityId }
      });
    }, [actions, state.editorGroups]);

    var handleWelcomeAction = useCallback(function (actionId) {
      if (actionId === 'load-rom') Ketor.commands.executeCommand('ketor.file.loadRom');
      else if (actionId === 'open-project') Ketor.commands.executeCommand('ketor.file.importProject');
      else if (actionId === 'recent-files') actions.appendLog('info', 'Recent files: not implemented yet.', 'ketor');
    }, [actions]);

    var renderTabContent = useCallback(function (tab) {
      var Provider = Ketor.ui.getTabProvider(tab.kind);
      if (Provider) {
        return e(Provider, { tab: tab, payload: tab.payload || {}, workbench: wb });
      }
      if (ACTIVITY_META[tab.kind]) {
        return e(ActivityPlaceholder, { activity: tab.kind });
      }
      return e('div', { className: 'kt-activity-placeholder' },
        e('div', { className: 'ap-title' }, tab.title || 'Empty Tab'),
        e('div', { className: 'ap-hint' }, 'No provider registered for tab kind: ' + tab.kind)
      );
    }, [wb]);

    var rootClasses = ['kt-workbench'];
    if (!state.activityBarVisible) rootClasses.push('no-activitybar');
    if (!state.sidebarVisible) rootClasses.push('no-sidebar');
    if (!state.statusBarVisible) rootClasses.push('no-statusbar');
    rootClasses.push(isCompact ? 'mode-compact' : 'mode-desktop');
    rootClasses.push('orientation-' + vp.orientation);
    if (state.sidebarVisible && isCompact) rootClasses.push('drawer-open');

    var rootStyle = {
      '--kt-sidebar-width': state.sidebarVisible ? (state.sidebarWidth + 'px') : '0px'
    };

    var progress = useMemo(function () {
      var running = tasks.filter(function (t) { return t.status === 'running'; });
      if (running.length === 0) return null;
      var first = running[0];
      var suffix = running.length > 1 ? ' (+' + (running.length - 1) + ')' : '';
      return {
        active: true,
        value: first.progress || 0,
        label: first.label + suffix
      };
    }, [tasks]);

    var showBackdrop = isCompact && state.sidebarVisible;
    var compactHeaderTitle = 'Ketor';

    return e('div', {
      className: rootClasses.join(' '),
      style: rootStyle,
      'data-mode': vp.mode,
      'data-orientation': vp.orientation,
      'data-breakpoint': vp.breakpoint
    },
      !isCompact
        ? e(TitleBar, {
            activityBarVisible: state.activityBarVisible,
            sidebarVisible: state.sidebarVisible,
            statusBarVisible: state.statusBarVisible,
            panelVisible: state.panelVisible
          })
        : null,

      state.activityBarVisible
        ? e(Ketor.ui.KetorActivityBar, {
            items: Ketor.ui.DEFAULT_ACTIVITY_ITEMS,
            activeId: state.activeActivity,
            onActivate: handleActivityClick,
            bottomItems: Ketor.ui.DEFAULT_ACTIVITY_BOTTOM,
            onBottomActivate: function (id) {
              if (id === 'settings') {
                actions.setPanelVisible(true);
                actions.setPanelActiveTab('log');
              } else if (id === 'account') {
                setAboutOpen(true);
              }
            },
            orientation: isCompact ? 'horizontal' : 'vertical'
          })
        : null,

      state.sidebarVisible
        ? e(SidebarWrapper, {
            activity: state.activeActivity,
            width: state.sidebarWidth,
            onResize: actions.setSidebarWidth
          })
        : null,

      showBackdrop
        ? e('div', {
            className: 'kt-sidebar-backdrop',
            onClick: function () { actions.closeDrawer(); }
          })
        : null,

      e(EditorColumn, {
        state: state,
        actions: actions,
        renderTabContent: renderTabContent,
        tasks: tasks,
        logs: logs,
        problems: problems,
        onWelcomeAction: handleWelcomeAction,
        isCompact: isCompact,
        compactHeaderTitle: compactHeaderTitle,
        kebabOpen: kebabOpen,
        onKebabToggle: function () { setKebabOpen(function (v) { return !v; }); },
        onCloseKebab: function () { setKebabOpen(false); },
        kebabAnchorRef: kebabAnchorRef
      }),

      state.statusBarVisible
        ? e(Ketor.ui.KetorStatusBar, {
            romInfo: romInfo,
            progress: progress,
            encoding: 'UTF-8',
            byteOrder: romInfo ? 'little' : null,
            theme: state.theme,
            notificationCount: problems.length,
            onThemeClick: function () { setThemeOpen(true); }
          })
        : null,

      e(Ketor.ui.KetorAboutModal, {
        open: aboutOpen,
        onClose: function () { setAboutOpen(false); }
      }),

      e(ThemePickerModal, {
        open: themeOpen,
        onClose: function () { setThemeOpen(false); },
        currentTheme: state.theme,
        onChange: actions.setTheme
      })
    );
  }

  function KetorWorkbench() {
    return e(Ketor.ui.WorkbenchProvider, null, e(WorkbenchShell, null));
  }

  Ketor.ui.KetorWorkbench = KetorWorkbench;

})(window);