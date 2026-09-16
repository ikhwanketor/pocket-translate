/* Ketor Translate Sidebar - registers provider for 'translate' activity */
(function (global) {
  'use strict';
  var K = global.Ketor = global.Ketor || {};
  K.ui = K.ui || {};
  var R = global.React;
  if (!R) return;
  var e = R.createElement;
  var uC = R.useCallback;

  function Section(props) {
    return e('div', { className: 'kt-sidebar-section' },
      e('div', { className: 'kt-sidebar-section-header' }, props.title),
      e('div', { className: 'kt-sidebar-section-body', style: { padding: '6px 12px 12px 12px' } },
        props.children)
    );
  }

  function Row(props) {
    return e('div', {
      style: {
        display: 'flex', justifyContent: 'space-between',
        fontSize: '11px', padding: '3px 0',
        color: 'var(--kt-sidebar-fg)'
      }
    },
      e('span', { style: { opacity: 0.7 } }, props.label),
      e('span', { style: { color: 'var(--kt-editor-fg)' } }, props.value)
    );
  }

  function formatBytes(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
    return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  function TranslateSidebar() {
    var t = K.translate.useTranslate();

    var onLoadTable = uC(function () {
      var inp = document.querySelector('[data-ketor-role="table"]');
      if (inp) inp.click();
    }, []);

    var onExtract = uC(function () { K.translate.extractTexts(); }, []);
    var onBuild = uC(function () { K.translate.buildModifiedRom(); }, []);
    var onExport = uC(function () { K.translate.downloadModifiedRom(); }, []);
    var onExportCsv = uC(function () { K.translate.exportCsv(); }, []);
    var onImportCsv = uC(function () {
      var inp = document.querySelector('[data-ketor-role="csv"]');
      if (inp) inp.click();
    }, []);

    return e('div', { style: { paddingBottom: 12 } },
      e(Section, { title: 'ROM' },
        t.romName
          ? e('div', null,
              e(Row, { label: 'Name', value: t.romName }),
              e(Row, { label: 'Size', value: formatBytes(t.romSize) }),
              e(Row, { label: 'System', value: t.romSystem || '?' })
            )
          : e('div', { className: 'kt-text-dim kt-text-small' },
              'No ROM loaded. Use File > Load ROM.')
      ),

      e(Section, { title: 'Table' },
        t.tableData
          ? e('div', null,
              e(Row, { label: 'Name', value: t.tableData.name }),
              e(Row, { label: 'Entries', value: String(t.tableData.entryCount) }),
              e('button', {
                type: 'button', className: 'kt-btn small',
                style: { marginTop: 8, width: '100%' },
                onClick: onLoadTable
              }, 'Reload Table')
            )
          : e('button', {
              type: 'button', className: 'kt-btn small',
              style: { width: '100%' },
              onClick: onLoadTable,
              disabled: !t.romName
            }, 'Load Table (.tbl)')
      ),

      e(Section, { title: 'Extract' },
        e('div', { style: { fontSize: 11, color: 'var(--kt-sidebar-fg)' } },
          'Options',
          e('div', { style: { marginTop: 6 } },
            e('label', { style: { display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' } },
              e('input', {
                type: 'checkbox',
                checked: t.options.asciiFallback,
                onChange: function (ev) { K.translate.setOptions({ asciiFallback: ev.target.checked }); }
              }),
              'ASCII fallback'
            ),
            e('label', { style: { display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' } },
              e('input', {
                type: 'checkbox',
                checked: t.options.usePaddingByte,
                onChange: function (ev) { K.translate.setOptions({ usePaddingByte: ev.target.checked }); }
              }),
              'DWE padding'
            ),
            e('label', { style: { display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' } },
              e('input', {
                type: 'checkbox',
                checked: t.options.enableDteMteCompression,
                onChange: function (ev) { K.translate.setOptions({ enableDteMteCompression: ev.target.checked }); }
              }),
              'DTE/MTE compression'
            )
          )
        ),
        e('button', {
          type: 'button', className: 'kt-btn small',
          style: { marginTop: 8, width: '100%' },
          onClick: onExtract,
          disabled: t.isBusy || !t.romBytes || !t.tableData
        }, t.isBusy ? 'Working...' : 'Extract Texts')
      ),

      t.texts.length > 0 ? e(Section, { title: 'Build' },
        e('button', {
          type: 'button', className: 'kt-btn small',
          style: { width: '100%' },
          onClick: onBuild,
          disabled: t.isBusy
        }, t.isBusy ? 'Building...' : 'Build Modified ROM'),
        t.modifiedRom ? e('button', {
          type: 'button', className: 'kt-btn small',
          style: { marginTop: 6, width: '100%' },
          onClick: onExport
        }, 'Download ROM (' + formatBytes(t.modifiedRom.length) + ')') : null
      ) : null,

      t.texts.length > 0 ? e(Section, { title: 'Translation I/O' },
        e('button', {
          type: 'button', className: 'kt-btn small',
          style: { width: '100%' },
          onClick: onExportCsv
        }, 'Export CSV'),
        e('button', {
          type: 'button', className: 'kt-btn small',
          style: { marginTop: 6, width: '100%' },
          onClick: onImportCsv
        }, 'Import CSV')
      ) : null,

      t.status ? e('div', {
        style: {
          padding: '8px 12px',
          fontSize: 11,
          color: 'var(--kt-sidebar-fg)',
          opacity: 0.8,
          borderTop: '1px solid var(--kt-widget-border-default)',
          marginTop: 8
        }
      }, t.status) : null
    );
  }

  K.ui.registerSidebarProvider('translate', TranslateSidebar);
})(window);