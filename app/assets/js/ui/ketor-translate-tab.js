/* Ketor Translate Tab - registers tab provider for 'translate' kind */
(function (global) {
  'use strict';
  var K = global.Ketor = global.Ketor || {};
  K.ui = K.ui || {};
  var R = global.React;
  if (!R) return;
  var e = R.createElement;
  var uS = R.useState;
  var uC = R.useCallback;
  var uM = R.useMemo;
  var uE = R.useEffect;
  var uR = R.useRef;

  // ---- Text item row ----
  function TextRow(props) {
    var row = props.row;
    var isSelected = props.isSelected;
    var [local, setLocal] = uS(row.translatedText || '');
    var editingRef = uR(false);
    var rowRef = uR(null);

    uE(function () {
      if (!editingRef.current) setLocal(row.translatedText || '');
    }, [row.translatedText, row.id]);

    // Byte length estimation
    var byteLen = uM(function () {
      var text = local || '';
      if (!text) return 0;
      // Simple: table has single-byte, +1 per char (overestimate for 2-byte)
      var hasMulti = props.tableData && props.tableData.hasMultiByte;
      if (hasMulti) return text.length * 2;
      return text.length;
    }, [local, props.tableData]);

    var originalLen = row.byteLength || 0;
    var overflow = byteLen > originalLen && originalLen > 0;

    var onBlur = uC(function () {
      editingRef.current = false;
      if ((row.translatedText || '') !== local) {
        K.translate.updateTranslation(row.id, local);
      }
    }, [local, row.id, row.translatedText]);

    var onFocus = uC(function () {
      editingRef.current = true;
      if (props.onSelect) props.onSelect(row.id);
    }, [row.id, props.onSelect]);

    var onAuto = uC(function () {
      K.translate.autoTranslateText(row.id);
    }, [row.id]);

    var onOpenHex = uC(function () {
      if (props.onOpenHex) props.onOpenHex(row);
    }, [row, props.onOpenHex]);

    return e('div', {
      ref: rowRef,
      className: 'kt-text-item' + (isSelected ? ' selected' : ''),
      style: {
        border: '1px solid ' + (isSelected ? 'var(--kt-focus-border)' : 'var(--kt-widget-border-default)'),
        borderRadius: 4,
        padding: 10,
        marginBottom: 8,
        background: 'var(--kt-sidebar-bg)'
      }
    },
      e('div', {
        style: { fontSize: 10, color: 'var(--kt-input-placeholder-fg)', marginBottom: 6 }
      }, 'ID ' + row.id + ' | ' + (row.offset || '') + ' | ' + (row.textType || 'text')),

      e('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          alignItems: 'stretch'
        }
      },
        e('div', {
          style: {
            border: '1px solid var(--kt-widget-border-default)',
            borderRadius: 3,
            padding: 6,
            background: 'var(--kt-editor-bg)'
          }
        },
          e('div', { style: { fontSize: 9, textTransform: 'uppercase', opacity: 0.5, marginBottom: 4 } }, 'Original'),
          e('pre', {
            style: {
              margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontFamily: 'var(--kt-font-mono)', fontSize: 12, lineHeight: 1.4,
              color: 'var(--kt-editor-fg)'
            }
          }, row.originalText)
        ),
        e('div', {
          style: {
            border: '1px solid var(--kt-widget-border-default)',
            borderRadius: 3,
            padding: 6,
            background: 'var(--kt-editor-bg)'
          }
        },
          e('div', { style: { fontSize: 9, textTransform: 'uppercase', opacity: 0.5, marginBottom: 4 } }, 'Translation'),
          e('textarea', {
            value: local,
            onChange: function (ev) { setLocal(ev.target.value); },
            onFocus: onFocus,
            onBlur: onBlur,
            placeholder: 'Enter translation...',
            style: {
              width: '100%', minHeight: 60, background: 'var(--kt-input-bg)',
              color: 'var(--kt-input-fg)',
              border: '1px solid var(--kt-input-border)',
              borderRadius: 2, padding: 6,
              fontFamily: 'var(--kt-font-mono)', fontSize: 12,
              resize: 'vertical'
            }
          })
        )
      ),

      e('div', {
        style: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 6, fontSize: 10
        }
      },
        e('div', {
          style: {
            color: overflow ? 'var(--kt-error-fg)' : 'var(--kt-input-placeholder-fg)'
          }
        }, overflow
            ? 'Overflow: ' + byteLen + '/' + originalLen + ' bytes'
            : (local ? byteLen + '/' + originalLen + ' bytes' : '')),
        e('div', { style: { display: 'flex', gap: 4 } },
          e('button', {
            type: 'button', className: 'kt-btn small',
            onClick: onAuto,
            disabled: !row.originalText
          }, 'Auto'),
          e('button', {
            type: 'button', className: 'kt-btn small',
            onClick: onOpenHex
          }, 'Hex')
        )
      )
    );
  }

  // ---- Main tab ----
  function TranslateTab() {
    var t = K.translate.useTranslate();

    var filtered = uM(function () {
      var f = (t.filter || '').trim().toLowerCase();
      if (!f) return t.texts;
      return t.texts.filter(function (row) {
        var o = (row.originalText || '').toLowerCase();
        var tr = (row.translatedText || '').toLowerCase();
        var off = (row.offset || '').toLowerCase();
        var id = String(row.id);
        return o.indexOf(f) >= 0 || tr.indexOf(f) >= 0
          || off.indexOf(f) >= 0 || id.indexOf(f) >= 0;
      });
    }, [t.texts, t.filter]);

    var total = filtered.length;
    var totalPages = Math.max(1, Math.ceil(total / t.perPage));
    var page = Math.min(t.page, totalPages);
    var slice = filtered.slice((page - 1) * t.perPage, page * t.perPage);

    var stats = uM(function () {
      var done = 0;
      for (var i = 0; i < t.texts.length; i++) {
        if ((t.texts[i].translatedText || '').trim()) done++;
      }
      return { total: t.texts.length, done: done };
    }, [t.texts]);

    var onOpenHex = uC(function (row) {
      // Future: focus hex editor. For now just select.
      K.translate.selectText(row.id);
    }, []);

    if (t.texts.length === 0) {
      return e('div', { className: 'kt-activity-placeholder' },
        e('div', { className: 'ap-title' }, 'Translation'),
        e('div', { className: 'ap-hint' },
          t.romName
            ? (t.tableData
                ? 'Click "Extract Texts" in the sidebar to begin.'
                : 'Load a .tbl table in the sidebar to enable extraction.')
            : 'Load a ROM first from File menu.')
      );
    }

    return e('div', {
      style: {
        display: 'flex', flexDirection: 'column',
        height: '100%', minHeight: 0, overflow: 'hidden'
      }
    },
      e('div', {
        style: {
          padding: '8px 12px',
          borderBottom: '1px solid var(--kt-widget-border-default)',
          display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
          flex: '0 0 auto'
        }
      },
        e('input', {
          type: 'text',
          className: 'kt-input',
          placeholder: 'Search original, translation, offset, or ID...',
          value: t.filter,
          onChange: function (ev) { K.translate.setFilter(ev.target.value); },
          style: { flex: '1 1 220px', minWidth: 180 }
        }),
        e('div', {
          style: {
            fontSize: 11, color: 'var(--kt-sidebar-fg)',
            display: 'flex', gap: 12, whiteSpace: 'nowrap'
          }
        },
          e('span', null, 'Total: ', e('strong', null, stats.total)),
          e('span', null, 'Done: ', e('strong', null, stats.done)),
          e('span', null, 'Progress: ', e('strong', null,
            stats.total ? Math.round(stats.done / stats.total * 100) + '%' : '0%'))
        )
      ),

      e('div', {
        style: {
          flex: '1 1 auto', minHeight: 0, overflowY: 'auto',
          padding: 12
        }
      }, slice.map(function (row) {
        return e(TextRow, {
          key: row.id,
          row: row,
          isSelected: t.selectedTextId === row.id,
          tableData: t.tableData,
          onSelect: K.translate.selectText,
          onOpenHex: onOpenHex
        });
      })),

      e('div', {
        style: {
          flex: '0 0 auto',
          padding: '8px 12px',
          borderTop: '1px solid var(--kt-widget-border-default)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6
        }
      },
        e('button', {
          type: 'button', className: 'kt-btn small',
          onClick: function () { K.translate.setPage(1); },
          disabled: page <= 1
        }, '<<'),
        e('button', {
          type: 'button', className: 'kt-btn small',
          onClick: function () { K.translate.setPage(page - 1); },
          disabled: page <= 1
        }, '<'),
        e('span', { style: { fontSize: 11, padding: '0 8px' } },
          page + ' / ' + totalPages),
        e('button', {
          type: 'button', className: 'kt-btn small',
          onClick: function () { K.translate.setPage(page + 1); },
          disabled: page >= totalPages
        }, '>'),
        e('button', {
          type: 'button', className: 'kt-btn small',
          onClick: function () { K.translate.setPage(totalPages); },
          disabled: page >= totalPages
        }, '>>')
      )
    );
  }

  K.ui.registerTabProvider('translate', TranslateTab);
})(window);