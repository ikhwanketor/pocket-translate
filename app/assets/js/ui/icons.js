/* ============================================================
   Ketor -- Icon Registry
   ------------------------------------------------------------
   Codicon-style SVG icons matching VS Code's official icon set.
   All paths from microsoft/vscode-codicons (MIT licensed).

   Icons are 16x16 viewBox, single-path filled SVGs.
   Use: Ketor.ui.icon('globe') returns an <svg> element.
   Or:  Ketor.ui.iconHtml('globe') returns SVG string.
   ============================================================ */

(function (global) {
  'use strict';

  var Ketor = global.Ketor = global.Ketor || {};
  Ketor.ui = Ketor.ui || {};

  // Codicon SVG paths (16x16 viewBox, MIT license)
  var ICONS = {
    /* ---- Activity Bar ---- */
    globe: 'M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm5.93 7h-2.02c-.1-1.52-.49-3-1.13-4.3A6.5 6.5 0 0 1 13.93 7ZM8 14.5c-.83 0-2.14-1.96-2.4-5.5h4.8c-.26 3.54-1.57 5.5-2.4 5.5Zm-2.4-7c.26-3.54 1.57-5.5 2.4-5.5s2.14 1.96 2.4 5.5H5.6ZM5.22 2.7C4.58 4 4.19 5.48 4.09 7H2.07a6.5 6.5 0 0 1 3.15-4.3ZM2.07 9h2.02c.1 1.52.49 3 1.13 4.3A6.5 6.5 0 0 1 2.07 9Zm8.71 4.3c.64-1.3 1.03-2.78 1.13-4.3h2.02a6.5 6.5 0 0 1-3.15 4.3ZM8 1.5c.83 0 2.14 1.96 2.4 5.5H5.6c.26-3.54 1.57-5.5 2.4-5.5Z',
    'file-binary': 'M10.5 1a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5h-2ZM10 2h2v2h-2V2Zm-7 .5A.5.5 0 0 1 3.5 2h2a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-5ZM4 3v4h2V3H4Zm6.5 4a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-5a.5.5 0 0 0-.5-.5h-2Zm.5 1h2v4h-2V8Zm-7 .5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2Zm1 .5v1h2v-1H5Z',
    'paintcan': 'M11.5 1a.5.5 0 0 1 .5.5V3a.5.5 0 0 1-.5.5H11V5a3 3 0 0 1-2 2.83V13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7.83A3 3 0 0 1 2 5V3.5a.5.5 0 0 1 .5-.5h9ZM3 3.5V5a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V3.5H3Zm4 3.67V13h2V7.17a3 3 0 0 1-2 0Z',
    package: 'M8.5 1.35a1 1 0 0 0-.5-.35h-.02a1 1 0 0 0-.5.35L2.13 4.68a1 1 0 0 0-.13.13V11a1 1 0 0 0 .5.87l5.35 3.09a1 1 0 0 0 1 0l5.35-3.09a1 1 0 0 0 .5-.87V4.81a1 1 0 0 0-.13-.13L8.5 1.35ZM8 2.29l4.8 2.77L8 7.83 3.2 5.06 8 2.29ZM3 5.9v4.75l4.5 2.6V8.5L3 5.9Zm5.5 7.35 4.5-2.6V5.9l-4.5 2.6v4.75Z',
    beaker: 'M4.5 1a.5.5 0 0 0-.5.5V3a2 2 0 0 0 .6 1.42L5 4.8V7H3a.5.5 0 0 0-.5.5v3A2.5 2.5 0 0 0 5 13h6a2.5 2.5 0 0 0 2.5-2.5v-3A.5.5 0 0 0 13 7h-2V4.8l.4-.38A2 2 0 0 0 12 3V1.5a.5.5 0 0 0-.5-.5h-7ZM5 2h6v1a1 1 0 0 1-.3.7L10 4.4V7H6V4.4L5.3 3.7A1 1 0 0 1 5 3V2ZM3.5 8h9v2.5c0 .83-.67 1.5-1.5 1.5H5c-.83 0-1.5-.67-1.5-1.5V8Z',

    /* ---- Common UI ---- */
    'chevron-down': 'M4 6l4 4 4-4H4z',
    'chevron-right': 'M6 4l4 4-4 4V4z',
    'chevron-left': 'M10 4L6 8l4 4V4z',
    'chevron-up': 'M4 10l4-4 4 4H4z',
    'close': 'M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z',
    'add': 'M8 1v7H1v1h7v7h1V9h7V8H9V1H8z',
    'remove': 'M15 8H1v1h14V8z',
    'check': 'M13.78 4.22l-7.5 7.5-3.5-3.5-.78.78L6.28 13.5 14.5 5.28l-.72-.72z',
    'chrome-close': 'M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z',
    'settings': 'M9.1 4.4l.3-1.65a.5.5 0 0 0-.5-.6h-1.8a.5.5 0 0 0-.5.6l.3 1.65a4.4 4.4 0 0 0-.74.42l-1.52-.62a.5.5 0 0 0-.6.2l-.9 1.56a.5.5 0 0 0 .14.64l1.35.93a4.4 4.4 0 0 0 0 .85l-1.35.93a.5.5 0 0 0-.14.64l.9 1.56a.5.5 0 0 0 .6.2l1.52-.62c.23.16.48.3.74.42l-.3 1.65a.5.5 0 0 0 .5.6h1.8a.5.5 0 0 0 .5-.6l-.3-1.65c.26-.12.51-.26.74-.42l1.52.62a.5.5 0 0 0 .6-.2l.9-1.56a.5.5 0 0 0-.14-.64l-1.35-.93a4.4 4.4 0 0 0 0-.85l1.35-.93a.5.5 0 0 0 .14-.64l-.9-1.56a.5.5 0 0 0-.6-.2l-1.52.62a4.4 4.4 0 0 0-.74-.42ZM8 10a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z',
    'search': 'M15.25 15.25l-3.44-3.44a5.5 5.5 0 1 0-.707.707l3.44 3.44.707-.707ZM6.5 11a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z',
    'file': 'M9.5 1H3.5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V4.5L9.5 1Zm-.5.5V5h3.5',
    'folder': 'M14.5 3H8L6.7 1.7A.5.5 0 0 0 6.35 1.5H1.5a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V3.5a.5.5 0 0 0-.5-.5Z',
    'folder-opened': 'M14.5 3H8L6.7 1.7A.5.5 0 0 0 6.35 1.5H1.5a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h13.1a.5.5 0 0 0 .48-.36l1.4-4.5a.5.5 0 0 0-.48-.64H3.2L4.6 3.5h10V3Z',
    'file-code': 'M9.5 1H3.5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V4.5L9.5 1Zm-.5.5V5h3.5M7 7.5L5 9.5l2 2M9 7.5l2 2-2 2',
    'symbol-color': 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM6.5 12.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4-2.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2ZM4 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4 2a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
    'symbol-numeric': 'M4 3.5a.5.5 0 0 1 .5-.5H6v9h1.5v1H2v-1h1.5V4H2V3h2Zm6 0a.5.5 0 0 1 .5-.5H12v9h1.5v1H8v-1h1.5V4H8V3h2Z',
    'run': 'M4 2l9 6-9 6V2z',
    'stop': 'M3 3h10v10H3z',
    'refresh': 'M13.65 2.35A8 8 0 1 0 15 8h-2a6 6 0 1 1-1.76-4.24L9 6h5V1l-1.35 1.35z',
    'save': 'M12 1H3.5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V4.5L12 1ZM6 2h5v3H6V2Zm5.5 12h-7v-4h7v4Z',
    'trash': 'M10 3h3v1h-1v9.5a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5V4H3V3h3V1.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V3Zm-4 0h4V2H6v1Z',
    'copy': 'M11 1H3.5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5H4V2h7V1ZM6 4h6.5a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5v-10A.5.5 0 0 1 6 4Z',
    'paste': 'M11 1H9.5a.5.5 0 0 0-.5.5V2H5.5a.5.5 0 0 0-.5.5V4H3.5a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-10a.5.5 0 0 0-.5-.5H11V1.5a.5.5 0 0 0-.5-.5H11ZM4 5h8v10H4V5Z',
    'edit': 'M11.5 1.5L14.5 4.5 6 13H3v-3l8.5-8.5ZM12.5 2.5L4 11v1h1l8.5-8.5-1-1Z',
    'info': 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 2.5a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8ZM9 12H7V6.5h2V12Z',
    'warning': 'M7.56 1.24a.5.5 0 0 1 .88 0l6.5 12A.5.5 0 0 1 14.5 14h-13a.5.5 0 0 1-.44-.76l6.5-12ZM8 5.5v4h1v-4H8ZM8 11a.75.75 0 1 0 0 1.5A.75.75 0 0 0 8 11Z',
    'error': 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm2.85 9.15l-.7.7L8 8.7 5.85 10.85l-.7-.7L7.3 8 5.15 5.85l.7-.7L8 7.3l2.15-2.15.7.7L8.7 8l2.15 2.15Z',
    'menu': 'M1 3h14v1H1V3Zm0 4h14v1H1V7Zm0 4h14v1H1v-1Z',
    'kebab-vertical': 'M8 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
    'ellipsis': 'M4 7a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z',
    'layout-sidebar-left': 'M2 1h12v14H2V1Zm1 1v12h3V2H3Zm4 0v12h7V2H7Z',
    'layout-panel': 'M2 1h12v14H2V1Zm1 1v9h10V2H3Zm0 10v3h10v-3H3Z',
    'layout': 'M2 1h12v14H2V1Zm1 1v3h10V2H3Zm0 4v4h10V6H3Zm0 5v3h10v-3H3Z',
    'split-horizontal': 'M2 1h12v14H2V1Zm1 1v12h5V2H3Zm6 0v12h5V2H9Z',
    'split-vertical': 'M2 1h12v14H2V1Zm1 1v5h10V2H3Zm0 6v6h10V8H3Z',
    'zoom-in': 'M15.25 15.25l-3.44-3.44a5.5 5.5 0 1 0-.707.707l3.44 3.44.707-.707ZM6.5 11a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Zm2.5-5.5v1H7.5v1.5h-1V6.5H5v-1h1.5V4h1v1.5H9Z',
    'zoom-out': 'M15.25 15.25l-3.44-3.44a5.5 5.5 0 1 0-.707.707l3.44 3.44.707-.707ZM6.5 11a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9ZM5 6.5h3v1H5v-1Z',
    'sign-out': 'M7 3H4v10h3v1H3V2h4v1Zm3.854 1.146L10 5l3 3-3 3-.854-.854L11.293 8H6V7h5.293L9.854 4.854l.146-.708Z',
    'account': 'M8 1a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 8.5c3.11 0 5.5 1.79 5.5 4.5v1H2.5v-1c0-2.71 2.39-4.5 5.5-4.5Z',
    'history': 'M8 1.5a6.5 6.5 0 1 0 6.5 6.5H13a5 5 0 1 1-5-5v2L11 2.5 8 0v1.5Z',
    'sync': 'M11.55 4.45L8 8V4.5A3.5 3.5 0 1 0 11.5 8h1.5a5 5 0 1 1-5-5v2L11.55 1.5 14.5 4.5l-2.95 2.95V4.45Z',
    'cloud-download': 'M8 1a3.5 3.5 0 0 0-3.4 2.65A3 3 0 0 0 2 6.5C2 8.43 3.57 10 5.5 10h.5v1h-.5A4.5 4.5 0 0 1 2 6.5c0-2 1.32-3.71 3.16-4.31A4.5 4.5 0 0 1 12.5 6v.5h-1V6a3.5 3.5 0 0 0-3.5-3.5H8V1Zm0 8.29l-2.15 2.15.7.7L8 10.7l1.45 1.44.7-.7L8 9.29V14H7V9.29l-.01.01Z',
    'debug': 'M4 3l1.5 1.5A3.5 3.5 0 0 1 8 3.5c.98 0 1.86.4 2.5 1.05L12 3l1 1-1.5 1.5A3.98 3.98 0 0 1 12 7.5V9h2v1h-2v1.5a4 4 0 0 1-1.5 3.11L12 16l-1 1-1.5-1.5a3.5 3.5 0 0 1-3 0L5 17l-1-1 1.5-1.5A4 4 0 0 1 4 11.5V10H2V9h2V7.5c0-.72.19-1.4.5-2L3 4l1-1Zm4 .5A2.5 2.5 0 0 0 5.5 6v5a2.5 2.5 0 0 0 5 0V6A2.5 2.5 0 0 0 8 3.5ZM7 6h2v1H7V6Zm0 2h2v1H7V8Z',
    'wand': 'M14.5 1.5L13 3l-1-1-1 1 1 1-1.5 1.5 1.5 1.5 1.5-1.5 1 1L15.5 5.5l-1-1L16 3l-1.5-1.5zM2 14l6.5-6.5 1 1L3 15l-1-1z',
    'symbol-method': 'M13.5 3.5l-3-3L8 3l3 3 2.5-2.5zM12 1l2 2-1.5 1.5-2-2L12 1zM3 10l3 3-1 1-3-3 1-1zM7 6l3 3-1 1-3-3 1-1zM9.5 3.5L11 5l-5.5 5.5-1.5-1.5L9.5 3.5z'
  };

  /**
   * Get SVG string for an icon.
   * @param {string} name
   * @param {number} [size]
   * @returns {string}
   */
  function iconHtml(name, size) {
    var path = ICONS[name];
    if (!path) return '';
    var s = size || 16;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="' + s + '" height="' + s + '" aria-hidden="true"><path fill="currentColor" d="' + path + '"/></svg>';
  }

  /**
   * Get React <svg> element for an icon.
   * @param {string} name
   * @param {Object} [props]
   * @returns {React.Element|null}
   */
  function icon(name, props) {
    var path = ICONS[name];
    if (!path || !global.React) return null;
    var p = props || {};
    var size = p.size || 16;
    var className = p.className || '';
    return global.React.createElement('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 16 16',
      width: size,
      height: size,
      className: className,
      'aria-hidden': 'true',
      style: p.style
    }, global.React.createElement('path', {
      fill: 'currentColor',
      d: path
    }));
  }

  function iconExists(name) {
    return !!ICONS[name];
  }

  function listIcons() {
    return Object.keys(ICONS);
  }

  Ketor.ui.icon = icon;
  Ketor.ui.iconHtml = iconHtml;
  Ketor.ui.iconExists = iconExists;
  Ketor.ui.listIcons = listIcons;
  Ketor.ui.ICONS = ICONS;

})(window);