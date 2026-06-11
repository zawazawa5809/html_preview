/**
 * theme.js — ライト/ダークテーマ切替
 */
(function () {
  'use strict';
  var App = (window.App = window.App || {});

  var SPIN_MS = 400; // styles/common.css の theme-spin と合わせる

  App.createTheme = function (opts) {
    var current = 'light';

    function apply(theme) {
      current = theme;
      document.documentElement.setAttribute('data-theme', theme);
      App.safeSet(opts.storageKey, theme);
      updateButtonIcon(theme);
    }

    function updateButtonIcon(theme) {
      var btn = opts.button;
      if (!btn) return;
      if (typeof window.feather !== 'undefined') {
        btn.classList.add('theme-icon-spin');
        var oldIcon = btn.querySelector('svg, [data-feather]');
        if (oldIcon) oldIcon.remove();
        var newIcon = document.createElement('i');
        newIcon.setAttribute('data-feather', theme === 'dark' ? 'sun' : 'moon');
        btn.appendChild(newIcon);
        window.feather.replace();
        setTimeout(function () {
          btn.classList.remove('theme-icon-spin');
        }, SPIN_MS);
      } else {
        var icon = btn.querySelector('[data-feather], svg, i');
        if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
      }
    }

    return {
      apply: apply,
      toggle: function () {
        apply(current === 'dark' ? 'light' : 'dark');
      },
      current: function () {
        return current;
      },
      init: function () {
        apply(App.safeGet(opts.storageKey) === 'dark' ? 'dark' : 'light');
      },
    };
  };
})();
