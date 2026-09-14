/* ============================================================
   Ketor -- Workflow Registry
   ------------------------------------------------------------
   Registry of all console workflows + auto-dispatch by
   header detection, falling back to file extension.
   Load this file LAST, after all workflow modules.
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.workflows = Ketor.workflows || {};

  var registry = [];

  /**
   * Register a workflow instance.
   */
  function register(WorkflowClass) {
    registry.push(new WorkflowClass());
  }

  /**
   * Detect the appropriate workflow for a ROM.
   * Priority: header detection > file extension > default.
   * @param {Uint8Array} data - ROM bytes
   * @param {string} fileName - Original file name
   * @returns {BaseWorkflow|null}
   */
  function detectWorkflow(data, fileName) {
    var i, wf;

    // Pass 1: header-based detection (most accurate)
    for (i = 0; i < registry.length; i++) {
      wf = registry[i];
      if (wf.detect(data, fileName)) return wf;
    }

    // Pass 2: extension-only fallback
    var ext = (fileName || '').split('.').pop().toLowerCase();
    for (i = 0; i < registry.length; i++) {
      wf = registry[i];
      if (wf.extensions.indexOf(ext) !== -1) return wf;
    }

    // Pass 3: default to first registered (NES as generic baseline)
    return registry[0] || null;
  }

  /**
   * Get workflow by system name.
   * @param {string} name
   * @returns {BaseWorkflow|null}
   */
  function getWorkflowByName(name) {
    for (var i = 0; i < registry.length; i++) {
      if (registry[i].name === name) return registry[i];
    }
    return null;
  }

  /**
   * Get all registered workflows (for UI listing).
   * @returns {Array<BaseWorkflow>}
   */
  function getAllWorkflows() {
    return registry.slice();
  }

  /**
   * Bootstrap: register all available workflows.
   * Checks global.Ketor.workflows.XXXWorkflow for each.
   */
  function bootstrap() {
    registry.length = 0;
    var w = Ketor.workflows;
    if (w.NESWorkflow)      register(w.NESWorkflow);
    if (w.SNESWorkflow)     register(w.SNESWorkflow);
    if (w.GBWorkflow)       register(w.GBWorkflow);
    if (w.GBCWorkflow)      register(w.GBCWorkflow);
    if (w.GBAWorkflow)      register(w.GBAWorkflow);
    if (w.NDSWorkflow)      register(w.NDSWorkflow);
    if (w.GenesisWorkflow)  register(w.GenesisWorkflow);
    if (w.PS1Workflow)      register(w.PS1Workflow);
    if (w.N64Workflow)      register(w.N64Workflow);
    if (w.PSPWorkflow)      register(w.PSPWorkflow);
    if (w.SwitchWorkflow)   register(w.SwitchWorkflow);
    if (w.PS2Workflow)      register(w.PS2Workflow);
    if (w.PCWorkflow)       register(w.PCWorkflow);
    if (w.ThreeDSWorkflow)  register(w.ThreeDSWorkflow);
    if (w.PCEWorkflow)      register(w.PCEWorkflow);
  }

  Ketor.workflows.register = register;
  Ketor.workflows.detectWorkflow = detectWorkflow;
  Ketor.workflows.getWorkflowByName = getWorkflowByName;
  Ketor.workflows.getAllWorkflows = getAllWorkflows;
  Ketor.workflows.bootstrap = bootstrap;

  // Auto-bootstrap after all workflow classes are loaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
      // Defer to allow subsequent scripts to register
      setTimeout(bootstrap, 0);
    }
  }

})(window);