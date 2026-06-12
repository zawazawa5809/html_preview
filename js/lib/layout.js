/**
 * layout.js — 分割レイアウト切替と gutter ドラッグリサイズ
 */
(function () {
  'use strict';
  var App = (window.App = window.App || {});

  var DEFAULT_LAYOUT = 'lr';
  var LAYOUTS = { lr: true, tb: true, po: true };
  var MIN_PANE_RATIO = 0.1;

  App.createLayout = function (opts) {
    var current = DEFAULT_LAYOUT;

    function apply(mode) {
      current = mode;
      App.safeSet(opts.storageKey, mode);
      opts.splitView.className = 'split-view layout-' + mode;
      // gutterドラッグで付いたインラインサイズを破棄し、CSSの50%定義に戻す
      opts.editorPane.style.width = '';
      opts.editorPane.style.height = '';
      opts.previewPane.style.width = '';
      opts.previewPane.style.height = '';
      Object.keys(opts.buttons).forEach(function (key) {
        opts.buttons[key].classList.toggle('active', key === mode);
      });
    }

    return {
      apply: apply,
      current: function () {
        return current;
      },
      init: function () {
        var saved = App.safeGet(opts.storageKey);
        apply(saved && LAYOUTS[saved] ? saved : DEFAULT_LAYOUT);
      },
    };
  };

  /**
   * gutter のマウス/タッチドラッグでパネル比率を変更する。
   * opts: { gutter, editorPane, previewPane, getLayout() }
   */
  App.initSplitDrag = function (opts) {
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var initialWidth = 0;
    var initialHeight = 0;

    function onTouchMove(ev) {
      onMove(ev.touches[0]);
    }

    function start(e) {
      dragging = true;
      var layout = opts.getLayout();
      document.body.classList.add(layout === 'tb' ? 'dragging-tb' : 'dragging-lr');
      opts.gutter.classList.add('dragging');
      startX = e.clientX;
      startY = e.clientY;
      initialWidth = opts.editorPane.offsetWidth;
      initialHeight = opts.editorPane.offsetHeight;
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('mouseup', stop);
      window.addEventListener('touchend', stop);
      window.addEventListener('mouseleave', stop);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = layout === 'tb' ? 'row-resize' : 'col-resize';
      var overlay = document.createElement('div');
      overlay.className = 'resize-overlay';
      document.body.appendChild(overlay);
    }

    function onMove(e) {
      if (!dragging) return;
      requestAnimationFrame(function () {
        if (!dragging) return;
        var layout = opts.getLayout();
        if (layout === 'lr') {
          var totalW = opts.editorPane.parentElement.clientWidth - opts.gutter.offsetWidth;
          var minW = Math.max(totalW * MIN_PANE_RATIO, 100);
          var newW = Math.min(totalW - minW, Math.max(minW, initialWidth + (e.clientX - startX)));
          opts.editorPane.style.width = newW + 'px';
          opts.previewPane.style.width = totalW - newW + 'px';
        } else if (layout === 'tb') {
          var totalH = opts.editorPane.parentElement.clientHeight - opts.gutter.offsetHeight;
          var minH = Math.max(totalH * MIN_PANE_RATIO, 100);
          var newH = Math.min(totalH - minH, Math.max(minH, initialHeight + (e.clientY - startY)));
          opts.editorPane.style.height = newH + 'px';
          opts.previewPane.style.height = totalH - newH + 'px';
        }
      });
    }

    function stop() {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove('dragging-lr', 'dragging-tb');
      opts.gutter.classList.remove('dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchend', stop);
      window.removeEventListener('mouseleave', stop);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      var overlay = document.querySelector('.resize-overlay');
      if (overlay) overlay.remove();
    }

    opts.gutter.addEventListener('mousedown', start);
    opts.gutter.addEventListener('touchstart', function (e) {
      e.preventDefault(); // スクロール防止
      start(e.touches[0]);
    });
  };
})();
