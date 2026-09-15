/* ============================================================
   Ketor -- Panel (bottom)
   ------------------------------------------------------------
   VS Code-style bottom panel with tabs. Default active tab
   is "background" showing real-time running tasks.

   Tabs:
   - Background: real-time running tasks (from Ketor.tasks + context)
   - Log: chronological log entries
   - Problems: validation errors/warnings
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

  var PANEL_TABS = [
    { id: 'background', label: 'Background' },
    { id: 'log', label: 'Log' },
    { id: 'problems', label: 'Problems' }
  ];

  function formatTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    var ss = String(d.getSeconds()).padStart(2, '0');
    return hh + ':' + mm + ':' + ss;
  }

  function formatDuration(startedAt, finishedAt) {
    if (!startedAt) return '';
    var end = finishedAt || Date.now();
    var ms = Math.max(0, end - startedAt);
    if (ms < 1000) return ms + 'ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
    return Math.floor(ms / 60000) + 'm ' + Math.floor((ms % 60000) / 1000) + 's';
  }

  /* ============================================================
     BackgroundTab -- real-time running tasks
     ============================================================ */
  function BackgroundTab(props) {
    var tasks = props.tasks || [];
    var [, forceTick] = useState(0);

    useEffect(function () {
      // Re-render every second so durations update live
      var timer = setInterval(function () { forceTick(function (v) { return v + 1; }); }, 1000);
      return function () { clearInterval(timer); };
    }, []);

    if (tasks.length === 0) {
      return e('div', {
        className: 'kt-text-dim kt-text-small',
        style: { padding: '16px', textAlign: 'center' }
      }, 'No background tasks running.');
    }

    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
      tasks.map(function (t) {
        var statusColor = t.status === 'failed' ? 'var(--kt-error-fg)'
          : t.status === 'done' ? 'var(--kt-text-success, #89d185)'
          : t.status === 'warn' ? 'var(--kt-warning-fg)'
          : 'var(--kt-editor-fg)';

        return e('div', {
          key: t.id,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 8px',
            background: 'var(--kt-sidebar-bg)',
            borderRadius: '2px',
            borderLeft: '2px solid ' + statusColor,
            fontFamily: 'var(--kt-font-ui)',
            fontSize: '12px'
          }
        },
          e('div', {
            style: {
              width: '14px',
              height: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: '0 0 auto'
            }
          },
            t.status === 'running'
              ? e('span', { className: 'kt-spinner' })
              : Ketor.ui.icon(
                  t.status === 'failed' ? 'error' : (t.status === 'warn' ? 'warning' : 'check'),
                  { size: 14, style: { color: statusColor } }
                )
          ),
          e('div', { style: { flex: '1 1 auto', minWidth: 0 } },
            e('div', {
              className: 'kt-ellipsis',
              style: { color: 'var(--kt-editor-fg)' }
            }, t.label),
            t.detail
              ? e('div', {
                  className: 'kt-ellipsis kt-text-small kt-text-dim',
                  style: { marginTop: '1px' }
                }, t.detail)
              : null
          ),
          e('div', {
            className: 'kt-text-small kt-text-dim',
            style: { whiteSpace: 'nowrap', flex: '0 0 auto' }
          },
            t.status === 'running'
              ? Math.floor(t.progress || 0) + '%'
              : t.status
          ),
          e('div', {
            className: 'kt-text-small kt-text-dim',
            style: { whiteSpace: 'nowrap', flex: '0 0 auto', minWidth: '48px', textAlign: 'right' }
          }, formatDuration(t.startedAt, t.finishedAt))
        );
      })
    );
  }

  /* ============================================================
     LogTab -- chronological log
     ============================================================ */
  function LogTab(props) {
    var logs = props.logs || [];
    var containerRef = useRef(null);
    var [autoScroll, setAutoScroll] = useState(true);

    useEffect(function () {
      if (!autoScroll) return;
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, [logs, autoScroll]);

    var handleScroll = useCallback(function (ev) {
      var el = ev.currentTarget;
      var atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
      setAutoScroll(atBottom);
    }, []);

    if (logs.length === 0) {
      return e('div', {
        className: 'kt-text-dim kt-text-small',
        style: { padding: '16px', textAlign: 'center' }
      }, 'No log entries yet.');
    }

    return e('div', {
      ref: containerRef,
      onScroll: handleScroll,
      style: {
        height: '100%',
        overflow: 'auto',
        fontFamily: 'var(--kt-font-mono)',
        fontSize: '12px',
        lineHeight: 1.5
      }
    },
      logs.map(function (entry) {
        var color = entry.level === 'error' ? 'var(--kt-error-fg)'
          : entry.level === 'warn' ? 'var(--kt-warning-fg)'
          : entry.level === 'success' ? '#89d185'
          : 'var(--kt-editor-fg)';

        return e('div', {
          key: entry.id,
          style: { display: 'flex', gap: '8px', alignItems: 'baseline' }
        },
          e('span', { className: 'kt-text-dim', style: { flex: '0 0 auto' } },
            '[' + formatTime(entry.timestamp) + ']'
          ),
          e('span', {
            className: 'kt-text-dim',
            style: { flex: '0 0 auto', minWidth: '80px' }
          }, entry.source || 'ketor'),
          e('span', { style: { color: color, wordBreak: 'break-word' } }, entry.message)
        );
      })
    );
  }

  /* ============================================================
     ProblemsTab -- validation errors/warnings
     ============================================================ */
  function ProblemsTab(props) {
    var problems = props.problems || [];

    if (problems.length === 0) {
      return e('div', {
        className: 'kt-text-dim kt-text-small',
        style: { padding: '16px', textAlign: 'center' }
      }, 'No problems detected.');
    }

    return e('div', { style: { display: 'flex', flexDirection: 'column' } },
      problems.map(function (p) {
        var color = p.severity === 'error' ? 'var(--kt-error-fg)'
          : p.severity === 'warning' ? 'var(--kt-warning-fg)'
          : 'var(--kt-info-fg)';
        return e('div', {
          key: p.id,
          style: {
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
            padding: '4px 0'
          }
        },
          Ketor.ui.icon(
            p.severity === 'error' ? 'error' : (p.severity === 'warning' ? 'warning' : 'info'),
            { size: 14, style: { color: color, marginTop: '2px', flex: '0 0 auto' } }
          ),
          e('div', { style: { flex: '1 1 auto', minWidth: 0 } },
            e('div', { style: { wordBreak: 'break-word' } }, p.message),
            p.location
              ? e('div', { className: 'kt-text-small kt-text-dim' }, p.location)
              : null
          )
        );
      })
    );
  }

  /* ============================================================
     KetorPanel -- main container
     ============================================================ */
  function KetorPanel(props) {
    var activeTab = props.activeTab || 'background';
    var onTabChange = props.onTabChange || function () { };
    var onClose = props.onClose || function () { };
    var onResize = props.onResize;
    var height = props.height || 240;
    var tasks = props.tasks || [];
    var logs = props.logs || [];
    var problems = props.problems || [];

    var handleTabClick = useCallback(function (id) {
      onTabChange(id);
    }, [onTabChange]);

    var handleResizeStart = useCallback(function (ev) {
      if (typeof onResize !== 'function') return;
      ev.preventDefault();
      var startY = ev.clientY;
      var startHeight = height;

      var onMove = function (moveEv) {
        var delta = startY - moveEv.clientY;
        var nextHeight = Math.max(80, Math.min(600, startHeight + delta));
        onResize(nextHeight);
      };
      var onUp = function () {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }, [onResize, height]);

    var problemBadge = problems.filter(function (p) { return p.severity === 'error'; }).length;

    return e('div', {
      className: 'kt-panel-container',
      style: { height: height + 'px' }
    },
      e('div', {
        onMouseDown: handleResizeStart,
        style: {
          height: '4px',
          cursor: 'row-resize',
          background: 'transparent',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          transform: 'translateY(-2px)',
          zIndex: 10
        }
      }),
      e('div', { className: 'kt-panel-header' },
        PANEL_TABS.map(function (tab) {
          var badgeCount = tab.id === 'problems' ? problemBadge : 0;
          return e('button', {
            key: tab.id,
            type: 'button',
            className: 'kt-panel-tab' + (activeTab === tab.id ? ' active' : ''),
            onClick: function () { handleTabClick(tab.id); }
          },
            tab.label,
            badgeCount > 0
              ? e('span', {
                  className: 'kt-badge error',
                  style: { marginLeft: '6px', height: '14px', minWidth: '14px', fontSize: '9px' }
                }, badgeCount)
              : null
          );
        }),
        e('div', { className: 'spacer' }),
        e('button', {
          type: 'button',
          className: 'icon-btn',
          onClick: onClose,
          title: 'Close Panel'
        }, Ketor.ui.icon('close', { size: 14 }))
      ),
      e('div', { className: 'kt-panel-body' },
        activeTab === 'background'
          ? e(BackgroundTab, { tasks: tasks })
          : activeTab === 'log'
            ? e(LogTab, { logs: logs })
            : e(ProblemsTab, { problems: problems })
      )
    );
  }

  Ketor.ui.KetorPanel = KetorPanel;
  Ketor.ui.KetorBackgroundTab = BackgroundTab;
  Ketor.ui.KetorLogTab = LogTab;
  Ketor.ui.KetorProblemsTab = ProblemsTab;

})(window);