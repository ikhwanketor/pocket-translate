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

  /* ============================================================
     Injected CSS patch
     ============================================================ */
  var WORKBENCH_PATCH_CSS = [
    '.kt-editor-column {',
    '  grid-area: editor;',
    '  display: flex;',
    '  flex-direction: column;',
    '  overflow: hidden;',
    '  min-width: 0;',
    '  min-height: 0;',
    '}',
    '.kt-editor-column > .kt-editor-area {',
    '  grid-area: unset;',
    '  flex: 1 1 auto;',
    '  min-height: 0;',
    '  min-width: 0;',
    '}',
    '.kt-editor-column > .kt-panel-container {',
    '  flex: 0 0 auto;',
    '  position: relative;',
    '}',
    '.kt-sidebar { position: relative; }',
    '.kt-sidebar-resize-handle {',
    '  position: absolute;',
    '  top: 0; right: -2px; bottom: 0;',
    '  width: 4px;',
    '  cursor: col-resize;',
    '  background: transparent;',
    '  z-index: 35;',
    '}',
    '.kt-sidebar-resize-handle:hover,',
    '.kt-sidebar-resize-handle.dragging {',
    '  background: var(--kt-focus-border);',
    '}',
    '.kt-activity-placeholder {',
    '  display: flex;',
    '  flex-direction: column;',
    '  align-items: center;',
    '  justify-content: center;',
    '  height: 100%;',
    '  padding: 40px 24px;',
    '  text-align: center;',
    '  color: var(--kt-input-placeholder-fg);',
    '  gap: 14px;',
    '}',
    '.kt-activity-placeholder .ap-icon {',
    '  opacity: 0.25;',
    '  color: var(--kt-editor-fg);',
    '}',
    '.kt-activity-placeholder .ap-title {',
    '  font-size: 22px;',
    '  font-weight: 300;',
    '  color: var(--kt-editor-fg);',
    '  opacity: 0.8;',
    '}',
    '.kt-activity-placeholder .ap-hint {',
    '  font-size: 12px;',
    '  max-width: 520px;',
    '  line-height: 1.65;',
    '  opacity: 0.7;',
    '}',
    '.kt-activity-placeholder .ap-badge {',
    '  font-size: 10px;',
    '  padding: 2px 8px;',
    '  border: 1px solid var(--kt-widget-border-default);',
    '  border-radius: 999px;',
    '  text-transform: uppercase;',
    '  letter-spacing: 0.05em;',
    '  opacity: 0.6;',
    '}',
    '.kt-theme-picker {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 8px;',
    '}',
    '.kt-theme-picker label {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 8px;',
    '  padding: 8px 10px;',
    '  border: 1px solid var(--kt-widget-border-default);',
    '  border-radius: 3px;',
    '  cursor: pointer;',
    '}',
    '.kt-theme-picker label:hover {',
    '  background: var(--kt-list-hover-bg);',
    '}',
    '.kt-theme-picker input[type="radio"] { margin: 0; }',
    '.kt-theme-swatch {',
    '  width: 48px; height: 24px;',
    '  border: 1px solid var(--kt-widget-border-default);',
    '  border-radius: 2px;',
    '  display: inline-block;',
    '}',
    '.kt-theme-swatch.dark-plus { background: #1e1e1e; }',
    '.kt-theme-swatch.dark-modern { background: #1f1f1f; }',
    '.kt-theme-swatch.dark-high-contrast { background: #000000; }'
  ].join('\n');

  function injectWorkbenchCSS() {
    if (document.getElementById('kt-workbench-patch-css')) return;
    var style = document.createElement('style');
    style.id = 'kt-workbench-patch-css';
    style.textContent = WORKBENCH_PATCH_CSS;
    document.head.appendChild(style);
  }

  /* ============================================================
     Activity metadata
     ============================================================ */
  var ACTIVITY_META = {
    translate: {
      icon: 'globe',
      title: 'Translation',
      sidebarTitle: 'Translate',
      placeholderTitle: 'Translation Workspace',
      placeholderHint: 'Extract text from the ROM using a .tbl table, edit translations, ' +
        'auto-relocate overflow text with pointer updates, and rebuild the ROM. ' +
        'The full text list, table editor, live preview, and rebuild pipeline will ' +
        'be wired here after core integration.'
    },
    hex: {
      icon: 'file-binary',
      title: 'Hex Editor',
      sidebarTitle: 'Hex Editor',
      placeholderTitle: 'Hex Editor',
      placeholderHint: 'RTHextion-compatible byte inspector with sections, pointers, ' +
        'byte categories, script dump/import, and Monkey-Moore relative search. ' +
        'Multi-tab workspace with split view.'
    },
    font: {
      icon: 'paintcan',
      title: 'Font & Graphics',
      sidebarTitle: 'Font & Graphics',
      placeholderTitle: 'Font & Graphics Editor',
      placeholderHint: 'Auto-detect font tiles using score-based heuristics. Edit pixels, ' +
        'manage palettes, and preview glyphs. Supports 2bpp and 4bpp across NES, SNES, ' +
        'GB, GBC, GBA, NDS, Genesis, and PS1.'
    },
    patch: {
      icon: 'package',
      title: 'Patch & Export',
      sidebarTitle: 'Patch & Export',
      placeholderTitle: 'Patch & Export',
      placeholderHint: 'Generate IPS patches, export the modified ROM, and import/export ' +
        'project state. Single source of truth for build output.'
    },
    tests: {
      icon: 'beaker',
      title: 'Tests',
      sidebarTitle: 'Tests',
      placeholderTitle: 'Test Suite',
      placeholderHint: 'Unit test suite for parsers, encoders, decompression, and ' +
        'system detection. Preview pipeline checks validate every workflow before shipping.'
    }
  };

  Ketor.ui.ACTIVITY_META = ACTIVITY_META;

  /* ============================================================
     Extension points
     ============================================================ */
  var SIDEBAR_PROVIDERS = {};
  var TAB_PROVIDERS = {};

  function registerSidebarProvider(activityId, Component) {
    if (typeof Component !== 'function') return;
    SIDEBAR_PROVIDERS[activityId] = Component;
  }

  function registerTabProvider(kind, Component) {
    if (typeof Component !== 'function') return;
    TAB_PROVIDERS[kind] = Component;
  }

  Ketor.ui.registerSidebarProvider = registerSidebarProvider;
  Ketor.ui.registerTabProvider = registerTabProvider;

  /* ============================================================
     Sub-components
     ============================================================ */
  function TitleBar(props) {
    var activityLabel = props.activityLabel || '';
    return e('header', { className: 'kt-titlebar' },
      e(Ketor.ui.KetorMenubar, {
        context: {
          activityBarVisible: props.activityBarVisible,
          statusBarVisible: props.statusBarVisible,
          sidebarVisible: props.sidebarVisible,
          panelVisible: props.panelVisible
        }
      }),
      e('div', { className: 'kt-titlebar-title' },
        'Ketor -- ' + (activityLabel || 'Workbench')
      ),
      e('div', { className: 'kt-titlebar-actions' })
    );
  }

  function ActivityPlaceholder(props) {
    var activity = props.activity;
    var meta = ACTIVITY_META[activity] || {};
    return e('div', { className: 'kt-activity-placeholder' },
      e('div', { className: 'ap-icon' },
        Ketor.ui.icon(meta.icon || 'info', { size: 56 })
      ),
      e('div', { className: 'ap-title' }, meta.placeholderTitle || meta.title || activity),
      e('div', { className: 'ap-hint' }, meta.placeholderHint || ''),
      e('div', { className: 'ap-badge' }, 'Wired in Batch 13')
    );
  }

  function SidebarWrapper(props) {
    var activity = props.activity;
    var width = props.width;
    var onResize = props.onResize;

    var Provider = SIDEBAR_PROVIDERS[activity] || null;
    var meta = ACTIVITY_META[activity] || {};

    var handleResizeStart = useCallback(function (ev) {
      if (typeof onResize !== 'function') return;
      ev.preventDefault();
      var startX = ev.clientX;
      var startWidth = width;

      var onMove = function (moveEv) {
        var delta = moveEv.clientX - startX;
        onResize(Math.max(170, Math.min(600, startWidth + delta)));
      };
      var onUp = function () {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }, [onResize, width]);

    return e('div', {
      className: 'kt-sidebar',
      style: { width: width + 'px', minWidth: width + 'px', maxWidth: width + 'px' }
    },
      Provider
        ? e(Provider, { activity: activity })
        : e(Ketor.ui.KetorSidebar, { title: meta.sidebarTitle || activity },
            e('div', {
              className: 'kt-text-dim kt-text-small',
              style: { padding: '12px 16px', lineHeight: 1.6 }
            }, 'Sidebar controls for "' + (meta.title || activity) + '" will appear here.')
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
    var renderTabContent = props.renderTabContent;
    var tasks = props.tasks;
    var logs = props.logs;
    var problems = props.problems;

    return e('div', { className: 'kt-editor-column' },
      e(Ketor.ui.KetorEditorArea, {
        groups: state.editorGroups,
        activeGroupId: state.activeEditorGroupId,
        renderTabContent: renderTabContent,
        onActivateTab: actions.setActiveTab,
        onCloseTab: actions.closeTab,
        onSplit: actions.splitEditor,
        onCloseGroup: actions.closeEditorGroup,
        onWelcomeAction: props.onWelcomeAction
      }),
      state.panelVisible
        ? e(Ketor.ui.KetorPanel, {
            activeTab: state.panelActiveTab,
            onTabChange: actions.setPanelActiveTab,
            onClose: function () { actions.setPanelVisible(false); },
            onResize: actions.setPanelHeight,
            height: state.panelHeight,
            tasks: tasks,
            logs: logs,
            problems: problems
          })
        : null
    );
  }

  function ThemePickerModal(props) {
    var open = props.open;
    var onClose = props.onClose;
    var currentTheme = props.currentTheme;
    var onChange = props.onChange;

    if (!open) return null;

    var themes = [
      { id: 'dark-plus', label: 'Dark+ (default)' },
      { id: 'dark-modern', label: 'Dark Modern' },
      { id: 'dark-high-contrast', label: 'Dark High Contrast' }
    ];

    return e('div', {
      className: 'kt-modal-overlay',
      onClick: function (ev) {
        if (ev.target === ev.currentTarget) onClose();
      }
    },
      e('div', { className: 'kt-modal', style: { maxWidth: '420px' } },
        e('div', { className: 'kt-modal-header' },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            Ketor.ui.icon('symbol-color', { size: 18 }),
            e('strong', null, 'Color Theme')
          ),
          e('button', {
            type: 'button',
            className: 'icon-btn',
            onClick: onClose
          }, Ketor.ui.icon('close', { size: 14 }))
        ),
        e('div', { className: 'kt-modal-body' },
          e('div', { className: 'kt-theme-picker' },
            themes.map(function (th) {
              return e('label', { key: th.id },
                e('input', {
                  type: 'radio',
                  name: 'kt-theme',
                  checked: currentTheme === th.id,
                  onChange: function () { onChange(th.id); }
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
            onClick: onClose
          }, 'Done')
        )
      )
    );
  }

  /* ============================================================
     Default command registration
     ============================================================ */
  function registerDefaultCommands(deps) {
    var actions = deps.actions;
    var setAboutOpen = deps.setAboutOpen;
    var setThemeOpen = deps.setThemeOpen;

    function logStub(label) {
      actions.appendLog('info', label + ' -- integration pending in Batch 13.', 'command');
    }

    // File
    Ketor.commands.registerCommand('ketor.file.loadRom', function () {
      logStub('Load ROM');
      var input = document.querySelector('input[type="file"][data-ketor-role="rom"]');
      if (input) input.click();
    });
    Ketor.commands.registerCommand('ketor.file.loadTable', function () {
      logStub('Load Table');
      var input = document.querySelector('input[type="file"][data-ketor-role="table"]');
      if (input) input.click();
    });
    Ketor.commands.registerCommand('ketor.file.importProject', function () { logStub('Import Project'); });
    Ketor.commands.registerCommand('ketor.file.exportProject', function () { logStub('Export Project'); });
    Ketor.commands.registerCommand('ketor.file.saveModifiedRom', function () { logStub('Save Modified ROM'); });
    Ketor.commands.registerCommand('ketor.file.exportIps', function () { logStub('Export IPS'); });

    // Edit
    Ketor.commands.registerCommand('ketor.edit.undo', function () { logStub('Undo'); });
    Ketor.commands.registerCommand('ketor.edit.redo', function () { logStub('Redo'); });
    Ketor.commands.registerCommand('ketor.edit.cut', function () { logStub('Cut'); });
    Ketor.commands.registerCommand('ketor.edit.copy', function () { logStub('Copy'); });
    Ketor.commands.registerCommand('ketor.edit.paste', function () { logStub('Paste'); });
    Ketor.commands.registerCommand('ketor.edit.find', function () { logStub('Find'); });

    // View
    Ketor.commands.registerCommand('ketor.view.toggleSidebar', function () { actions.toggleSidebar(); });
    Ketor.commands.registerCommand('ketor.view.togglePanel', function () { actions.togglePanel(); });
    Ketor.commands.registerCommand('ketor.view.toggleActivityBar', function () { actions.toggleActivityBar(); });
    Ketor.commands.registerCommand('ketor.view.toggleStatusBar', function () { actions.toggleStatusBar(); });
    Ketor.commands.registerCommand('ketor.view.splitEditor', function () { actions.splitEditor(); });
    Ketor.commands.registerCommand('ketor.view.appearance', function () { setThemeOpen(true); });
    Ketor.commands.registerCommand('ketor.view.theme', function () { setThemeOpen(true); });
    Ketor.commands.registerCommand('ketor.view.showTranslate', function () {
      actions.setActiveActivity('translate');
    });
    Ketor.commands.registerCommand('ketor.view.showBackgroundTasks', function () {
      actions.setPanelVisible(true);
      actions.setPanelActiveTab('background');
    });

    // About
    Ketor.commands.registerCommand('ketor.about.show', function () { setAboutOpen(true); });

    // Help
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

    // Settings
    Ketor.commands.registerCommand('ketor.settings.open', function () { logStub('Settings'); });
    Ketor.commands.registerCommand('ketor.settings.theme', function () { setThemeOpen(true); });
    Ketor.commands.registerCommand('ketor.settings.shortcuts', function () { logStub('Keyboard Shortcuts Settings'); });
    Ketor.commands.registerCommand('ketor.settings.advanced', function () { logStub('Advanced Options'); });
  }

  /* ============================================================
     Workbench shell
     ============================================================ */
  function WorkbenchShell(props) {
    var wb = Ketor.ui.useWorkbench();
    var state = wb.state;
    var actions = wb.actions;
    var tasks = wb.tasks;
    var logs = wb.logs;
    var problems = wb.problems;

    var [aboutOpen, setAboutOpen] = useState(false);
    var [themeOpen, setThemeOpen] = useState(false);
    var [romInfo, setRomInfo] = useState(null);

    // Inject workbench CSS patch on first mount
    useEffect(function () { injectWorkbenchCSS(); }, []);

    // Register commands once
    useEffect(function () {
      registerDefaultCommands({
        actions: actions,
        setAboutOpen: setAboutOpen,
        setThemeOpen: setThemeOpen
      });
      actions.appendLog('info', 'Ketor workbench initialized (VS Code shell).', 'ketor');
      return function () { };
    }, []);

    // Listen for ROM load events (dispatched by core integration in Batch 13)
    useEffect(function () {
      function onRomLoaded(ev) {
        var detail = ev && ev.detail ? ev.detail : null;
        if (detail && detail.name) setRomInfo(detail);
      }
      window.addEventListener('ketor:rom-loaded', onRomLoaded);
      return function () { window.removeEventListener('ketor:rom-loaded', onRomLoaded); };
    }, []);

    // Open default tab for initial activity
    useEffect(function () {
      var groupId = state.editorGroups[0] && state.editorGroups[0].id;
      if (!groupId) return;
      var hasAnyTab = state.editorGroups[0].tabs.length > 0;
      if (!hasAnyTab) {
        actions.openTab(groupId, {
          id: 'activity:' + state.activeActivity,
          kind: 'activity',
          title: (ACTIVITY_META[state.activeActivity] || {}).title || 'Workbench',
          icon: (ACTIVITY_META[state.activeActivity] || {}).icon || 'file',
          payload: { activity: state.activeActivity }
        });
      }
    }, []);

    // Handle activity bar click: switch activity + open its tab
    var handleActivityClick = useCallback(function (activityId) {
      actions.setActiveActivity(activityId);
      var meta = ACTIVITY_META[activityId] || {};
      actions.openTab(state.editorGroups[0].id, {
        id: 'activity:' + activityId,
        kind: 'activity',
        title: meta.title || activityId,
        icon: meta.icon || 'file',
        payload: { activity: activityId }
      });
    }, [actions, state.editorGroups]);

    // Welcome action handler
    var handleWelcomeAction = useCallback(function (actionId) {
      if (actionId === 'load-rom') {
        Ketor.commands.executeCommand('ketor.file.loadRom');
      } else if (actionId === 'open-project') {
        Ketor.commands.executeCommand('ketor.file.importProject');
      } else if (actionId === 'recent-files') {
        actions.appendLog('info', 'Recent files: not implemented yet.', 'ketor');
      }
    }, [actions]);

    // Tab content dispatcher
    var renderTabContent = useCallback(function (tab) {
      var Provider = TAB_PROVIDERS[tab.kind];
      if (Provider) {
        return e(Provider, {
          tab: tab,
          payload: tab.payload || {},
          workbench: wb
        });
      }
      if (tab.kind === 'activity') {
        return e(ActivityPlaceholder, { activity: tab.payload && tab.payload.activity });
      }
      return e('div', { className: 'kt-activity-placeholder' },
        e('div', { className: 'ap-title' }, tab.title || 'Empty Tab'),
        e('div', { className: 'ap-hint' }, 'No provider registered for tab kind: ' + tab.kind)
      );
    }, [wb]);

    // Compose class names for workbench root
    var rootClasses = ['kt-workbench'];
    if (!state.activityBarVisible) rootClasses.push('no-activitybar');
    if (!state.sidebarVisible) rootClasses.push('no-sidebar');
    if (!state.statusBarVisible) rootClasses.push('no-statusbar');

    // Progress snapshot for status bar
    var progress = useMemo(function () {
      var running = tasks.filter(function (t) { return t.status === 'running'; });
      if (running.length === 0) return null;
      var first = running[0];
      return {
        active: true,
        value: first.progress || 0,
        label: first.label + (running.length > 1 ? ' (+' + (running.length - 1) + ')' : '')
      };
    }, [tasks]);

    return e('div', { className: rootClasses.join(' ') },
      e(TitleBar, {
        activityLabel: (ACTIVITY_META[state.activeActivity] || {}).title || '',
        activityBarVisible: state.activityBarVisible,
        sidebarVisible: state.sidebarVisible,
        statusBarVisible: state.statusBarVisible,
        panelVisible: state.panelVisible
      }),
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
            }
          })
        : null,
      state.sidebarVisible
        ? e(SidebarWrapper, {
            activity: state.activeActivity,
            width: state.sidebarWidth,
            onResize: actions.setSidebarWidth
          })
        : null,
      e(EditorColumn, {
        state: state,
        actions: actions,
        renderTabContent: renderTabContent,
        tasks: tasks,
        logs: logs,
        problems: problems,
        onWelcomeAction: handleWelcomeAction
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

  /* ============================================================
     Root
     ============================================================ */
  function KetorWorkbench(props) {
    return e(Ketor.ui.WorkbenchProvider, null, e(WorkbenchShell, props));
  }

  Ketor.ui.KetorWorkbench = KetorWorkbench;

})(window);