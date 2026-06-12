/**
 * core.js — 名前空間と基盤ユーティリティ
 *
 * 各ファイルは window.App 名前空間に機能を登録するクラシックスクリプト。
 * Vite移行時は IIFE ラッパーを外して `export` に置換するだけでよい
 * （ADR-0002参照）。
 */
(function () {
  'use strict';
  var App = (window.App = window.App || {});

  /** debounce（flush/cancel付き）。lodash依存を排除した自前実装 */
  App.debounce = function (fn, delay) {
    var timeoutId = null;
    var pendingArgs = null;
    var pendingThis = null;

    function invoke() {
      timeoutId = null;
      var args = pendingArgs;
      var self = pendingThis;
      pendingArgs = pendingThis = null;
      fn.apply(self, args);
    }

    function debounced() {
      pendingArgs = Array.prototype.slice.call(arguments);
      pendingThis = this;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(invoke, delay);
    }

    debounced.flush = function () {
      if (timeoutId === null) return;
      clearTimeout(timeoutId);
      invoke();
    };

    debounced.cancel = function () {
      clearTimeout(timeoutId);
      timeoutId = null;
      pendingArgs = pendingThis = null;
    };

    return debounced;
  };

  App.escHtml = function (str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /** rgb()/rgba() -> #rrggbb。透明は '' を返す */
  App.colorToHex = function (color) {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return '';
    var match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return color;
    return (
      '#' +
      [match[1], match[2], match[3]]
        .map(function (x) {
          return parseInt(x, 10).toString(16).padStart(2, '0');
        })
        .join('')
    );
  };

  App.parsePx = function (val) {
    return parseInt(val, 10) || 0;
  };

  App.logError = function (scope, error) {
    console.error('[' + scope + ']', error);
  };
})();
