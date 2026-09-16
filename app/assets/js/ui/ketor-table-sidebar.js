/* ============================================================
   Ketor - Table Activity Sidebar
   ------------------------------------------------------------
   Monkey-Moore style search settings + actions.
   ============================================================ */

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
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '3px 0', fontSize: 11, color: 'var(--kt-sidebar-fg)'
      }
    },
      e('span', { style: { flex: '0 0 auto', opacity: 0.75 } }, props.label),
      e('div', { style: { flex: 1, minWidth: 0 } }, props.children)
    );
  }

  function TableSidebar() {
    var t = K.table.useTable();

    var onSearchText = uC(function (ev) {
      K.table.setSearchText(ev.target.value);
    }, []);

    var onHistoryChange = uC(function (ev) {
      var v = ev.target.value;
      if (v) K.table.setSearchText(v);
    }, []);

    var onRunSearch = uC(function () {
      K.table.runSearch();
    }, []);

    var onLoadFile = uC(function () {
      var inp = document.getElementById('kt-input-table');
      if (inp) inp.click();
    }, []);

    var onClear = uC(function () {
      K.table.clearResults();
    }, []);

    return e('div', { style: { paddingBottom: 16 } },

      e(Section, { title: 'Search' },
        e('textarea', {
          className: 'kt-textarea',
          placeholder: 'Text in-game e.g., PRESS START',
          value: t.searchText,
          onChange: onSearchText,
          rows: 2,
          style: { minHeight: 44, fontFamily: 'var(--kt-font-mono)', fontSize: 12 }
        }),

        t.searchHistory.length > 0 ? e('select', {
          className: 'kt-select',
          style: { marginTop: 6, fontSize: 11 },
          value: '',
          onChange: onHistoryChange
        },
          e('option', { value: '' }, 'History (' + t.searchHistory.length + ')'),
          t.searchHistory.map(function (h, i) {
            return e('option', { key: 'h' + i, value: h }, h);
          })
        ) : null,

        e('div', { style: { marginTop: 10 } },
          e('div', { style: { fontSize: 10, textTransform: 'uppercase', opacity: 0.6, marginBottom: 4 } }, 'Method'),
          e('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap' } },
            ['relative', 'value-scan', 'normal'].map(function (m) {
              var lbl = m === 'relative' ? 'Relative' : m === 'value-scan' ? 'Value Scan' : 'Normal';
              return e('button', {
                key: m,
                type: 'button',
                className: 'kt-btn small' + (t.method === m ? ' active' : ''),
                style: {
                  background: t.method === m ? 'var(--kt-button-bg)' : 'transparent',
                  color: t.method === m ? '#fff' : 'inherit',
                  border: '1px solid var(--kt-input-border)'
                },
                onClick: function () { K.table.setMethod(m); }
              }, lbl);
            })
          )
        ),

        e('div', { style: { marginTop: 8 } },
          e(Row, { label: 'Charset:' },
            e('select', {
              className: 'kt-select',
              value: t.charset,
              onChange: function (ev) { K.table.setCharset(ev.target.value); },
              style: { fontSize: 11 }
            },
              e('option', { value: 'ASCII' }, 'ASCII'),
              e('option', { value: 'SHIFT-JIS' }, 'Shift-JIS'),
              e('option', { value: 'UNICODE' }, 'Unicode (16-bit)'),
              e('option', { value: 'CUSTOM' }, 'Custom')
            )
          ),
          e(Row, { label: 'Byte:' },
            e('select', {
              className: 'kt-select',
              value: String(t.byteWidth),
              onChange: function (ev) { K.table.setByteWidth(parseInt(ev.target.value, 10)); },
              style: { fontSize: 11 }
            },
              e('option', { value: '8' }, '8-bit'),
              e('option', { value: '16' }, '16-bit')
            )
          ),
          t.byteWidth === 16 ? e(Row, { label: 'Endian:' },
            e('select', {
              className: 'kt-select',
              value: t.endianness,
              onChange: function (ev) { K.table.setEndianness(ev.target.value); },
              style: { fontSize: 11 }
            },
              e('option', { value: 'little' }, 'Little (LE)'),
              e('option', { value: 'big' }, 'Big (BE)')
            )
          ) : null,
          e('label', { style: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 11 } },
            e('input', {
              type: 'checkbox',
              checked: t.matchCase,
              onChange: function (ev) { K.table.setMatchCase(ev.target.checked); }
            }),
            'Match case'
          ),
          e('label', { style: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 11 } },
            e('input', {
              type: 'checkbox',
              checked: t.wildcard,
              onChange: function (ev) { K.table.setWildcard(ev.target.checked); }
            }),
            'Use wildcards (* ?)'
          )
        ),

        e('button', {
          type: 'button',
          className: 'kt-btn',
          style: { marginTop: 10, width: '100%' },
          onClick: onRunSearch,
          disabled: t.isSearching || !t.romBytes || !t.searchText.trim()
        }, t.isSearching ? 'Searching...' : 'Search'),

        t.candidates.length > 0 ? e('button', {
          type: 'button',
          className: 'kt-btn small',
          style: { marginTop: 6, width: '100%' },
          onClick: onClear
        }, 'Clear results (' + t.candidates.length + ')') : null
      ),

      e(Section, { title: 'Load .tbl' },
        e('button', {
          type: 'button',
          className: 'kt-btn small',
          style: { width: '100%' },
          onClick: onLoadFile
        }, 'Load .tbl file')
      ),

      t.status ? e('div', {
        style: {
          padding: '8px 12px',
          fontSize: 11,
          color: 'var(--kt-sidebar-fg)',
          opacity: 0.8,
          borderTop: '1px solid var(--kt-widget-border-default)',
          marginTop: 8,
          wordBreak: 'break-word'
        }
      }, t.status) : null
    );
  }

  K.ui.registerSidebarProvider('table', TableSidebar);
})(window);