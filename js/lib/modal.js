/**
 * modal.js — モーダルオーバーレイ制御（フォーカストラップ付き）
 *
 * role="dialog" のオーバーレイに対して、開閉・Tabキーのフォーカス循環・
 * 閉じたときの呼び出し元へのフォーカス復元を提供する。
 */
(function () {
  'use strict';
  var App = (window.App = window.App || {});

  var FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  App.createModal = function (overlay) {
    var lastFocused = null;

    function focusables() {
      return Array.prototype.slice.call(overlay.querySelectorAll(FOCUSABLE_SELECTOR));
    }

    function trapTab(e) {
      if (e.key !== 'Tab') return;
      var els = focusables();
      if (els.length === 0) return;
      var first = els[0];
      var last = els[els.length - 1];
      var active = document.activeElement;
      if (e.shiftKey && (active === first || !overlay.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !overlay.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }

    function open() {
      if (!overlay.hidden) return;
      lastFocused = document.activeElement;
      overlay.hidden = false;
      overlay.addEventListener('keydown', trapTab);
      var els = focusables();
      if (els.length) els[0].focus();
    }

    function close() {
      if (overlay.hidden) return;
      overlay.hidden = true;
      overlay.removeEventListener('keydown', trapTab);
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
      lastFocused = null;
    }

    return {
      open: open,
      close: close,
      toggle: function () {
        if (overlay.hidden) open();
        else close();
      },
      isOpen: function () {
        return !overlay.hidden;
      },
    };
  };
})();
