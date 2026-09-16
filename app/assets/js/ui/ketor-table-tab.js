/* ============================================================
   Ketor - Table Activity Editor Tab
   ------------------------------------------------------------
   Left panel: candidate list (Offset / Values / Preview) +
               full preview with search bar + Apply .tbl
   Right panel: edit table (visual, 6 columns) +
                large Apply for ROM button
   ============================================================ */

/* ============================================================
   Ketor - Table Activity Tab (v3)
   ------------------------------------------------------------
   Left top:  Results (Offset | Values | Preview-in-game)
   Left bot:  Preview .tbl (hex=char) + Compare (loaded .tbl)
   Right:     Edit Table + Apply for ROM
   ============================================================ */

(function (global) {
  'use strict';
  var K = global.Ketor = global.Ketor || {};
  K.ui = K.ui || {};
  var R = global.React;
  if (!R) return;
  var e = R.createElement;
  var uC = R.useCallback;
  var uM = R.useMemo;

  function thStyle(w, align) {
    return {
      padding: '4px 6px', width: w, textAlign: align || 'center',
      borderBottom: '1px solid var(--kt-widget-border-default)',
      fontWeight: 600, fontSize: 10, textTransform: 'uppercase',
      color: 'var(--kt-sidebar-title-fg)'
    };
  }
  function tdStyle(align) {
    return {
      padding: '3px 6px', textAlign: align || 'center',
      borderBottom: '1px solid var(--kt-widget-border-default)',
      overflow: 'hidden'
    };
  }

  // ---- Results table (3 columns) ----
  function ResultsTable(props) {
    var results = props.results;
    var selectedIdx = props.selectedIdx;
    if (!results.length) {
      return e('div', {
        style: {
          padding: 20, textAlign: 'center', fontStyle: 'italic',
          fontSize: 12, color: 'var(--kt-input-placeholder-fg)'
        }
      }, 'No results yet. Enter text in-game and click Search.');
    }
    return e('div', { style: { overflowX: 'auto', overflowY: 'auto', maxHeight: 240 } },
      e('table', {
        style: {
          width: '100%', borderCollapse: 'collapse',
          fontFamily: 'var(--kt-font-mono)', fontSize: 11
        }
      },
        e('thead', null,
          e('tr', { style: { background: 'var(--kt-sidebar-bg)', position: 'sticky', top: 0, zIndex: 2 } },
            e('th', { style: thStyle(90, 'left') }, 'Offset'),
            e('th', { style: thStyle(110, 'left') }, 'Values'),
            e('th', { style: thStyle(0, 'left') }, 'Preview')
          )
        ),
        e('tbody', null,
          results.map(function (r, idx) {
            var isSel = idx === selectedIdx;
            return e('tr', {
              key: 'r' + idx,
              onClick: function () { K.table.selectResult(idx); },
              style: {
                cursor: 'pointer',
                background: isSel ? 'var(--kt-list-active-selection-bg)' : (idx % 2 ? 'transparent' : 'rgba(255,255,255,0.02)')
              }
            },
              e('td', { style: tdStyle('left') }, '0x' + r.offset.toString(16).toUpperCase()),
              e('td', { style: tdStyle('left') }, r.valuesLabel || ''),
              e('td', {
                style: Object.assign(tdStyle('left'), {
                  maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', opacity: 0.85
                })
              }, r.preview)
            );
          })
        )
      )
    );
  }

  // ---- Preview .tbl (hex=char) ----
  function PreviewTbl(props) {
    var content = props.content;
    if (!content) {
      return e('div', {
        style: {
          padding: 12, fontStyle: 'italic', fontSize: 11,
          color: 'var(--kt-input-placeholder-fg)'
        }
      }, 'Select a result above to see its .tbl preview.');
    }
    return e('pre', {
      style: {
        margin: 0, padding: 8,
        background: 'var(--kt-editor-bg)',
        border: '1px solid var(--kt-widget-border-default)',
        borderRadius: 2,
        fontFamily: 'var(--kt-font-mono)', fontSize: 11,
        lineHeight: 1.5, color: 'var(--kt-editor-fg)',
        maxHeight: 180, overflow: 'auto',
        whiteSpace: 'pre-wrap', wordBreak: 'break-all'
      }
    }, content);
  }

  // ---- Compare view ----
  function CompareView(props) {
    var fileContent = props.fileContent;
    var previewContent = props.previewContent;
    if (!fileContent) return null;
    return e('div', {
      style: {
        marginTop: 8, padding: 6,
        border: '1px solid var(--kt-focus-border)',
        borderRadius: 3, background: 'var(--kt-editor-bg)'
      }
    },
      e('div', { style: { fontSize: 10, textTransform: 'uppercase', opacity: 0.75, marginBottom: 4 } }, 'Compare'),
      e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
        e('div', null,
          e('div', { style: { fontSize: 10, color: '#3794ff', marginBottom: 2 } }, 'Generated'),
          e('pre', {
            style: {
              margin: 0, padding: 4, background: 'var(--kt-sidebar-bg)',
              border: '1px solid var(--kt-widget-border-default)', borderRadius: 2,
              maxHeight: 140, overflow: 'auto', fontSize: 10,
              fontFamily: 'var(--kt-font-mono)', whiteSpace: 'pre-wrap'
            }
          }, previewContent || '(empty)')
        ),
        e('div', null,
          e('div', { style: { fontSize: 10, color: '#3794ff', marginBottom: 2 } }, 'Loaded'),
          e('pre', {
            style: {
              margin: 0, padding: 4, background: 'var(--kt-sidebar-bg)',
              border: '1px solid var(--kt-widget-border-default)', borderRadius: 2,
              maxHeight: 140, overflow: 'auto', fontSize: 10,
              fontFamily: 'var(--kt-font-mono)', whiteSpace: 'pre-wrap'
            }
          }, fileContent)
        )
      )
    );
  }

  // ---- Edit Table ----
  function EditTable(props) {
    var entries = props.entries;
    var isApplied = props.isApplied;

    function inputMini(w) {
      return {
        width: w, background: 'var(--kt-input-bg)', color: 'var(--kt-input-fg)',
        border: '1px solid var(--kt-input-border)', borderRadius: 2,
        padding: '2px 4px', fontFamily: 'var(--kt-font-mono)', fontSize: 11
      };
    }

    return e('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } },
      e('div', { style: { display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' } },
        e('button', { type: 'button', className: 'kt-btn small', onClick: function () { K.table.addEditEntry(); } }, '+ Add'),
        e('button', { type: 'button', className: 'kt-btn small', onClick: function () { K.table.sortEditTable(); }, disabled: entries.length < 2 }, 'Sort'),
        e('button', { type: 'button', className: 'kt-btn small', onClick: function () { K.table.downloadEditTable(); }, disabled: entries.length === 0 }, 'Download .tbl'),
        e('button', { type: 'button', className: 'kt-btn small btn-danger', onClick: function () { K.table.clearEditTable(); }, disabled: entries.length === 0 }, 'Clear')
      ),
      e('div', {
        style: {
          flex: 1, minHeight: 0, overflow: 'auto',
          border: '1px solid var(--kt-widget-border-default)',
          borderRadius: 2, background: 'var(--kt-editor-bg)'
        }
      },
        entries.length === 0
          ? e('div', { style: { padding: 16, textAlign: 'center', fontStyle: 'italic', fontSize: 11, color: 'var(--kt-input-placeholder-fg)' } },
              'Edit Table is empty. Apply preview or load a .tbl.')
          : e('table', { style: { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--kt-font-mono)', fontSize: 11 } },
              e('thead', null,
                e('tr', { style: { background: 'var(--kt-sidebar-bg)', position: 'sticky', top: 0, zIndex: 2 } },
                  e('th', { style: thStyle(28) }, '#'),
                  e('th', { style: thStyle(70, 'left') }, 'Hex'),
                  e('th', { style: thStyle(80, 'left') }, 'Char'),
                  e('th', { style: thStyle(80, 'left') }, 'Bytes'),
                  e('th', { style: thStyle(120, 'left') }, 'Comment'),
                  e('th', { style: thStyle(40) }, '')
                )
              ),
              e('tbody', null,
                entries.map(function (en, idx) {
                  return e('tr', { key: en.id, style: { background: idx % 2 ? 'transparent' : 'rgba(255,255,255,0.02)' } },
                    e('td', { style: tdStyle() }, idx + 1),
                    e('td', { style: tdStyle('left') },
                      e('input', {
                        type: 'text', value: en.hex,
                        onChange: function (ev) {
                          var v = ev.target.value.toUpperCase().replace(/[^0-9A-F]/g, '');
                          K.table.updateEditEntry(en.id, { hex: v });
                        },
                        style: inputMini(70)
                      })
                    ),
                    e('td', { style: tdStyle('left') },
                      e('input', {
                        type: 'text', value: en.char,
                        onChange: function (ev) {
                          K.table.updateEditEntry(en.id, { char: ev.target.value });
                        },
                        style: inputMini(80)
                      })
                    ),
                    e('td', { style: Object.assign(tdStyle('left'), { opacity: 0.6 }) }, en.bytes),
                    e('td', { style: tdStyle('left') },
                      e('input', {
                        type: 'text', value: en.comment || '', placeholder: 'note',
                        onChange: function (ev) { K.table.updateEditEntry(en.id, { comment: ev.target.value }); },
                        style: inputMini(120)
                      })
                    ),
                    e('td', { style: tdStyle() },
                      e('button', {
                        type: 'button', className: 'icon-btn',
                        style: { width: 22, height: 22, padding: 0 },
                        onClick: function () { K.table.removeEditEntry(en.id); },
                        title: 'Remove'
                      }, K.ui.icon('close', { size: 12 }))
                    )
                  );
                })
              )
            )
      ),
      e('button', {
        type: 'button',
        onClick: function () { K.table.applyForRom(); },
        disabled: entries.length === 0,
        style: {
          marginTop: 10, padding: '12px 16px',
          fontSize: 14, fontWeight: 600, width: '100%',
          background: isApplied ? '#16825d' : 'var(--kt-button-bg)',
          color: '#fff',
          border: '1px solid ' + (isApplied ? '#16825d' : 'var(--kt-button-bg)'),
          borderRadius: 3,
          cursor: entries.length === 0 ? 'not-allowed' : 'pointer',
          opacity: entries.length === 0 ? 0.5 : 1
        }
      }, isApplied ? '✓ Applied for ROM' : 'Apply for ROM')
    );
  }

  // ---- Main Tab ----
  function TableTab() {
    var t = K.table.useTable();

    var onLoadCompare = uC(function () {
      var inp = document.getElementById('kt-input-table-compare');
      if (inp) inp.click();
    }, []);

    var onApplyPreview = uC(function () { K.table.applyPreviewToEditTable(); }, []);

    if (!t.romBytes) {
      return e('div', { className: 'kt-activity-placeholder' },
        e('div', { className: 'ap-title' }, 'Table Workspace'),
        e('div', { className: 'ap-hint' }, 'Load a ROM first from File menu.')
      );
    }

    return e('div', {
      style: {
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        height: '100%', minHeight: 0, overflow: 'hidden', padding: 12
      }
    },
      // LEFT column
      e('div', {
        style: {
          display: 'flex', flexDirection: 'column', gap: 8,
          minHeight: 0, overflow: 'hidden'
        }
      },
        // Top: Results
        e('div', {
          style: {
            border: '1px solid var(--kt-widget-border-default)',
            borderRadius: 3, background: 'var(--kt-sidebar-bg)',
            padding: 10, overflow: 'hidden', flex: '0 0 auto'
          }
        },
          e('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, marginBottom: 6 } },
            'Results (' + t.results.length + ')'),
          e(ResultsTable, { results: t.results, selectedIdx: t.selectedResultIdx }),
          t.results.length > 0 ? e('button', {
            type: 'button', className: 'kt-btn small',
            style: { marginTop: 6 },
            onClick: function () { K.table.clearResults(); }
          }, 'Clear Results') : null
        ),

        // Bottom: Preview + Compare
        e('div', {
          style: {
            border: '1px solid var(--kt-widget-border-default)',
            borderRadius: 3, background: 'var(--kt-sidebar-bg)',
            padding: 10, overflow: 'auto', flex: '1 1 auto', minHeight: 0
          }
        },
          e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
            e('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 } },
              'Preview .tbl' + (t.compareFileName ? ' (vs ' + t.compareFileName + ')' : '')),
            e('div', { style: { display: 'flex', gap: 4 } },
              e('button', { type: 'button', className: 'kt-btn small', onClick: onLoadCompare }, 'Load .tbl to Compare'),
              t.compareFileName ? e('button', {
                type: 'button', className: 'kt-btn small btn-danger',
                onClick: function () { K.table.clearCompare(); }
              }, 'Clear Compare') : null
            )
          ),
          e(PreviewTbl, { content: t.previewTbl }),
          t.compareFileName ? e(CompareView, {
            fileContent: t.compareTbl,
            previewContent: t.previewTbl
          }) : null,
          t.previewTbl ? e('button', {
            type: 'button', className: 'kt-btn',
            style: { marginTop: 8, width: '100%' },
            onClick: onApplyPreview
          }, 'Apply .tbl to Edit Panel') : null
        )
      ),

      // RIGHT column: Edit Table
      e('div', {
        style: {
          display: 'flex', flexDirection: 'column', minHeight: 0,
          border: '1px solid var(--kt-widget-border-default)',
          borderRadius: 3, background: 'var(--kt-sidebar-bg)',
          padding: 10, overflow: 'hidden'
        }
      },
        e('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, marginBottom: 6 } },
          'Edit Table' + (t.editSource ? ' -- ' + t.editSource : '')),
        e(EditTable, { entries: t.editEntries, isApplied: t.isApplied })
      )
    );
  }

  K.ui.registerTabProvider('table', TableTab);
})(window);