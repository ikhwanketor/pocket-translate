/* ============================================================
   Ketor -- Activity Bar
   ------------------------------------------------------------
   VS Code-style activity bar (48px wide icon strip).
   - Click item to activate
   - Active state shows left border accent
   - Badge support (numeric)
   - Optional bottom section for settings/account icons

   Props:
   - items: Array<{ id, icon, tooltip, badge }>
   - activeId: string
   - onActivate: (id) => void
   - bottomItems: Array<{ id, icon, tooltip }> (optional)
   - onBottomActivate: (id) => void (optional)
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.ui = Ketor.ui || {};

  var React = global.React;
  if (!React) return;
  var e = React.createElement;

  function ActivityItem(props) {
    var item = props.item;
    var isActive = props.activeId === item.id;
    return e('button', {
      type: 'button',
      className: 'kt-activity-item' + (isActive ? ' active' : ''),
      title: item.tooltip || item.id,
      'aria-label': item.tooltip || item.id,
      'aria-pressed': isActive,
      onClick: function () { props.onActivate(item.id); }
    },
      Ketor.ui.icon(item.icon, { size: 24 }),
      item.badge != null && item.badge !== 0
        ? e('span', { className: 'badge' }, String(item.badge).slice(0, 3))
        : null
    );
  }

  function KetorActivityBar(props) {
    var items = props.items || [];
    var bottomItems = props.bottomItems || [];
    var activeId = props.activeId;
    var onActivate = props.onActivate || function () { };
    var onBottomActivate = props.onBottomActivate || function () { };

    return e('nav', {
      className: 'kt-activitybar',
      role: 'navigation',
      'aria-label': 'Activity Bar'
    },
      items.map(function (item) {
        return e(ActivityItem, {
          key: item.id,
          item: item,
          activeId: activeId,
          onActivate: onActivate
        });
      }),
      bottomItems.length > 0
        ? e('div', { className: 'kt-activitybar-bottom' },
            bottomItems.map(function (item) {
              return e(ActivityItem, {
                key: item.id,
                item: item,
                activeId: activeId,
                onActivate: onBottomActivate
              });
            })
          )
        : null
    );
  }

  // Default activity bar items for Ketor
  Ketor.ui.DEFAULT_ACTIVITY_ITEMS = [
    { id: 'translate', icon: 'globe', tooltip: 'Translate (ROM text + table)' },
    { id: 'hex', icon: 'file-binary', tooltip: 'Hex Editor (bytes + pointers)' },
    { id: 'font', icon: 'paintcan', tooltip: 'Font & Graphics (tiles + palette)' },
    { id: 'patch', icon: 'package', tooltip: 'Patch & Export (IPS, ROM)' },
    { id: 'tests', icon: 'beaker', tooltip: 'Tests (unit + pipeline)' }
  ];

  Ketor.ui.DEFAULT_ACTIVITY_BOTTOM = [
    { id: 'account', icon: 'account', tooltip: 'Account' },
    { id: 'settings', icon: 'settings', tooltip: 'Settings' }
  ];

  Ketor.ui.KetorActivityBar = KetorActivityBar;

})(window);