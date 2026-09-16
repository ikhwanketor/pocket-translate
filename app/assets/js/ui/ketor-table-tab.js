/* ============================================================
   Ketor - Table Activity Editor Tab
   ------------------------------------------------------------
   Left panel: candidate list (Offset / Values / Preview) +
               full preview with search bar + Apply .tbl
   Right panel: edit table (visual, 6 columns) +
                large Apply for ROM button
   ============================================================ */

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

  // ---- Candidate List (Monkey-Moore layout) ----
  function CandidateList(props) {
    var candidates = props.candidates;
    var selectedId = props.selectedId;
    var compareIds = props.compareIds;

    if (!candidates.length) {
      return e('div', {
        style: {
          padding: 20, textAlign: 'center', color: 'var(--kt-input-placeholder-fg)',
          fontSize: 12, fontStyle: 'italic'
        }
      }, 'No candidates yet. Enter text in-game and click Search.');
    }

    return e('div', { style: { overflowX: 'auto', overflowY: 'auto', maxHeight: 280 } },
      e('table', {
        style: {
          width: '100%', borderCollapse: 'collapse',
          fontFamily: 'var(--kt-font-mono)', fontSize: 11
        }
      },
        e('thead', null,
          e('tr', { style: { background: 'var(--kt-sidebar-bg)', position: 'sticky', top: 0, zIndex: 2 } },
            e('th', { style: thStyle(28) }, 'Cmp'),
            e('th', { style: thStyle(28) }, 'Sel'),
            e('th', { style: thStyle(120), textAlign: 'left' }, 'Offset'),
            e('th', { style: thStyle(80), textAlign: 'left' }, 'Values'),
            e('th', { style: thStyle(200), textAlign: 'left' }, 'Preview')
          )
        ),
        e('tbody', null,
          candidates.map(function (c, idx) {
            var isSelected = c.id === selectedId;
            var isCompare = compareIds.indexOf(c.id) >= 0;
            return e('tr', {
              key: c.id,
              onClick: function () { K.table.selectCandidate(c.id); },
              style: {
                background: isSelected ? 'var(--kt-list-active-selection-bg)' : (idx % 2 ? 'transparent' : 'rgba(255,255,255,0.02)'),
                cursor: 'pointer'
              }
            },
              e('td', { style: tdStyle() },
                e('input', {
                  type: 'checkbox',
                  checked: isCompare,
                  onClick: function (ev) { ev.stopPropagation(); },
                  onChange: function () { K.table.toggleCompare(c.id); }
                })
              ),
              e('td', { style: tdStyle() },
                e('input', {
                  type: 'radio',
                  name: 'tbl-candidate-select',
                  checked: isSelected,
                  onClick: function (ev) { ev.stopPropagation(); },
                  onChange: function () { K.table.selectCandidate(c.id); }
                })
              ),
              e('td', { style: tdStyle('left') }, '0x' + c.offset.toString(16).toUpperCase()),
              e('td', { style: tdStyle('left') }, c.valuesLabel),
              e('td', {
                style: Object.assign(tdStyle('left'), {
                  maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', opacity: 0.75
                })
              }, c.previewShort)
            );
          })
        )
      )
    );
  }

  function thStyle(w) {
    return {
      padding: '4px 6px', width: w, textAlign: 'center',
      borderBottom: '1px solid var(--kt-widget-border-default)',
      fontWeight: 600, fontSize: 10, textTransform: 'uppercase',
      color: 'var(--kt-sidebar-title-fg)'
    };
  }
  function tdStyle(align) {
    return {
      padding: '3px 6px',
      textAlign: align || 'center',
      borderBottom: '1px solid var(--kt-widget-border-default)',
      overflow: 'hidden'
    };
  }

  // ---- Full Preview panel ----
  function FullPreview(props) {
    var candidate = props.candidate;
    var filter = props.filter;
    if (!candidate) {
      return e('div', {
        style: {
          padding: 12, fontSize: 11, fontStyle: 'italic',
          color: 'var(--kt-input-placeholder-fg)'
        }
      }, 'Select a candidate to preview the generated .tbl.');
    }
    var lines = candidate.previewFull.split('\n');
    var fLower = filter.trim().toLowerCase();
    var filtered = fLower ? lines.filter(function (l) {
      return l.toLowerCase().indexOf(fLower) >= 0;
    }) : lines;

    return e('div', { style: { display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 } },
      e('div', { style: { padding: '6px 8px', fontSize: 10, color: 'var(--kt-sidebar-fg)', opacity: 0.7 } },
        candidate.previewFull.length + ' chars, ' + lines.length + ' entries' +
        (fLower ? ' -- filtered to ' + filtered.length : '')),

      e('div', {
        style: {
          flex: 1, minHeight: 120, maxHeight: 220, overflow: 'auto',
          background: 'var(--kt-editor-bg)', border: '1px solid var(--kt-widget-border-default)',
          borderRadius: 2, padding: 6
        }
      },
        e('pre', {
          style: {
            margin: 0, fontSize: 11, lineHeight: 1.4,
            fontFamily: 'var(--kt-font-mono)', color: 'var(--kt-editor-fg)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all'
          }
        }, filtered.join('\n') || '(no matching lines)')
      )
    );
  }

  // ---- Compare panel ----
  function ComparePanel(props) {
    var ids = props.compareIds;
    var candidates = props.candidates;
    var list = ids.map(function (id) {
      for (var i = 0; i < candidates.length; i++) {
        if (candidates[i].id === id) return candidates[i];
      }
      return null;
    }).filter(Boolean);

    if (list.length < 2) return null;

    return e('div', {
      style: {
        padding: '6px 8px',
        border: '1px solid var(--kt-focus-border)',
        borderRadius: 3,
        background: 'var(--kt-editor-bg)',
        marginBottom: 8
      }
    },
      e('div', { style: { fontSize: 10, textTransform: 'uppercase', opacity: 0.7, marginBottom: 4 } }, 'Compare'),
      e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
        list.slice(0, 2).map(function (c) {
          return e('div', { key: c.id, style: { minWidth: 0 } },
            e('div', { style: { fontSize: 10, color: '#3794ff', marginBottom: 2 } },
              '0x' + c.offset.toString(16).toUpperCase() + ' -- ' + c.valuesLabel),
            e('div', {
              style: {
                maxHeight: 140, overflow: 'auto', background: 'var(--kt-sidebar-bg)',
                border: '1px solid var(--kt-widget-border-default)', borderRadius: 2,
                padding: 4, fontSize: 10
              }
            },
              e('pre', {
                style: {
                  margin: 0, whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--kt-font-mono)',
                  color: 'var(--kt-editor-fg)'
                }
              }, c.previewFull.substring(0, 800) + (c.previewFull.length > 800 ? '\n...' : ''))
            ),
            e('button', {
              type: 'button',
              className: 'kt-btn small',
              style: { marginTop: 4, width: '100%' },
              onClick: function () {
                K.table.selectCandidate(c.id);
                K.table.applySelectedToEditTable();
              }
            }, 'Choose this')
          );
        })
      )
    );
  }

  // ---- Edit Table (right panel) ----
  function EditTable(props) {
    var entries = props.entries;
    var isApplied = props.isApplied;

    return e('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } },
      e('div', { style: { display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' } },
        e('button', {
          type: 'button', className: 'kt-btn small',
          onClick: function () { K.table.addTableEntry(); }
        }, '+ Add'),
        e('button', {
          type: 'button', className: 'kt-btn small',
          onClick: function () { K.table.sortTable(); },
          disabled: entries.length < 2
        }, 'Sort'),
        e('button', {
          type: 'button', className: 'kt-btn small',
          onClick: function () { K.table.downloadTable(); },
          disabled: entries.length === 0
        }, 'Download .tbl'),
        e('button', {
          type: 'button', className: 'kt-btn small btn-danger',
          onClick: function () { K.table.clearTable(); },
          disabled: entries.length === 0
        }, 'Clear')
      ),

      e('div', {
        style: {
          flex: 1, minHeight: 0, overflow: 'auto',
          border: '1px solid var(--kt-widget-border-default)',
          borderRadius: 2, background: 'var(--kt-editor-bg)'
        }
      },
        entries.length === 0
          ? e('div', {
              style: {
                padding: 16, textAlign: 'center', fontStyle: 'italic',
                fontSize: 11, color: 'var(--kt-input-placeholder-fg)'
              }
            }, 'Edit Table is empty. Generate or load a .tbl first.')
          : e('table', {
              style: {
                width: '100%', borderCollapse: 'collapse',
                fontFamily: 'var(--kt-font-mono)', fontSize: 11
              }
            },
              e('thead', null,
                e('tr', { style: { background: 'var(--kt-sidebar-bg)', position: 'sticky', top: 0, zIndex: 2 } },
                  e('th', { style: thStyle(28) }, '#'),
                  e('th', { style: thStyle(70), textAlign: 'left' }, 'Hex'),
                  e('th', { style: thStyle(80), textAlign: 'left' }, 'Char'),
                  e('th', { style: thStyle(80), textAlign: 'left' }, 'Bytes'),
                  e('th', { style: thStyle(140), textAlign: 'left' }, 'Comment'),
                  e('th', { style: thStyle(50) }, '')
                )
              ),
              e('tbody', null,
                entries.map(function (en, idx) {
                  return e('tr', { key: en.id, style: { background: idx % 2 ? 'transparent' : 'rgba(255,255,255,0.02)' } },
                    e('td', { style: tdStyle() }, idx + 1),
                    e('td', { style: tdStyle('left') },
                      e('input', {
                        type: 'text',
                        value: en.hex,
                        onChange: function (ev) {
                          var v = ev.target.value.toUpperCase().replace(/[^0-9A-F]/g, '');
                          var bytes = (v.match(/.{1,2}/g) || []).join(' ');
                          K.table.updateTableEntry(en.id, { hex: v, bytes: bytes });
                        },
                        style: inputMini(70)
                      })
                    ),
                    e('td', { style: tdStyle('left') },
                      e('input', {
                        type: 'text',
                        value: en.char,
                        onChange: function (ev) {
                          K.table.updateTableEntry(en.id, { char: ev.target.value });
                        },
                        style: inputMini(80)
                      })
                    ),
                    e('td', { style: Object.assign(tdStyle('left'), { opacity: 0.6 }) }, en.bytes),
                    e('td', { style: tdStyle('left') },
                      e('input', {
                        type: 'text',
                        value: en.comment,
                        placeholder: 'note',
                        onChange: function (ev) {
                          K.table.updateTableEntry(en.id, { comment: ev.target.value });
                        },
                        style: inputMini(140)
                      })
                    ),
                    e('td', { style: tdStyle() },
                      e('button', {
                        type: 'button',
                        className: 'icon-btn',
                        style: { width: 22, height: 22, padding: 0 },
                        onClick: function () { K.table.removeTableEntry(en.id); },
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
          marginTop: 10,
          padding: '12px 16px',
          fontSize: 14,
          fontWeight: 600,
          width: '100%',
          background: isApplied ? '#16825d' : 'var(--kt-button-bg)',
          color: '#fff',
          border: '1px solid ' + (isApplied ? '#16825d' : 'var(--kt-button-bg)'),
          borderRadius: 3,
          cursor: entries.length === 0 ? 'not-allowed' : 'pointer',
          opacity: entries.length === 0 ? 0.5 : 1
        }
      }, isApplied ? '✓ Applied for ROM -- Ready to Extract' : 'Apply for ROM')
    );
  }

  function inputMini(w) {
    return {
      width: w, background: 'var(--kt-input-bg)', color: 'var(--kt-input-fg)',
      border: '1px solid var(--kt-input-border)', borderRadius: 2,
      padding: '2px 4px', fontFamily: 'var(--kt-font-mono)', fontSize: 11
    };
  }

  // ---- Main Tab ----
  function TableTab() {
    var t = K.table.useTable();

    var selectedCandidate = uM(function () {
      if (!t.selectedCandidateId) return null;
      for (var i = 0; i < t.candidates.length; i++) {
        if (t.candidates[i].id === t.selectedCandidateId) return t.candidates[i];
      }
      return null;
    }, [t.candidates, t.selectedCandidateId]);

    if (!t.romBytes) {
      return e('div', { className: 'kt-activity-placeholder' },
        e('div', { className: 'ap-title' }, 'Table Workspace'),
        e('div', { className: 'ap-hint' }, 'Load a ROM first from File menu.')
      );
    }

    return e('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        padding: 12
      }
    },
      // LEFT: candidate list + preview + apply
      e('div', {
        style: {
          display: 'flex', flexDirection: 'column', minHeight: 0,
          border: '1px solid var(--kt-widget-border-default)',
          borderRadius: 3, background: 'var(--kt-sidebar-bg)',
          padding: 10, overflow: 'hidden'
        }
      },
        e('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, marginBottom: 6 } },
          'Candidates (' + t.candidates.length + ')'),
        e(CandidateList, {
          candidates: t.candidates,
          selectedId: t.selectedCandidateId,
          compareIds: t.compareIds
        }),
        t.compareIds.length > 0 ? e(ComparePanel, {
          candidates: t.candidates,
          compareIds: t.compareIds
        }) : null,
        e('div', { style: { marginTop: 8, marginBottom: 6, display: 'flex', gap: 4 } },
          e('button', {
            type: 'button', className: 'kt-btn small',
            onClick: function () { K.table.clearCompare(); },
            disabled: t.compareIds.length === 0
          }, 'Clear Compare (' + t.compareIds.length + ')'),
          e('button', {
            type: 'button', className: 'kt-btn small',
            onClick: function () {
              var inp = document.getElementById('kt-input-table');
              if (inp) inp.click();
            }
          }, 'Load .tbl to Compare')
        ),
        e('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, marginBottom: 6 } },
          'Preview'),
        e('input', {
          type: 'text',
          className: 'kt-input',
          placeholder: 'Filter characters...',
          value: t.previewFilter,
          onChange: function (ev) { K.table.setPreviewFilter(ev.target.value); },
          style: { marginBottom: 6, fontSize: 11 }
        }),
        e(FullPreview, { candidate: selectedCandidate, filter: t.previewFilter }),
        e('button', {
          type: 'button',
          className: 'kt-btn',
          style: { marginTop: 8, width: '100%' },
          onClick: function () { K.table.applySelectedToEditTable(); },
          disabled: !selectedCandidate
        }, 'Apply .tbl to Edit Panel')
      ),

      // RIGHT: edit table + apply for rom
      e('div', {
        style: {
          display: 'flex', flexDirection: 'column', minHeight: 0,
          border: '1px solid var(--kt-widget-border-default)',
          borderRadius: 3, background: 'var(--kt-sidebar-bg)',
          padding: 10, overflow: 'hidden'
        }
      },
        e('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, marginBottom: 6 } },
          'Edit Table' + (t.tableSource ? ' -- ' + t.tableSource : '')),
        e(EditTable, {
          entries: t.tableEntries,
          isApplied: t.isApplied
        })
      )
    );
  }

  K.ui.registerTabProvider('table', TableTab);
})(window);