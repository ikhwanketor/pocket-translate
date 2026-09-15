/* ============================================================
   Ketor -- Status Bar
   ------------------------------------------------------------
   VS Code-style status bar with clickable items.
   Left:  ROM name, system, ROM size
   Right: Progress, encoding, byte order, theme, notifications
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.ui = Ketor.ui || {};

  var React = global.React;
  if (!React) return;
  var e = React.createElement;
  var useCallback = React.useCallback;

  function StatusbarItem(props) {
    var item = props.item;
    var handleClick = useCallback(function () {
      if (item.command && Ketor.commands.hasCommand(item.command)) {
        Ketor.commands.executeCommand(item.command);
      } else if (typeof item.onClick === 'function') {
        item.onClick();
      }
    }, [item.command, item.onClick]);

    var className = 'kt-statusbar-item' + (item.clickable || item.command ? ' clickable' : '');

    return e(item.clickable || item.command ? 'button' : 'div', {
      type: item.clickable || item.command ? 'button' : undefined,
      className: className,
      onClick: handleClick,
      title: item.tooltip || item.label || ''
    },
      item.icon ? Ketor.ui.icon(item.icon, { size: 14 }) : null,
      item.label != null && item.label !== '' ? e('span', null, String(item.label)) : null
    );
  }

  function formatByteSize(bytes) {
    var n = Number(bytes) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function KetorStatusBar(props) {
    var romInfo = props.romInfo || null;
    var progress = props.progress || null;
    var encoding = props.encoding || null;
    var byteOrder = props.byteOrder || null;
    var theme = props.theme || 'dark-plus';
    var notificationCount = Number(props.notificationCount) || 0;
    var onThemeClick = props.onThemeClick || function () { };

    var leftItems = [];
    if (romInfo && romInfo.name) {
      leftItems.push({
        id: 'rom-name',
        icon: 'file',
        label: romInfo.name,
        tooltip: 'Loaded ROM -- click to focus Translate',
        command: 'ketor.view.showTranslate'
      });
      if (romInfo.system) {
        leftItems.push({
          id: 'system',
          label: romInfo.system,
          tooltip: 'Detected system'
        });
      }
      if (romInfo.size) {
        leftItems.push({
          id: 'size',
          label: formatByteSize(romInfo.size),
          tooltip: 'ROM size'
        });
      }
    } else {
      leftItems.push({
        id: 'no-rom',
        label: 'No ROM loaded',
        tooltip: 'Use File → Load ROM or Ctrl+O',
        command: 'ketor.file.loadRom'
      });
    }

    var rightItems = [];
    if (progress && progress.active) {
      rightItems.push({
        id: 'progress',
        icon: 'sync',
        label: progress.label || (Math.floor(progress.value || 0) + '%'),
        tooltip: 'Background task in progress',
        command: 'ketor.view.showBackgroundTasks'
      });
    }
    rightItems.push({
      id: 'encoding',
      label: encoding || 'UTF-8',
      tooltip: 'Text encoding'
    });
    rightItems.push({
      id: 'byte-order',
      label: byteOrder === 'big' ? 'BE' : (byteOrder === 'little' ? 'LE' : 'N/A'),
      tooltip: 'Pointer byte order'
    });
    rightItems.push({
      id: 'theme',
      icon: 'symbol-color',
      label: (theme || 'dark-plus').replace('dark-', '').replace(/-/g, ' '),
      tooltip: 'Change color theme',
      clickable: true,
      onClick: onThemeClick
    });
    if (notificationCount > 0) {
      rightItems.push({
        id: 'notifications',
        icon: 'info',
        label: notificationCount > 99 ? '99+' : notificationCount,
        tooltip: 'Notifications',
        clickable: true,
        onClick: function () { }
      });
    }

    return e('footer', { className: 'kt-statusbar', role: 'contentinfo' },
      leftItems.map(function (it) {
        return e(StatusbarItem, { key: it.id, item: it });
      }),
      e('div', { className: 'kt-statusbar-spacer' }),
      rightItems.map(function (it) {
        return e(StatusbarItem, { key: it.id, item: it });
      })
    );
  }

  Ketor.ui.KetorStatusBar = KetorStatusBar;

})(window);