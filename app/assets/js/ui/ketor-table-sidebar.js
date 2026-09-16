/* ============================================================
   Ketor - Table Activity Sidebar
   ------------------------------------------------------------
   Monkey-Moore style search settings + actions.
   ============================================================ */

/* ============================================================
   Ketor - Table Sidebar (v3, Monkey-Moore layout)
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
      e('span', { style: { flex: '0 0 auto', opacity: 0.75, minWidth: 52 } }, props.label),
      e('div', { style: { flex: 1, minWidth: 0 } }, props.children)
    );
  }

  function TableSidebar() {
    var t = K.table.useTable();

    var onKeyword = uC(function (ev) { K.table.setKeyword(ev.target.value); }, []);
    var onWildChar = uC(function (ev) { K.table.setWildcardChar(ev.target.value); }, []);
    var onHistory = uC(function (ev) {
      var v = ev.target.value;
      if (v) K.table.setKeyword(v);
    }, []);
    var onSearch = uC(function () { K.table.runSearch(); }, []);
    var onLoadFile = uC(function () {
      var inp = document.getElementById('kt-input-table');
      if (inp) inp.click();
    }, []);

    return e('div', { style: { paddingBottom: 16 } },

      e(Section, { title: 'Search Parameters' },
        // Mode
        e('div', { style: { display: 'flex', gap: 8, marginBottom: 8 } },
          e('label', { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' } },
            e('input', {
              type: 'radio',
              name: 'kt-mm-mode',
              checked: t.searchMode === 'relative',
              onChange: function () { K.table.setSearchMode('relative'); }
            }),
            'Relative'
          ),
          e('label', { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' } },
            e('input', {
              type: 'radio',
              name: 'kt-mm-mode',
              checked: t.searchMode === 'value-scan',
              onChange: function () { K.table.setSearchMode('value-scan'); }
            }),
            'Value Scan'
          )
        ),

        // Keyword
        e('textarea', {
          className: 'kt-textarea',
          placeholder: t.searchMode === 'value-scan'
            ? 'Values e.g., 41 42 43'
            : 'Text in-game e.g., My3name3s3Deepseek',
          value: t.keyword,
          onChange: onKeyword,
          rows: 2,
          style: { minHeight: 48, fontFamily: 'var(--kt-font-mono)', fontSize: 12, marginBottom: 6 }
        }),

        // History dropdown
        t.searchHistory.length > 0 ? e('select', {
          className: 'kt-select',
          style: { fontSize: 11, marginBottom: 6 },
          value: '',
          onChange: onHistory
        },
          e('option', { value: '' }, 'History (' + t.searchHistory.length + ')'),
          t.searchHistory.map(function (h, i) {
            return e('option', { key: 'h' + i, value: h }, h);
          })
        ) : null,

        // Search button
        e('button', {
          type: 'button',
          className: 'kt-btn',
          style: { width: '100%', marginBottom: 8 },
          onClick: onSearch,
          disabled: t.isSearching || !t.romBytes || !String(t.keyword || '').trim()
        }, t.isSearching ? 'Searching...' : 'Search'),

        // Wildcard checkbox + char
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 11 } },
          e('label', { style: { display: 'flex', alignItems: 'center', gap: 4, flex: 1 } },
            e('input', {
              type: 'checkbox',
              checked: t.wildcardEnabled,
              onChange: function (ev) { K.table.setWildcardEnabled(ev.target.checked); }
            }),
            'Enable wildcards'
          ),
          e('input', {
            type: 'text',
            value: t.wildcardChar,
            onChange: onWildChar,
            maxLength: 1,
            disabled: !t.wildcardEnabled,
            style: {
              width: 28, textAlign: 'center', fontFamily: 'var(--kt-font-mono)',
              background: 'var(--kt-input-bg)', color: 'var(--kt-input-fg)',
              border: '1px solid var(--kt-input-border)', borderRadius: 2,
              padding: '2px 4px', fontSize: 12
            }
          })
        ),

        // Byte order (8-bit / 16-bit) -- inline
        e('div', { style: { display: 'flex', gap: 8, alignItems: 'center', padding: '3px 0', fontSize: 11 } },
          e('label', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
            e('input', {
              type: 'radio', name: 'kt-mm-bw',
              checked: t.byteWidth === 8,
              onChange: function () { K.table.setByteWidth(8); }
            }),
            '8-bit'
          ),
          e('label', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
            e('input', {
              type: 'radio', name: 'kt-mm-bw',
              checked: t.byteWidth === 16,
              onChange: function () { K.table.setByteWidth(16); }
            }),
            '16-bit'
          )
        )
      ),

      e(Section, { title: 'Advanced' },
        e('button', {
          type: 'button',
          className: 'kt-btn small',
          style: { width: '100%', marginBottom: t.advancedOpen ? 8 : 0 },
          onClick: function () { K.table.toggleAdvanced(); }
        }, t.advancedOpen ? 'Hide Advanced' : 'Show Advanced'),

        t.advancedOpen ? e('div', null,
          e(Row, { label: 'Charset:' },
            e('select', {
              className: 'kt-select',
              value: t.charset,
              onChange: function (ev) { K.table.setCharset(ev.target.value); },
              style: { fontSize: 11 }
            },
              e('option', { value: 'ASCII' }, 'ASCII'),
              e('option', { value: 'SHIFT-JIS' }, 'Shift-JIS'),
              e('option', { value: 'UNICODE' }, 'Unicode'),
              e('option', { value: 'CUSTOM' }, 'Custom')
            )
          ),
          t.byteWidth === 16 ? e(Row, { label: 'Byte order:' },
            e('select', {
              className: 'kt-select',
              value: t.endianness,
              onChange: function (ev) { K.table.setEndianness(ev.target.value); },
              style: { fontSize: 11 }
            },
              e('option', { value: 'little' }, 'Little (LE)'),
              e('option', { value: 'big' }, 'Big (BE)')
            )
          ) : null
        ) : null
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
          padding: '8px 12px', fontSize: 11,
          color: 'var(--kt-sidebar-fg)', opacity: 0.8,
          borderTop: '1px solid var(--kt-widget-border-default)',
          marginTop: 8, wordBreak: 'break-word'
        }
      }, t.status) : null
    );
  }

  K.ui.registerSidebarProvider('table', TableSidebar);
})(window);