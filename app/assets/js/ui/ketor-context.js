/* ============================================================
   Ketor -- Workbench Context
   ------------------------------------------------------------
   React Context providing global workbench state matching
   VS Code's IWorkbenchLayoutService + IEditorService shape.

   State shape:
   - activeActivity: string ('translate' | 'hex' | 'font' | ...)
   - sidebarVisible: boolean
   - activityBarVisible: boolean
   - statusBarVisible: boolean
   - panelVisible: boolean
   - panelActiveTab: string ('background' | 'log' | 'problems')
   - panelHeight: number
   - sidebarWidth: number
   - editorGroups: Array<{ id, tabs: [], activeTabId }>
   - activeEditorGroupId: string
   - theme: string ('dark-plus' | 'dark-modern' | 'dark-high-contrast')

   Actions:
   - setActiveActivity(id)
   - toggleSidebar() / setSidebarVisible(bool)
   - togglePanel() / setPanelVisible(bool)
   - setPanelActiveTab(id)
   - setPanelHeight(px) / setSidebarWidth(px)
   - toggleActivityBar() / toggleStatusBar()
   - openTab(groupId, tab) -- tab = { id, title, icon, kind, payload }
   - closeTab(groupId, tabId)
   - setActiveTab(groupId, tabId)
   - splitEditor()
   - closeEditorGroup(groupId)
   - setTheme(themeId)
   - getActiveTab()
   ============================================================ */

/* ============================================================
   Ketor -- Workbench Context (v2)
   ------------------------------------------------------------
   Adds: hasUnsavedWork flag, moveTab, tab persistence.
   Session behavior:
   - hasUnsavedWork = false  → welcome screen on next load
   - hasUnsavedWork = true   → restore tabs + layout on next load
   markDirty() triggered on ROM load / edit / build.
   markClean() triggered on export/save.
   ============================================================ */

/* ============================================================
   Ketor -- Workbench Context (v3)
   ------------------------------------------------------------
   Adds:
   - useBreakpoint() hook: 'mobile' | 'tablet' | 'desktop'
   - drawerOpen state (for mobile/tablet sidebar overlay)
   - Default sidebarVisible depends on breakpoint
     (mobile/tablet = false, desktop = true)
   - closeDrawer() to dismiss backdrop
   ============================================================ */

/* ============================================================
   Ketor - Workbench Context (v3a)
   ------------------------------------------------------------
   useBreakpoint() hook: 'mobile' | 'tablet' | 'desktop'.
   Drawer state via sidebarVisible. Auto-close drawer on
   breakpoint change to non-desktop.
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.ui = Ketor.ui || {};
  var React = global.React;
  if (!React) return;

  var SESSION_KEY = 'ketor.workbench.session';

  var DEFAULT_STATE = {
    activeActivity: 'translate',
    sidebarVisible: true,
    activityBarVisible: true,
    statusBarVisible: true,
    panelVisible: false,
    panelActiveTab: 'background',
    panelHeight: 220,
    sidebarWidth: 300,
    editorGroups: [{ id: 'group-1', tabs: [], activeTabId: null }],
    activeEditorGroupId: 'group-1',
    theme: 'dark-plus'
  };

  function getBreakpoint() {
    try {
      var w = window.innerWidth || document.documentElement.clientWidth;
      if (w <= 600) return 'mobile';
      if (w <= 1024) return 'tablet';
      return 'desktop';
    } catch (_) {
      return 'desktop';
    }
  }

  function useBreakpoint() {
    var React_useState = React.useState;
    var React_useEffect = React.useEffect;
    var pair = React_useState(getBreakpoint);
    var bp = pair[0];
    var setBp = pair[1];

    React_useEffect(function () {
      var handler = function () { setBp(getBreakpoint()); };
      window.addEventListener('resize', handler);
      window.addEventListener('orientationchange', handler);
      return function () {
        window.removeEventListener('resize', handler);
        window.removeEventListener('orientationchange', handler);
      };
    }, []);

    return bp;
  }

  function loadSession() {
    try {
      var raw = global.localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || typeof p !== 'object') return null;
      return p;
    } catch (_) { return null; }
  }

  function persistSession(state, hasUnsavedWork) {
    try {
      var payload = {
        activeActivity: state.activeActivity,
        sidebarVisible: state.sidebarVisible,
        activityBarVisible: state.activityBarVisible,
        statusBarVisible: state.statusBarVisible,
        panelVisible: state.panelVisible,
        panelActiveTab: state.panelActiveTab,
        panelHeight: state.panelHeight,
        sidebarWidth: state.sidebarWidth,
        theme: state.theme,
        hasUnsavedWork: !!hasUnsavedWork,
        editorGroups: hasUnsavedWork ? state.editorGroups.map(function (g) {
          return {
            id: g.id,
            activeTabId: g.activeTabId,
            tabs: g.tabs.map(function (t) {
              return {
                id: t.id,
                kind: t.kind,
                title: t.title,
                icon: t.icon,
                dirty: t.dirty === true,
                payload: t.payload || {}
              };
            })
          };
        }) : DEFAULT_STATE.editorGroups,
        activeEditorGroupId: hasUnsavedWork ? state.activeEditorGroupId : 'group-1',
        savedAt: Date.now()
      };
      global.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch (_) { }
  }

  function clearSession() {
    try { global.localStorage.removeItem(SESSION_KEY); } catch (_) { }
  }

  var WorkbenchContext = React.createContext({
    state: DEFAULT_STATE,
    actions: {},
    tasks: [],
    logs: [],
    problems: [],
    hasUnsavedWork: false,
    breakpoint: 'desktop'
  });

  function generateGroupId() {
    return 'group-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  }

  function WorkbenchProvider(props) {
    var React_useState = React.useState;
    var React_useEffect = React.useEffect;
    var React_useRef = React.useRef;
    var React_useCallback = React.useCallback;
    var React_useMemo = React.useMemo;

    var bp = useBreakpoint();
    var saved = loadSession();
    var hasSavedWork = saved && saved.hasUnsavedWork === true;
    var defaultSidebar = bp === 'desktop';

    var _aa = React_useState(saved ? saved.activeActivity : DEFAULT_STATE.activeActivity);
    var activeActivity = _aa[0];
    var setActiveActivityRaw = _aa[1];

    var _sb = React_useState(function () {
      if (saved && typeof saved.sidebarVisible === 'boolean') {
        return bp === 'desktop' ? saved.sidebarVisible : false;
      }
      return defaultSidebar;
    });
    var sidebarVisible = _sb[0];
    var setSidebarVisibleRaw = _sb[1];

    var _abv = React_useState(saved ? saved.activityBarVisible !== false : DEFAULT_STATE.activityBarVisible);
    var activityBarVisible = _abv[0];
    var setActivityBarVisibleRaw = _abv[1];

    var _stv = React_useState(saved ? saved.statusBarVisible !== false : DEFAULT_STATE.statusBarVisible);
    var statusBarVisible = _stv[0];
    var setStatusBarVisibleRaw = _stv[1];

    var _pv = React_useState(saved ? saved.panelVisible === true : DEFAULT_STATE.panelVisible);
    var panelVisible = _pv[0];
    var setPanelVisibleRaw = _pv[1];

    var _pat = React_useState(saved ? saved.panelActiveTab : DEFAULT_STATE.panelActiveTab);
    var panelActiveTab = _pat[0];
    var setPanelActiveTabRaw = _pat[1];

    var _ph = React_useState(saved ? Math.max(80, Math.min(600, Number(saved.panelHeight) || 220)) : DEFAULT_STATE.panelHeight);
    var panelHeight = _ph[0];
    var setPanelHeightRaw = _ph[1];

    var _sw = React_useState(saved ? Math.max(170, Math.min(600, Number(saved.sidebarWidth) || 300)) : DEFAULT_STATE.sidebarWidth);
    var sidebarWidth = _sw[0];
    var setSidebarWidthRaw = _sw[1];

    var _eg = React_useState(
      hasSavedWork && Array.isArray(saved.editorGroups) && saved.editorGroups.length > 0
        ? saved.editorGroups
        : DEFAULT_STATE.editorGroups
    );
    var editorGroups = _eg[0];
    var setEditorGroups = _eg[1];

    var _aeg = React_useState(
      hasSavedWork && saved.activeEditorGroupId ? saved.activeEditorGroupId : DEFAULT_STATE.activeEditorGroupId
    );
    var activeEditorGroupId = _aeg[0];
    var setActiveEditorGroupId = _aeg[1];

    var _th = React_useState(saved ? saved.theme : DEFAULT_STATE.theme);
    var theme = _th[0];
    var setThemeRaw = _th[1];

    var _uw = React_useState(!!hasSavedWork);
    var hasUnsavedWork = _uw[0];
    var setHasUnsavedWork = _uw[1];

    var _tk = React_useState([]);
    var tasks = _tk[0];
    var setTasks = _tk[1];

    var _lg = React_useState([]);
    var logs = _lg[0];
    var setLogs = _lg[1];

    var _pr = React_useState([]);
    var problems = _pr[0];
    var setProblems = _pr[1];

    React_useEffect(function () {
      if (bp !== 'desktop') {
        setSidebarVisibleRaw(false);
      }
    }, [bp]);

    var saveTimerRef = React_useRef(null);
    React_useEffect(function () {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(function () {
        persistSession({
          activeActivity: activeActivity,
          sidebarVisible: sidebarVisible,
          activityBarVisible: activityBarVisible,
          statusBarVisible: statusBarVisible,
          panelVisible: panelVisible,
          panelActiveTab: panelActiveTab,
          panelHeight: panelHeight,
          sidebarWidth: sidebarWidth,
          theme: theme,
          editorGroups: editorGroups,
          activeEditorGroupId: activeEditorGroupId
        }, hasUnsavedWork);
      }, 400);
      return function () {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      };
    }, [activeActivity, sidebarVisible, activityBarVisible, statusBarVisible,
        panelVisible, panelActiveTab, panelHeight, sidebarWidth, theme,
        editorGroups, activeEditorGroupId, hasUnsavedWork]);

    React_useEffect(function () {
      try { document.documentElement.setAttribute('data-ketor-theme', theme); } catch (_) { }
    }, [theme]);

    var setActiveActivity = React_useCallback(function (id) {
      setActiveActivityRaw(function (prev) {
        if (bp === 'desktop') {
          if (prev === id && sidebarVisible) {
            setSidebarVisibleRaw(false);
            return prev;
          }
          if (!sidebarVisible) setSidebarVisibleRaw(true);
          return id;
        }
        if (prev === id && sidebarVisible) {
          setSidebarVisibleRaw(false);
          return prev;
        }
        setSidebarVisibleRaw(true);
        return id;
      });
    }, [bp, sidebarVisible]);

    var toggleSidebar = React_useCallback(function () {
      setSidebarVisibleRaw(function (v) { return !v; });
    }, []);

    var closeDrawer = React_useCallback(function () {
      setSidebarVisibleRaw(false);
    }, []);

    var togglePanel = React_useCallback(function () {
      setPanelVisibleRaw(function (v) { return !v; });
    }, []);

    var toggleActivityBar = React_useCallback(function () {
      setActivityBarVisibleRaw(function (v) { return !v; });
    }, []);

    var toggleStatusBar = React_useCallback(function () {
      setStatusBarVisibleRaw(function (v) { return !v; });
    }, []);

    var openTab = React_useCallback(function (groupId, tab) {
      setEditorGroups(function (groups) {
        return groups.map(function (g) {
          if (g.id !== groupId) return g;
          var existing = null;
          for (var i = 0; i < g.tabs.length; i++) {
            if (g.tabs[i].id === tab.id) { existing = g.tabs[i]; break; }
          }
          if (existing) return Object.assign({}, g, { activeTabId: tab.id });
          return Object.assign({}, g, {
            tabs: g.tabs.concat([tab]),
            activeTabId: tab.id
          });
        });
      });
      setActiveEditorGroupId(groupId);
    }, []);

    var closeTab = React_useCallback(function (groupId, tabId) {
      setEditorGroups(function (groups) {
        return groups.map(function (g) {
          if (g.id !== groupId) return g;
          var remaining = g.tabs.filter(function (t) { return t.id !== tabId; });
          var nextActive = g.activeTabId;
          if (g.activeTabId === tabId) {
            nextActive = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
          }
          return Object.assign({}, g, { tabs: remaining, activeTabId: nextActive });
        });
      });
    }, []);

    var setActiveTab = React.useCallback(function (groupId, tabId) {
      setEditorGroups(function (groups) {
        return groups.map(function (g) {
          if (g.id !== groupId) return g;
          return Object.assign({}, g, { activeTabId: tabId });
        });
      });
      setActiveEditorGroupId(groupId);
    }, []);

    var moveTab = React.useCallback(function (fromGroupId, tabId, toGroupId, toIndex) {
      setEditorGroups(function (groups) {
        var fromGroup = null;
        var toGroup = null;
        for (var i = 0; i < groups.length; i++) {
          if (groups[i].id === fromGroupId) fromGroup = groups[i];
          if (groups[i].id === toGroupId) toGroup = groups[i];
        }
        if (!fromGroup || !toGroup) return groups;
        var tab = null;
        for (var j = 0; j < fromGroup.tabs.length; j++) {
          if (fromGroup.tabs[j].id === tabId) { tab = fromGroup.tabs[j]; break; }
        }
        if (!tab) return groups;

        if (fromGroupId === toGroupId) {
          var tabs = fromGroup.tabs.slice();
          var curIdx = -1;
          for (var k = 0; k < tabs.length; k++) {
            if (tabs[k].id === tabId) { curIdx = k; break; }
          }
          if (curIdx < 0) return groups;
          tabs.splice(curIdx, 1);
          var insIdx = Math.max(0, Math.min(toIndex, tabs.length));
          if (curIdx < toIndex) insIdx = Math.max(0, toIndex - 1);
          tabs.splice(insIdx, 0, tab);
          return groups.map(function (g) {
            if (g.id !== fromGroupId) return g;
            return Object.assign({}, g, { tabs: tabs, activeTabId: tabId });
          });
        }

        var remainingFromTabs = fromGroup.tabs.filter(function (t) { return t.id !== tabId; });
        var nextFromActive = fromGroup.activeTabId;
        if (fromGroup.activeTabId === tabId) {
          nextFromActive = remainingFromTabs.length > 0
            ? remainingFromTabs[remainingFromTabs.length - 1].id
            : null;
        }

        var toTabs = toGroup.tabs.slice();
        var insIdx2 = Math.max(0, Math.min(toIndex, toTabs.length));
        toTabs.splice(insIdx2, 0, tab);

        return groups.map(function (g) {
          if (g.id === fromGroupId) {
            return Object.assign({}, g, { tabs: remainingFromTabs, activeTabId: nextFromActive });
          }
          if (g.id === toGroupId) {
            return Object.assign({}, g, { tabs: toTabs, activeTabId: tabId });
          }
          return g;
        });
      });
      setActiveEditorGroupId(toGroupId);
    }, []);

    var splitEditor = React.useCallback(function () {
      setEditorGroups(function (groups) {
        if (groups.length >= 3) return groups;
        var newId = generateGroupId();
        return groups.concat([{ id: newId, tabs: [], activeTabId: null }]);
      });
    }, []);

    var closeEditorGroup = React.useCallback(function (groupId) {
      setEditorGroups(function (groups) {
        if (groups.length <= 1) return groups;
        var remaining = groups.filter(function (g) { return g.id !== groupId; });
        setActiveEditorGroupId(function (cur) {
          return cur === groupId ? remaining[0].id : cur;
        });
        return remaining;
      });
    }, []);

    var setTheme = React.useCallback(function (id) { setThemeRaw(id || 'dark-plus'); }, []);
    var setPanelActiveTab = React.useCallback(function (id) { setPanelActiveTabRaw(id || 'background'); }, []);
    var setPanelHeight = React.useCallback(function (px) {
      setPanelHeightRaw(Math.max(80, Math.min(600, Number(px) || 220)));
    }, []);
    var setSidebarWidth = React.useCallback(function (px) {
      setSidebarWidthRaw(Math.max(170, Math.min(600, Number(px) || 300)));
    }, []);

    var markDirty = React.useCallback(function () { setHasUnsavedWork(true); }, []);
    var markClean = React.useCallback(function () { setHasUnsavedWork(false); }, []);

    var startTask = React.useCallback(function (task) {
      var id = task.id || ('task-' + Date.now());
      var record = {
        id: id,
        label: task.label || 'Task',
        detail: task.detail || '',
        progress: Number(task.progress) || 0,
        status: 'running',
        startedAt: Date.now(),
        finishedAt: null
      };
      setTasks(function (prev) {
        var filtered = prev.filter(function (t) { return t.id !== id; });
        return [record].concat(filtered).slice(0, 20);
      });
      return id;
    }, []);

    var updateTask = React.useCallback(function (id, patch) {
      setTasks(function (prev) {
        return prev.map(function (t) {
          if (t.id !== id) return t;
          var next = Object.assign({}, t, patch || {});
          if (next.status !== 'running' && !next.finishedAt) next.finishedAt = Date.now();
          return next;
        });
      });
    }, []);

    var finishTask = React.useCallback(function (id, status, detail) {
      setTasks(function (prev) {
        return prev.map(function (t) {
          if (t.id !== id) return t;
          return Object.assign({}, t, {
            status: status || 'done',
            progress: 100,
            detail: detail != null ? detail : t.detail,
            finishedAt: Date.now()
          });
        });
      });
    }, []);

    var clearFinishedTasks = React.useCallback(function () {
      setTasks(function (prev) { return prev.filter(function (t) { return t.status === 'running'; }); });
    }, []);

    var appendLog = React.useCallback(function (level, message, source) {
      var entry = {
        id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        level: level || 'info',
        message: String(message || ''),
        source: source || 'ketor',
        timestamp: Date.now()
      };
      setLogs(function (prev) { return prev.concat([entry]).slice(-500); });
      return entry.id;
    }, []);

    var clearLogs = React.useCallback(function () { setLogs([]); }, []);

    var addProblem = React.useCallback(function (problem) {
      var record = {
        id: problem.id || ('prob-' + Date.now()),
        severity: problem.severity || 'warning',
        message: String(problem.message || ''),
        source: problem.source || 'ketor',
        location: problem.location || null
      };
      setProblems(function (prev) {
        return [record].concat(prev.filter(function (p) { return p.id !== record.id; })).slice(0, 100);
      });
      return record.id;
    }, []);

    var clearProblems = React.useCallback(function () { setProblems([]); }, []);

    var getActiveTab = React.useCallback(function () {
      var group = null;
      for (var i = 0; i < editorGroups.length; i++) {
        if (editorGroups[i].id === activeEditorGroupId) { group = editorGroups[i]; break; }
      }
      if (!group || !group.activeTabId) return null;
      for (var j = 0; j < group.tabs.length; j++) {
        if (group.tabs[j].id === group.activeTabId) return group.tabs[j];
      }
      return null;
    }, [editorGroups, activeEditorGroupId]);

    var state = React_useMemo(function () {
      return {
        activeActivity: activeActivity,
        sidebarVisible: sidebarVisible,
        activityBarVisible: activityBarVisible,
        statusBarVisible: statusBarVisible,
        panelVisible: panelVisible,
        panelActiveTab: panelActiveTab,
        panelHeight: panelHeight,
        sidebarWidth: sidebarWidth,
        editorGroups: editorGroups,
        activeEditorGroupId: activeEditorGroupId,
        theme: theme
      };
    }, [activeActivity, sidebarVisible, activityBarVisible, statusBarVisible,
        panelVisible, panelActiveTab, panelHeight, sidebarWidth,
        editorGroups, activeEditorGroupId, theme]);

    var actions = React_useMemo(function () {
      return {
        setActiveActivity: setActiveActivity,
        setSidebarVisible: setSidebarVisibleRaw,
        toggleSidebar: toggleSidebar,
        closeDrawer: closeDrawer,
        setPanelVisible: setPanelVisibleRaw,
        togglePanel: togglePanel,
        setPanelActiveTab: setPanelActiveTab,
        setPanelHeight: setPanelHeight,
        setSidebarWidth: setSidebarWidth,
        toggleActivityBar: toggleActivityBar,
        toggleStatusBar: toggleStatusBar,
        setActivityBarVisible: setActivityBarVisibleRaw,
        setStatusBarVisible: setStatusBarVisibleRaw,
        openTab: openTab,
        closeTab: closeTab,
        setActiveTab: setActiveTab,
        moveTab: moveTab,
        splitEditor: splitEditor,
        closeEditorGroup: closeEditorGroup,
        setTheme: setTheme,
        getActiveTab: getActiveTab,
        markDirty: markDirty,
        markClean: markClean,
        startTask: startTask,
        updateTask: updateTask,
        finishTask: finishTask,
        clearFinishedTasks: clearFinishedTasks,
        appendLog: appendLog,
        clearLogs: clearLogs,
        addProblem: addProblem,
        clearProblems: clearProblems
      };
    }, [setActiveActivity, toggleSidebar, closeDrawer, togglePanel, setPanelActiveTab,
        setPanelHeight, setSidebarWidth, toggleActivityBar, toggleStatusBar,
        openTab, closeTab, setActiveTab, moveTab, splitEditor, closeEditorGroup,
        setTheme, getActiveTab, markDirty, markClean, startTask, updateTask,
        finishTask, clearFinishedTasks, appendLog, clearLogs, addProblem, clearProblems]);

    var value = React_useMemo(function () {
      return {
        state: state,
        actions: actions,
        tasks: tasks,
        logs: logs,
        problems: problems,
        hasUnsavedWork: hasUnsavedWork,
        breakpoint: bp
      };
    }, [state, actions, tasks, logs, problems, hasUnsavedWork, bp]);

    return React.createElement(WorkbenchContext.Provider, { value: value }, props.children);
  }

  function useWorkbench() {
    return React.useContext(WorkbenchContext);
  }

  Ketor.ui.WorkbenchContext = WorkbenchContext;
  Ketor.ui.WorkbenchProvider = WorkbenchProvider;
  Ketor.ui.useWorkbench = useWorkbench;
  Ketor.ui.useBreakpoint = useBreakpoint;
  Ketor.ui.clearSessionState = clearSession;

})(window);