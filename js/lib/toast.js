/**
 * toast.js — トースト通知（破壊的操作の「元に戻す」アクション付き）
 */
(function () {
  'use strict';
  var App = (window.App = window.App || {});

  var DURATION_DEFAULT = 2000;
  var DURATION_WITH_ACTION = 6000; // 「元に戻す」操作の猶予
  var FADE_OUT_MS = 300; // styles/common.css の toast-fade-out と合わせる

  App.showToast = function (message, type, options) {
    options = options || {};
    var existing = document.querySelector('.temp-message');
    if (existing) existing.remove();

    var div = document.createElement('div');
    div.className = 'temp-message' + (type === 'error' ? ' toast-error' : '');
    div.textContent = message;
    div.setAttribute('role', 'status');
    div.setAttribute('aria-live', 'polite');

    var duration = options.duration || (options.actionLabel ? DURATION_WITH_ACTION : DURATION_DEFAULT);
    if (options.actionLabel && typeof options.onAction === 'function') {
      div.classList.add('has-action');
      var actionBtn = document.createElement('button');
      actionBtn.className = 'toast-action';
      actionBtn.textContent = options.actionLabel;
      actionBtn.addEventListener('click', function () {
        div.remove();
        options.onAction();
      });
      div.appendChild(actionBtn);
    }

    document.body.appendChild(div);
    setTimeout(function () {
      div.classList.add('toast-out');
      setTimeout(function () {
        if (div.parentNode) div.parentNode.removeChild(div);
      }, FADE_OUT_MS);
    }, duration);
  };
})();
