/**
 * outline.js — ドキュメントアウトライン（h1-h6の見出しツリー）
 */
(function () {
  'use strict';
  var App = (window.App = window.App || {});

  var MAX_LABEL_CHARS = 60;
  var FLASH_MS = 1500;

  App.buildOutline = function (iframeDoc, listEl, emptyEl) {
    if (!listEl || !iframeDoc) return;
    listEl.innerHTML = '';
    var headings = iframeDoc.querySelectorAll('h1,h2,h3,h4,h5,h6');
    if (headings.length === 0) {
      if (emptyEl) emptyEl.style.display = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    headings.forEach(function (h) {
      var item = document.createElement('div');
      item.className = 'outline-item';
      item.setAttribute('data-level', h.tagName[1]);
      var label = h.textContent.trim();
      item.textContent = label.substring(0, MAX_LABEL_CHARS) || '(empty heading)';
      item.title = label;
      item.addEventListener('click', function () {
        h.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var orig = h.style.outline;
        h.style.outline = '2px solid ' + App.design.ACCENT;
        setTimeout(function () {
          h.style.outline = orig;
        }, FLASH_MS);
      });
      listEl.appendChild(item);
    });
  };
})();
