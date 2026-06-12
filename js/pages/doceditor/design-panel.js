/**
 * design-panel.js — Designタブのスタイル編集パネル
 *
 * ctx 契約:
 *   getSelectedElement(): iframe内の選択中要素 | null
 *   getIframeDoc(): Document | null
 *   getIframeWin(): Window | null
 *   scheduleSync(): Design Mode のDOM変更をエディタへ反映（debounced）
 *   deleteSelected(el): 「元に戻す」トースト付き削除
 *   sendToIframe(message): token付きpostMessage
 */
(function () {
  'use strict';
  var App = (window.App = window.App || {});
  var design = App.design;

  App.createDesignPanel = function (ctx) {
    function $(id) {
      return document.getElementById(id);
    }

    var state = {
      paddingLinked: false,
      marginLinked: false,
      dropdownOpen: false,
      copiedStyles: null,
    };

    function applyStyle(prop, value) {
      var el = ctx.getSelectedElement();
      if (!el) return;
      el.style[prop] = value;
    }

    /* ---- セクション開閉（クリック / Enter / Space） ---- */
    document.querySelectorAll('.dt-section-header').forEach(function (header) {
      function toggleSection() {
        var body = $(header.getAttribute('data-section'));
        if (!body) return;
        var collapsed = header.classList.toggle('collapsed');
        body.classList.toggle('collapsed', collapsed);
        header.setAttribute('aria-expanded', String(!collapsed));
      }
      header.addEventListener('click', toggleSection);
      header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleSection();
        }
      });
    });

    /* ---- Colors ---- */
    function bindColorRow(colorId, textId, prop) {
      var colorInput = $(colorId);
      var textInput = $(textId);
      colorInput.addEventListener('input', function () {
        textInput.value = this.value;
        applyStyle(prop, this.value);
      });
      textInput.addEventListener('change', function () {
        var v = this.value.trim();
        if (v) {
          colorInput.value = v;
          applyStyle(prop, v);
        }
      });
    }
    bindColorRow('dt-bg-color', 'dt-bg-color-text', 'backgroundColor');
    bindColorRow('dt-text-color', 'dt-text-color-text', 'color');
    bindColorRow('dt-border-color', 'dt-border-color-text', 'borderColor');
    $('dt-bg-transparent').addEventListener('click', function () {
      $('dt-bg-color-text').value = 'transparent';
      applyStyle('backgroundColor', 'transparent');
    });

    /* ---- Typography ---- */
    $('dt-font-size-slider').addEventListener('input', function () {
      $('dt-font-size').value = this.value;
      applyStyle('fontSize', this.value + 'px');
    });
    $('dt-font-size').addEventListener('change', function () {
      var v = App.parsePx(this.value);
      $('dt-font-size-slider').value = Math.min(Math.max(v, 8), 72);
      applyStyle('fontSize', v + 'px');
    });
    $('dt-font-weight').addEventListener('change', function () {
      applyStyle('fontWeight', this.value);
    });
    $('dt-text-align-group').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-align]');
      if (!btn) return;
      this.querySelectorAll('.dt-btn-sm').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      applyStyle('textAlign', btn.getAttribute('data-align'));
    });
    $('dt-line-height-slider').addEventListener('input', function () {
      $('dt-line-height').value = this.value;
      applyStyle('lineHeight', this.value);
    });
    $('dt-line-height').addEventListener('change', function () {
      $('dt-line-height-slider').value = this.value;
      applyStyle('lineHeight', this.value);
    });

    /* ---- Spacing（box model図の8入力 + リンクモード） ---- */
    document.querySelectorAll('.dt-box-input').forEach(function (input) {
      input.addEventListener('change', function () {
        var prop = this.getAttribute('data-prop');
        var n = App.parsePx(this.value);
        var val = n + 'px';
        var group = prop.indexOf('padding') === 0 ? 'padding' : 'margin';
        var linked = group === 'padding' ? state.paddingLinked : state.marginLinked;
        if (linked) {
          applyStyle(group, val);
          document.querySelectorAll('.dt-box-input[data-prop^="' + group + '"]').forEach(function (inp) {
            inp.value = n;
          });
        } else {
          applyStyle(prop, val);
        }
      });
    });
    $('dt-padding-link').addEventListener('click', function () {
      state.paddingLinked = !state.paddingLinked;
      this.classList.toggle('linked', state.paddingLinked);
    });
    $('dt-margin-link').addEventListener('click', function () {
      state.marginLinked = !state.marginLinked;
      this.classList.toggle('linked', state.marginLinked);
    });

    /* ---- Box ---- */
    $('dt-width').addEventListener('change', function () {
      applyStyle('width', this.value.trim() || 'auto');
    });
    $('dt-height').addEventListener('change', function () {
      applyStyle('height', this.value.trim() || 'auto');
    });
    $('dt-border-radius-slider').addEventListener('input', function () {
      $('dt-border-radius').value = this.value;
      applyStyle('borderRadius', this.value + 'px');
    });
    $('dt-border-radius').addEventListener('change', function () {
      $('dt-border-radius-slider').value = Math.min(App.parsePx(this.value), 50);
      applyStyle('borderRadius', this.value + 'px');
    });
    $('dt-opacity-slider').addEventListener('input', function () {
      $('dt-opacity-value').textContent = parseFloat(this.value).toFixed(2);
      applyStyle('opacity', this.value);
    });
    $('dt-display').addEventListener('change', function () {
      applyStyle('display', this.value);
    });
    $('dt-overflow').addEventListener('change', function () {
      applyStyle('overflow', this.value);
    });

    /* ---- 要素操作（移動/複製/削除）: iframe側アクションバーと同一実装を使う ---- */
    ['move-up', 'move-down', 'duplicate'].forEach(function (action) {
      $('dt-' + action).addEventListener('click', function () {
        var el = ctx.getSelectedElement();
        if (!el) return;
        if (design.elementAction(el, action)) ctx.scheduleSync();
      });
    });
    $('dt-delete').addEventListener('click', function () {
      var el = ctx.getSelectedElement();
      if (el) ctx.deleteSelected(el);
    });

    /* ---- 子要素追加ドロップダウン ---- */
    var dropdown = $('dt-add-dropdown');
    var addChildBtn = $('dt-add-child');

    function closeDropdown() {
      dropdown.style.display = 'none';
      state.dropdownOpen = false;
      addChildBtn.setAttribute('aria-expanded', 'false');
    }

    addChildBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      state.dropdownOpen = !state.dropdownOpen;
      dropdown.style.display = state.dropdownOpen ? '' : 'none';
      addChildBtn.setAttribute('aria-expanded', String(state.dropdownOpen));
    });
    dropdown.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-template]');
      if (!btn) return;
      var el = ctx.getSelectedElement();
      var factory = design.templates[btn.getAttribute('data-template')];
      var doc = ctx.getIframeDoc();
      if (!el || !factory || !doc) return;
      el.appendChild(factory(doc));
      closeDropdown();
      ctx.scheduleSync();
    });

    /* ---- 改ページ挿入（選択要素の直後に兄弟として） ---- */
    $('dt-page-break').addEventListener('click', function () {
      var el = ctx.getSelectedElement();
      var doc = ctx.getIframeDoc();
      if (!el || !doc) return;
      el.parentNode.insertBefore(design.templates['page-break'](doc), el.nextSibling);
      ctx.scheduleSync();
      App.showToast('改ページを挿入しました');
    });

    /* ---- スタイルコピー/ペースト ---- */
    $('dt-copy-style').addEventListener('click', function () {
      var el = ctx.getSelectedElement();
      var win = ctx.getIframeWin();
      if (!el || !win) return;
      var cs = win.getComputedStyle(el);
      var copied = {};
      design.COPY_STYLE_PROPS.forEach(function (prop) {
        copied[prop] = cs[prop];
      });
      state.copiedStyles = copied;
      App.showToast('スタイルをコピーしました');
    });
    $('dt-paste-style').addEventListener('click', function () {
      if (!state.copiedStyles) {
        App.showToast('コピーされたスタイルがありません', 'error');
        return;
      }
      var el = ctx.getSelectedElement();
      if (!el) return;
      Object.keys(state.copiedStyles).forEach(function (prop) {
        el.style[prop] = state.copiedStyles[prop];
      });
      ctx.scheduleSync();
      App.showToast('スタイルを貼り付けました');
    });

    /* ---- テーブル操作 ---- */
    function insertEmptyCell(row, index) {
      var cell = index >= row.cells.length ? row.insertCell() : row.insertCell(index);
      cell.textContent = ' ';
      // thead内はthに置き換える
      if (row.parentElement.tagName === 'THEAD') cell.outerHTML = '<th> </th>';
    }

    function insertRow(atIndex) {
      var tctx = design.tableContext(ctx.getSelectedElement());
      if (!tctx) return;
      var newRow = tctx.table.insertRow(atIndex(tctx));
      for (var i = 0; i < tctx.colCount; i++) {
        var cell = newRow.insertCell();
        cell.textContent = ' ';
      }
      ctx.scheduleSync();
    }

    $('dt-row-above').addEventListener('click', function () {
      var tctx = design.tableContext(ctx.getSelectedElement());
      if (!tctx || tctx.rowIndex < 0) return;
      insertRow(function (t) {
        return t.rowIndex;
      });
    });
    $('dt-row-below').addEventListener('click', function () {
      insertRow(function (t) {
        return t.rowIndex >= 0 ? t.rowIndex + 1 : t.table.rows.length;
      });
    });

    function insertColumn(offset) {
      var tctx = design.tableContext(ctx.getSelectedElement());
      if (!tctx || tctx.cellIndex < 0) return;
      for (var i = 0; i < tctx.table.rows.length; i++) {
        insertEmptyCell(tctx.table.rows[i], tctx.cellIndex + offset);
      }
      ctx.scheduleSync();
    }

    $('dt-col-left').addEventListener('click', function () {
      insertColumn(0);
    });
    $('dt-col-right').addEventListener('click', function () {
      insertColumn(1);
    });

    $('dt-del-row').addEventListener('click', function () {
      var tctx = design.tableContext(ctx.getSelectedElement());
      if (!tctx || tctx.rowIndex < 0 || tctx.table.rows.length <= 1) return;
      tctx.table.deleteRow(tctx.rowIndex);
      clearSelection();
      ctx.scheduleSync();
    });
    $('dt-del-col').addEventListener('click', function () {
      var tctx = design.tableContext(ctx.getSelectedElement());
      if (!tctx || tctx.cellIndex < 0 || tctx.colCount <= 1) return;
      for (var i = tctx.table.rows.length - 1; i >= 0; i--) {
        if (tctx.table.rows[i].cells.length > tctx.cellIndex) {
          tctx.table.rows[i].deleteCell(tctx.cellIndex);
        }
      }
      clearSelection();
      ctx.scheduleSync();
    });

    /* ---- 選択状態の反映 ---- */
    var TABLE_TAGS = ['TABLE', 'TR', 'TD', 'TH', 'THEAD', 'TBODY', 'TFOOT'];

    function showSelection(tag, styles, ancestors) {
      $('dt-element-tag').textContent = tag;
      $('dt-hint').style.display = 'none';
      $('dt-controls').style.display = '';
      $('dt-actions').style.display = 'flex';

      renderBreadcrumb(tag, ancestors);

      // Colors
      var bgHex = App.colorToHex(styles.backgroundColor);
      $('dt-bg-color').value = bgHex || '#ffffff';
      $('dt-bg-color-text').value = bgHex || 'transparent';
      var textHex = App.colorToHex(styles.color);
      $('dt-text-color').value = textHex || '#000000';
      $('dt-text-color-text').value = textHex || '';
      var borderHex = App.colorToHex(styles.borderColor);
      $('dt-border-color').value = borderHex || '#000000';
      $('dt-border-color-text').value = borderHex || '';

      // Typography
      var fs = App.parsePx(styles.fontSize);
      $('dt-font-size-slider').value = fs;
      $('dt-font-size').value = fs;
      $('dt-font-weight').value = String(parseInt(styles.fontWeight, 10) || 400);
      $('dt-text-align-group')
        .querySelectorAll('.dt-btn-sm')
        .forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-align') === styles.textAlign);
        });
      var lh = parseFloat(styles.lineHeight);
      if (isNaN(lh) || styles.lineHeight === 'normal') lh = 1.5;
      else lh = parseFloat((lh / fs).toFixed(2)) || 1.5;
      $('dt-line-height-slider').value = lh;
      $('dt-line-height').value = lh;

      // Spacing: data-prop名でstylesから直接引く
      document.querySelectorAll('.dt-box-input').forEach(function (input) {
        input.value = App.parsePx(styles[input.getAttribute('data-prop')]);
      });

      // Box
      $('dt-width').value = styles.width === 'auto' ? '' : styles.width;
      $('dt-height').value = styles.height === 'auto' ? '' : styles.height;
      var br = App.parsePx(styles.borderRadius);
      $('dt-border-radius-slider').value = Math.min(br, 50);
      $('dt-border-radius').value = br;
      var op = parseFloat(styles.opacity);
      $('dt-opacity-slider').value = isNaN(op) ? 1 : op;
      $('dt-opacity-value').textContent = isNaN(op) ? '1' : op.toFixed(2);
      $('dt-display').value = styles.display || 'block';
      $('dt-overflow').value = styles.overflow || 'visible';

      // Table セクションはテーブル系要素選択時のみ表示
      var isTable = TABLE_TAGS.indexOf(tag.split(/[#.]/)[0].toUpperCase()) !== -1;
      $('dt-table-header').style.display = isTable ? '' : 'none';
      $('dt-table').style.display = isTable ? '' : 'none';
    }

    function renderBreadcrumb(tag, ancestors) {
      var breadcrumb = $('dt-breadcrumb');
      breadcrumb.innerHTML = '';
      if (!ancestors || ancestors.length === 0) return;
      ancestors.forEach(function (anc, idx) {
        var span = document.createElement('span');
        span.className = 'dt-breadcrumb-item';
        span.textContent = anc;
        span.title = anc;
        var depth = ancestors.length - idx;
        span.addEventListener('click', function () {
          ctx.sendToIframe({ type: '__design_select_ancestor__', depth: depth });
        });
        breadcrumb.appendChild(span);
        var sep = document.createElement('span');
        sep.className = 'dt-breadcrumb-sep';
        sep.textContent = '›';
        breadcrumb.appendChild(sep);
      });
      var current = document.createElement('span');
      current.className = 'dt-breadcrumb-item active';
      current.textContent = tag;
      breadcrumb.appendChild(current);
    }

    function clearSelection() {
      $('dt-hint').style.display = '';
      $('dt-controls').style.display = 'none';
      $('dt-actions').style.display = 'none';
      $('dt-element-tag').textContent = '--';
      $('dt-breadcrumb').innerHTML = '';
    }

    return {
      showSelection: showSelection,
      clearSelection: clearSelection,
      closeDropdown: closeDropdown,
      isDropdownOpen: function () {
        return state.dropdownOpen;
      },
    };
  };
})();
