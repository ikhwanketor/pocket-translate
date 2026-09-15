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

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.ui = Ketor.ui || {};

  var React = global.React;
  if (!React) return;

  var DEFAULT_STATE = {
    activeActivity: 'translate',
    sidebarVisible: true,
    activityBarVisible: true,
    statusBarVisible: true,
    panelVisible: true,
    panelActiveTab: 'background',
    panelHeight: 240,
    sidebarWidth: 300,
    editorGroups: [
      { id: 'group-1', tabs: [], activeTabId: null }
    ],
    activeEditorGroupId: 'group-1',
    theme: 'dark-plus'
  };

  var SESSION_KEY = 'ketor.workbench.session';

  function loadSessionState() {
    try {
      var raw = global.localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        activeActivity: parsed.activeActivity || DEFAULT_STATE.activeActivity,
        sidebarVisible: parsed.sidebarVisible !== false,
        activityBarVisible: parsed.activityBarVisible !== false,
        statusBarVisible: parsed.statusBarVisible !== false,
        panelVisible: parsed.panelVisible === true,
        panelActiveTab: parsed.panelActiveTab || 'background',
        panelHeight: Math.max(80, Math.min(600, Number(parsed.panelHeight) || 240)),
        sidebarWidth: Math.max(170, Math.min(600, Number(parsed.sidebarWidth) || 300)),
        theme: parsed.theme || 'dark-plus'
      };
    } catch (_) {
      return null;
    }
  }

  function saveSessionState(state) {
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
        savedAt: Date.now()
      };
      global.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch (_) { }
  }

  function clearSessionState() {
    try { global.localStorage.removeItem(SESSION_KEY); } catch (_) { }
  }

  var WorkbenchContext = React.createContext({
    state: DEFAULT_STATE,
    actions: {},
    tasks: [],
    logs: [],
    problems: []
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

    var initial = loadSessionState() || DEFAULT_STATE;
    var [activeActivity, setActiveActivityRaw] = React_useState(initial.activeActivity);
    var [sidebarVisible, setSidebarVisibleRaw] = React_useState(initial.sidebarVisible);
    var [activityBarVisible, setActivityBarVisibleRaw] = React_useState(initial.activityBarVisible);
    var [statusBarVisible, setStatusBarVisibleRaw] = React_useState(initial.statusBarVisible);
    var [panelVisible, setPanelVisibleRaw] = React_useState(initial.panelVisible);
    var [panelActiveTab, setPanelActiveTabRaw] = React_useState(initial.panelActiveTab);
    var [panelHeight, setPanelHeightRaw] = React_useState(initial.panelHeight);
    var [sidebarWidth, setSidebarWidthRaw] = React_useState(initial.sidebarWidth);
    var [editorGroups, setEditorGroups] = React_useState(DEFAULT_STATE.editorGroups);
    var [activeEditorGroupId, setActiveEditorGroupId] = React_useState(DEFAULT_STATE.activeEditorGroupId);
    var [theme, setThemeRaw] = React_useState(initial.theme);
    var [tasks, setTasks] = React_useState([]);
    var [logs, setLogs] = React_useState([]);
    var [problems, setProblems] = React_useState([]);

    // ---- Persistence (debounced) ----
    var saveTimerRef = React_useRef(null);
    React_useEffect(function () {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(function () {
        saveSessionState({
          activeActivity: activeActivity,
          sidebarVisible: sidebarVisible,
          activityBarVisible: activityBarVisible,
          statusBarVisible: statusBarVisible,
          panelVisible: panelVisible,
          panelActiveTab: panelActiveTab,
          panelHeight: panelHeight,
          sidebarWidth: sidebarWidth,
          theme: theme
        });
      }, 300);
      return function () {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      };
    }, [activeActivity, sidebarVisible, activityBarVisible, statusBarVisible,
        panelVisible, panelActiveTab, panelHeight, sidebarWidth, theme]);

    // ---- Apply theme to <html> ----
    React_useEffect(function () {
      try {
        document.documentElement.setAttribute('data-ketor-theme', theme);
      } catch (_) { }
    }, [theme]);

    // ---- Actions ----
    var setActiveActivity = React_useCallback(function (id) {
      setActiveActivityRaw(function (prev) {
        if (prev === id && sidebarVisible) {
          // Toggle sidebar visibility when re-clicking same activity
          setSidebarVisibleRaw(function (v) { return !v; });
          return prev;
        }
        if (!sidebarVisible) setSidebarVisibleRaw(true);
        return id;
      });
    }, [sidebarVisible]);

    var toggleSidebar = React_useCallback(function () {
      setSidebarVisibleRaw(function (v) { return !v; });
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
          var existing = g.tabs.find(function (t) { return t.id === tab.id; });
          if (existing) {
            return Object.assign({}, g, { activeTabId: tab.id });
          }
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
          var nextActive = g.activeTabId === tabId
            ? (remaining.length > 0 ? remaining[remaining.length - 1].id : null)
            : g.activeTabId;
          return Object.assign({}, g, { tabs: remaining, activeTabId: nextActive });
        });
      });
    }, []);

    var setActiveTab = React_useCallback(function (groupId, tabId) {
      setEditorGroups(function (groups) {
        return groups.map(function (g) {
          if (g.id !== groupId) return g;
          return Object.assign({}, g, { activeTabId: tabId });
        });
      });
      setActiveEditorGroupId(groupId);
    }, []);

    var splitEditor = React_useCallback(function () {
      setEditorGroups(function (groups) {
        if (groups.length >= 3) return groups;
        var newId = generateGroupId();
        return groups.concat([{ id: newId, tabs: [], activeTabId: null }]);
      });
    }, []);

    var closeEditorGroup = React_useCallback(function (groupId) {
      setEditorGroups(function (groups) {
        if (groups.length <= 1) return groups;
        var remaining = groups.filter(function (g) { return g.id !== groupId; });
        setActiveEditorGroupId(function (current) {
          return current === groupId ? remaining[0].id : current;
        });
        return remaining;
      });
    }, []);

    var setTheme = React_useCallback(function (themeId) {
      setThemeRaw(themeId || 'dark-plus');
    }, []);

    var setPanelActiveTab = React_useCallback(function (tabId) {
      setPanelActiveTabRaw(tabId || 'background');
    }, []);

    var setPanelHeight = React_useCallback(function (px) {
      setPanelHeightRaw(Math.max(80, Math.min(600, Number(px) || 240)));
    }, []);

    var setSidebarWidth = React_useCallback(function (px) {
      setSidebarWidthRaw(Math.max(170, Math.min(600, Number(px) || 300)));
    }, []);

    // ---- Task tracking API ----
    var startTask = React_useCallback(function (task) {
      var id = task.id || ('task-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
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

    var updateTask = React_useCallback(function (id, patch) {
      setTasks(function (prev) {
        return prev.map(function (t) {
          if (t.id !== id) return t;
          var next = Object.assign({}, t, patch || {});
          if (next.status !== 'running' && !next.finishedAt) next.finishedAt = Date.now();
          return next;
        });
      });
    }, []);

    var finishTask = React_useCallback(function (id, status, detail) {
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

    var clearFinishedTasks = React_useCallback(function () {
      setTasks(function (prev) { return prev.filter(function (t) { return t.status === 'running'; }); });
    }, []);

    // ---- Log API ----
    var appendLog = React_useCallback(function (level, message, source) {
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

    var clearLogs = React_useCallback(function () {
      setLogs([]);
    }, []);

    // ---- Problems API ----
    var addProblem = React_useCallback(function (problem) {
      var record = {
        id: problem.id || ('prob-' + Date.now() + '-' + Math.floor(Math.random() * 1000)),
        severity: problem.severity || 'warning',
        message: String(problem.message || ''),
        source: problem.source || 'ketor',
        location: problem.location || null
      };
      setProblems(function (prev) {
        var filtered = prev.filter(function (p) { return p.id !== record.id; });
        return [record].concat(filtered).slice(0, 100);
      });
      return record.id;
    }, []);

    var clearProblems = React_useCallback(function () {
      setProblems([]);
    }, []);

    var getActiveTab = React_useCallback(function () {
      var group = editorGroups.find(function (g) { return g.id === activeEditorGroupId; });
      if (!group || !group.activeTabId) return null;
      return group.tabs.find(function (t) { return t.id === group.activeTabId; }) || null;
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
        splitEditor: splitEditor,
        closeEditorGroup: closeEditorGroup,
        setTheme: setTheme,
        getActiveTab: getActiveTab,
        startTask: startTask,
        updateTask: updateTask,
        finishTask: finishTask,
        clearFinishedTasks: clearFinishedTasks,
        appendLog: appendLog,
        clearLogs: clearLogs,
        addProblem: addProblem,
        clearProblems: clearProblems
      };
    }, [setActiveActivity, toggleSidebar, togglePanel, setPanelActiveTab,
        setPanelHeight, setSidebarWidth, toggleActivityBar, toggleStatusBar,
        openTab, closeTab, setActiveTab, splitEditor, closeEditorGroup,
        setTheme, getActiveTab, startTask, updateTask, finishTask,
        clearFinishedTasks, appendLog, clearLogs, addProblem, clearProblems]);

    var value = React_useMemo(function () {
      return {
        state: state,
        actions: actions,
        tasks: tasks,
        logs: logs,
        problems: problems
      };
    }, [state, actions, tasks, logs, problems]);

    return React.createElement(WorkbenchContext.Provider, { value: value }, props.children);
  }

  function useWorkbench() {
    return React.useContext(WorkbenchContext);
  }

  Ketor.ui.WorkbenchContext = WorkbenchContext;
  Ketor.ui.WorkbenchProvider = WorkbenchProvider;
  Ketor.ui.useWorkbench = useWorkbench;
  Ketor.ui.clearSessionState = clearSessionState;

})(window);