/* ============================================================
   Ketor -- Command Registry
   ------------------------------------------------------------
   Central command system matching VS Code's command pattern.
   Menubar items, activity bar actions, sidebar buttons, and
   keyboard shortcuts all resolve to command IDs.

   API:
   - registerCommand(id, handler, options)
   - registerCommands({ id: handler, ... })
   - executeCommand(id, ...args) -> Promise
   - getCommand(id) / hasCommand(id) / listCommands()
   - onDidChange(fn) -> unsubscribe
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.commands = Ketor.commands || {};

  var registry = new Map();
  var listeners = new Set();

  function notify() {
    listeners.forEach(function (fn) {
      try { fn(); } catch (_) { }
    });
  }

  function registerCommand(id, handler, options) {
    if (!id || typeof handler !== 'function') {
      console.warn('[Ketor.commands] Invalid registration:', id);
      return false;
    }
    registry.set(id, { id: id, handler: handler, options: options || {} });
    notify();
    return true;
  }

  function registerCommands(map) {
    if (!map || typeof map !== 'object') return;
    Object.keys(map).forEach(function (id) {
      registerCommand(id, map[id]);
    });
  }

  function unregisterCommand(id) {
    var removed = registry.delete(id);
    if (removed) notify();
    return removed;
  }

  function getCommand(id) {
    return registry.get(id) || null;
  }

  function hasCommand(id) {
    return registry.has(id);
  }

  function listCommands() {
    return Array.from(registry.values());
  }

  function executeCommand(id) {
    var args = Array.prototype.slice.call(arguments, 1);
    var cmd = registry.get(id);
    if (!cmd) {
      console.warn('[Ketor.commands] Unknown command:', id);
      return Promise.reject(new Error('Unknown command: ' + id));
    }
    try {
      var result = cmd.handler.apply(null, args);
      if (result && typeof result.then === 'function') return result;
      return Promise.resolve(result);
    } catch (err) {
      console.error('[Ketor.commands] Command failed:', id, err);
      return Promise.reject(err);
    }
  }

  function onDidChange(fn) {
    if (typeof fn !== 'function') return function () { };
    listeners.add(fn);
    return function () { listeners.delete(fn); };
  }

  Ketor.commands.registerCommand = registerCommand;
  Ketor.commands.registerCommands = registerCommands;
  Ketor.commands.unregisterCommand = unregisterCommand;
  Ketor.commands.getCommand = getCommand;
  Ketor.commands.hasCommand = hasCommand;
  Ketor.commands.listCommands = listCommands;
  Ketor.commands.executeCommand = executeCommand;
  Ketor.commands.onDidChange = onDidChange;

})(window);