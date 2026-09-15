/* ============================================================
   Ketor -- Editor Area
   ------------------------------------------------------------
   VS Code-style editor area with multiple editor groups.
   Each group has its own tab bar and content area.
   Split support: horizontal (side-by-side) via CSS flex.

   Components:
   - KetorEditorArea -- container that renders all groups
   - KetorEditorGroup -- single group (tab bar + content)
   - KetorTab -- single tab
   - KetorWelcome -- welcome screen when no tabs are open
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.ui = Ketor.ui || {};

  var React = global.React;
  if (!React) return;
  var e = React.createElement;
  var useCallback = React.useCallback;
  var memo = React.memo;

  /* ============================================================
     KetorTab
     ============================================================ */
  function KetorTab(props) {
    var tab = props.tab;
    var isActive = props.isActive;
    var dirty = !!tab.dirty;

    var handleClick = useCallback(function () {
      props.onActivate(tab.id);
    }, [tab.id, props.onActivate]);

    var handleClose = useCallback(function (ev) {
      ev.stopPropagation();
      props.onClose(tab.id);
    }, [tab.id, props.onClose]);

    var handleAuxClick = useCallback(function (ev) {
      if (ev.button === 1) {
        ev.preventDefault();
        props.onClose(tab.id);
      }
    }, [tab.id, props.onClose]);

    return e('div', {
      className: 'kt-tab' +
        (isActive ? ' active' : '') +
        (dirty ? ' dirty' : ''),
      onClick: handleClick,
      onAuxClick: handleAuxClick,
      role: 'tab',
      'aria-selected': isActive,
      title: tab.tooltip || tab.title
    },
      tab.icon
        ? e('span', { className: 'tab-icon' }, Ketor.ui.icon(tab.icon, { size: 14 }))
        : null,
      e('span', { className: 'tab-label' }, tab.title),
      e('button', {
        type: 'button',
        className: 'tab-close',
        onClick: handleClose,
        tabIndex: -1,
        'aria-label': 'Close'
      }, Ketor.ui.icon('close', { size: 12 }))
    );
  }

  var MemoTab = memo(KetorTab);

  /* ============================================================
     KetorEditorGroup
     ============================================================ */
  function KetorEditorGroup(props) {
    var group = props.group;
    var isActiveGroup = props.isActiveGroup;
    var renderTabContent = props.renderTabContent || function () { return null; };
    var onActivateTab = props.onActivateTab;
    var onCloseTab = props.onCloseTab;
    var onSplit = props.onSplit;
    var onCloseGroup = props.onCloseGroup;
    var canCloseGroup = props.canCloseGroup;

    var activeTab = null;
    if (group.activeTabId) {
      activeTab = group.tabs.find(function (t) { return t.id === group.activeTabId; }) || null;
    }

    var handleSplit = useCallback(function (ev) {
      ev.stopPropagation();
      if (typeof onSplit === 'function') onSplit();
    }, [onSplit]);

    var handleCloseGroup = useCallback(function (ev) {
      ev.stopPropagation();
      if (typeof onCloseGroup === 'function') onCloseGroup();
    }, [onCloseGroup]);

    return e('div', {
      className: 'kt-editor-group',
      'data-active': isActiveGroup ? 'true' : 'false'
    },
      e('div', { className: 'kt-tabbar' },
        group.tabs.map(function (tab) {
          return e(MemoTab, {
            key: tab.id,
            tab: tab,
            isActive: group.activeTabId === tab.id,
            onActivate: function (tabId) { onActivateTab(group.id, tabId); },
            onClose: function (tabId) { onCloseTab(group.id, tabId); }
          });
        }),
        e('div', { style: { flex: '1 1 auto', minWidth: 0 } }),
        e('button', {
          type: 'button',
          className: 'icon-btn',
          onClick: handleSplit,
          title: 'Split Editor',
          style: {
            width: '28px',
            height: '100%',
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }
        }, Ketor.ui.icon('split-horizontal', { size: 16 })),
        canCloseGroup
          ? e('button', {
              type: 'button',
              className: 'icon-btn',
              onClick: handleCloseGroup,
              title: 'Close Group',
              style: {
                width: '28px',
                height: '100%',
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }
            }, Ketor.ui.icon('close', { size: 14 }))
          : null
      ),
      e('div', { className: 'kt-editor-content' },
        activeTab
          ? renderTabContent(activeTab, group)
          : e(KetorWelcome, {
              onAction: props.onWelcomeAction
            })
      )
    );
  }

  /* ============================================================
     KetorWelcome -- welcome screen for empty editor
     ============================================================ */
  function KetorWelcome(props) {
    var onAction = props.onAction || function () { };

    var actions = [
      { id: 'load-rom', label: 'Load ROM', hint: 'Open a ROM file (.nes, .sfc, .gba, .nds, ...)' },
      { id: 'open-project', label: 'Open Project', hint: 'Restore a saved .ketor project' },
      { id: 'recent-files', label: 'Recent Files', hint: 'Resume from where you left off' }
    ];

    var walkthrough = [
      { icon: 'globe', title: 'Translate', desc: 'Extract text with a .tbl table, edit translations, auto-relocate overflow with pointer updates.' },
      { icon: 'file-binary', title: 'Hex Editor', desc: 'Byte-level inspection with sections, pointers, byte categories, and Monkey-Moore relative search.' },
      { icon: 'paintcan', title: 'Font & Graphics', desc: 'Auto-detect font tiles, edit pixels, manage palettes, per-console BPP presets.' },
      { icon: 'package', title: 'Patch & Export', desc: 'Generate IPS patches, export modified ROM, import/export project state.' },
      { icon: 'beaker', title: 'Tests', desc: 'Unit test suite plus preview pipeline checks. Validate every workflow before shipping.' },
      { icon: 'wand', title: 'Free Translation', desc: 'MyMemory → Google (unofficial) → LibreTranslate → Apertium. Custom API keys supported.' }
    ];

    return e('div', { className: 'kt-editor-empty' },
      e('div', { className: 'kt-editor-empty-title' }, 'Ketor'),
      e('div', { className: 'kt-editor-empty-hint' },
        'Open a ROM or project to start. Ketor runs entirely in your browser -- no uploads, no servers.'
      ),
      e('div', {
        style: {
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: '8px'
        }
      },
        actions.map(function (a) {
          return e('button', {
            key: a.id,
            type: 'button',
            className: 'kt-btn',
            onClick: function () { onAction(a.id); },
            title: a.hint
          }, a.label);
        })
      ),
      e('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
          marginTop: '32px',
          maxWidth: '900px',
          width: '100%'
        }
      },
        walkthrough.map(function (w) {
          return e('div', {
            key: w.title,
            style: {
              border: '1px solid var(--kt-widget-border-default)',
              borderRadius: '3px',
              padding: '12px',
              textAlign: 'left',
              background: 'var(--kt-sidebar-bg)'
            }
          },
            e('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
                color: 'var(--kt-editor-fg)'
              }
            },
              Ketor.ui.icon(w.icon, { size: 18 }),
              e('strong', { style: { fontSize: '13px' } }, w.title)
            ),
            e('div', {
              style: {
                fontSize: '11px',
                opacity: 0.7,
                lineHeight: 1.5
              }
            }, w.desc)
          );
        })
      )
    );
  }

  /* ============================================================
     KetorEditorArea
     ============================================================ */
  function KetorEditorArea(props) {
    var groups = props.groups || [];
    var activeGroupId = props.activeGroupId;
    var renderTabContent = props.renderTabContent;
    var onActivateTab = props.onActivateTab || function () { };
    var onCloseTab = props.onCloseTab || function () { };
    var onSplit = props.onSplit || function () { };
    var onCloseGroup = props.onCloseGroup || function () { };
    var onWelcomeAction = props.onWelcomeAction || function () { };

    var canCloseGroup = groups.length > 1;

    return e('div', { className: 'kt-editor-groups' },
      groups.map(function (group) {
        return e(KetorEditorGroup, {
          key: group.id,
          group: group,
          isActiveGroup: group.id === activeGroupId,
          renderTabContent: renderTabContent,
          onActivateTab: onActivateTab,
          onCloseTab: onCloseTab,
          onSplit: onSplit,
          onCloseGroup: function () { onCloseGroup(group.id); },
          canCloseGroup: canCloseGroup,
          onWelcomeAction: onWelcomeAction
        });
      })
    );
  }

  Ketor.ui.KetorEditorArea = KetorEditorArea;
  Ketor.ui.KetorEditorGroup = KetorEditorGroup;
  Ketor.ui.KetorTab = KetorTab;
  Ketor.ui.KetorWelcome = KetorWelcome;

})(window);