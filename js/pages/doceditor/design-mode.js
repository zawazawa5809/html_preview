/**
 * design-mode.js — Design Mode のiframe注入機構
 *
 * 注入スクリプトは designRuntime() という通常の関数として定義し、
 * Function.prototype.toString() で文字列化して iframe に注入する。
 * 設定（token / 除外タグ / 収集プロパティ）は JSON 引数として渡すため、
 * designRuntime はこのファイルのスコープを参照してはならない（自己完結必須）。
 */
(function () {
  'use strict';
  var App = (window.App = window.App || {});
  var design = (App.design = App.design || {});

  /** 選択UIのアクセント色。styles/tokens.css の --da-secondary と同値 */
  design.ACCENT = '#5b8fcc';

  design.EXCLUDED_TAGS = ['HTML', 'HEAD', 'BODY', 'SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'NOSCRIPT', 'BR'];

  /** スタイルパネルと注入スクリプトが共有する computedStyle 収集対象 */
  design.STYLE_PROPS = [
    'backgroundColor',
    'color',
    'borderColor',
    'fontSize',
    'fontWeight',
    'textAlign',
    'lineHeight',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'marginTop',
    'marginRight',
    'marginBottom',
    'marginLeft',
    'width',
    'height',
    'borderRadius',
    'opacity',
    'display',
    'overflow',
  ];

  /** スタイルコピー/ペーストの対象プロパティ */
  design.COPY_STYLE_PROPS = [
    'backgroundColor',
    'color',
    'borderColor',
    'borderWidth',
    'borderStyle',
    'fontSize',
    'fontWeight',
    'fontFamily',
    'textAlign',
    'lineHeight',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'borderRadius',
    'opacity',
  ];

  /** designer注入物・編集用属性を取り除いた完全なHTMLを返す */
  design.serializeCleanHtml = function (doc) {
    var clone = doc.documentElement.cloneNode(true);
    clone.querySelectorAll('[data-designer-injected]').forEach(function (el) {
      el.remove();
    });
    ['data-designer-selected', 'contenteditable', 'draggable'].forEach(function (attr) {
      clone.querySelectorAll('[' + attr + ']').forEach(function (el) {
        el.removeAttribute(attr);
      });
    });
    return '<!DOCTYPE html>\n' + clone.outerHTML;
  };

  function siblingSkippingInjected(el, dir) {
    var prop = dir === 'prev' ? 'previousElementSibling' : 'nextElementSibling';
    var sib = el[prop];
    while (sib && sib.hasAttribute('data-designer-injected')) sib = sib[prop];
    return sib;
  }

  /**
   * 要素の移動/複製。アクションバー（iframe側）とDesignパネル（親側）の
   * 両方からこの1実装を使う。成功時 true。
   */
  design.elementAction = function (el, action) {
    if (action === 'move-up') {
      var prev = siblingSkippingInjected(el, 'prev');
      if (!prev) return false;
      el.parentNode.insertBefore(el, prev);
      return true;
    }
    if (action === 'move-down') {
      var next = siblingSkippingInjected(el, 'next');
      if (!next) return false;
      el.parentNode.insertBefore(next, el);
      return true;
    }
    if (action === 'duplicate') {
      var clone = el.cloneNode(true);
      clone.removeAttribute('data-designer-selected');
      el.parentNode.insertBefore(clone, el.nextSibling);
      return true;
    }
    return false;
  };

  /** 挿入テンプレート（子要素追加ドロップダウン） */
  design.templates = {
    container: function (doc) {
      var d = doc.createElement('div');
      d.style.cssText = 'max-width:800px;margin:0 auto;padding:16px';
      d.textContent = 'Container';
      return d;
    },
    section: function (doc) {
      var s = doc.createElement('section');
      s.style.cssText = 'padding:24px 0';
      s.textContent = 'Section';
      return s;
    },
    'flex-row': function (doc) {
      return buildItems(
        doc,
        'display:flex;gap:8px',
        3,
        'flex:1;padding:12px;background:#f0f1f5;border-radius:4px;text-align:center',
        'Item '
      );
    },
    'flex-col': function (doc) {
      return buildItems(
        doc,
        'display:flex;flex-direction:column;gap:8px',
        3,
        'padding:12px;background:#f0f1f5;border-radius:4px',
        'Item '
      );
    },
    'grid-2col': function (doc) {
      return buildItems(
        doc,
        'display:grid;grid-template-columns:1fr 1fr;gap:8px',
        4,
        'padding:12px;background:#f0f1f5;border-radius:4px;text-align:center',
        'Cell '
      );
    },
    divider: function (doc) {
      return doc.createElement('hr');
    },
    heading: function (doc) {
      var h = doc.createElement('h2');
      h.textContent = 'Heading';
      return h;
    },
    text: function (doc) {
      var p = doc.createElement('p');
      p.textContent = 'Text block content goes here.';
      return p;
    },
    list: function (doc) {
      var ul = doc.createElement('ul');
      for (var i = 1; i <= 3; i++) {
        var li = doc.createElement('li');
        li.textContent = 'List item ' + i;
        ul.appendChild(li);
      }
      return ul;
    },
    image: function (doc) {
      var d = doc.createElement('div');
      d.style.cssText =
        'width:200px;height:150px;border:2px dashed #ccc;display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;border-radius:4px';
      d.textContent = 'Image';
      return d;
    },
    button: function (doc) {
      var btn = doc.createElement('button');
      btn.textContent = 'Button';
      btn.style.cssText =
        'background:#3b82f6;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font:inherit';
      return btn;
    },
    link: function (doc) {
      var a = doc.createElement('a');
      a.href = '#';
      a.textContent = 'Link text';
      a.style.cssText = 'color:#3b82f6;text-decoration:underline';
      return a;
    },
    'page-break': function (doc) {
      var d = doc.createElement('div');
      d.setAttribute('data-page-break', 'true');
      d.style.cssText =
        'break-before:page;page-break-before:always;border:none;border-top:2px dashed #999;text-align:center;padding:8px 0;color:#999;font-size:12px;margin:16px 0';
      d.textContent = ' ';
      return d;
    },
  };

  function buildItems(doc, parentCss, count, itemCss, labelPrefix) {
    var d = doc.createElement('div');
    d.style.cssText = parentCss;
    for (var i = 1; i <= count; i++) {
      var item = doc.createElement('div');
      item.style.cssText = itemCss;
      item.textContent = labelPrefix + i;
      d.appendChild(item);
    }
    return d;
  }

  /** 選択要素からテーブル編集の文脈（table/row/cell位置）を解決する */
  design.tableContext = function (el) {
    if (!el) return null;
    var td = el.closest ? el.closest('td,th') : null;
    if (!td && (el.tagName === 'TD' || el.tagName === 'TH')) td = el;
    var tr = td ? td.parentElement : el.closest ? el.closest('tr') : null;
    if (!tr && el.tagName === 'TR') tr = el;
    var table = tr ? tr.closest('table') : el.closest ? el.closest('table') : null;
    if (!table && el.tagName === 'TABLE') table = el;
    if (!table) return null;
    return {
      table: table,
      tr: tr,
      td: td,
      rowIndex: tr ? tr.rowIndex : -1,
      cellIndex: td ? td.cellIndex : -1,
      colCount: table.rows.length > 0 ? table.rows[0].cells.length : 0,
    };
  };

  /** iframeに注入する選択/編集UI用CSS */
  design.injectionCss = function () {
    var ACCENT = design.ACCENT;
    return (
      '[data-designer-selected]{outline:2px dashed ' +
      ACCENT +
      '!important;outline-offset:2px!important}' +
      '.designer-hover-overlay{position:fixed;pointer-events:none;background:rgba(91,143,204,0.08);border:1px solid rgba(91,143,204,0.4);z-index:99998;transition:all 50ms}' +
      '.designer-hover-label{position:fixed;pointer-events:none;background:#1e1f25;color:#e2e4ec;font:11px/1.3 "Noto Sans Mono",Consolas,monospace;padding:2px 6px;border-radius:3px;z-index:99999;white-space:nowrap}' +
      '[draggable="true"]{cursor:grab}' +
      '.designer-dragging{opacity:0.3!important}' +
      '.designer-drop-before{box-shadow:inset 0 3px 0 0 ' +
      ACCENT +
      '!important}' +
      '.designer-drop-after{box-shadow:inset 0 -3px 0 0 ' +
      ACCENT +
      '!important}' +
      '.designer-drop-inside{outline:2px solid ' +
      ACCENT +
      '!important;background:rgba(91,143,204,0.06)!important}' +
      '.designer-action-bar{position:fixed;display:flex;gap:2px;background:#1e1f25;border:1px solid #353842;border-radius:6px;padding:3px;z-index:99997;box-shadow:0 4px 12px rgba(0,0,0,0.3)}' +
      '.designer-action-bar button{background:none;border:none;color:#c4c8d6;cursor:pointer;padding:4px 6px;border-radius:4px;line-height:1;display:flex;align-items:center;justify-content:center;min-width:26px;min-height:26px}' +
      '.designer-action-bar button svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      '.designer-action-bar button:hover{background:#353842;color:#f0f1f5}' +
      '.designer-resize-handle{position:fixed;width:8px;height:8px;background:' +
      ACCENT +
      ';border:1px solid #fff;border-radius:50%;z-index:99996;pointer-events:auto;box-shadow:0 0 3px rgba(0,0,0,0.3)}' +
      ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
        .map(function (dir) {
          return '.designer-resize-handle[data-dir="' + dir + '"]{cursor:' + dir + '-resize}';
        })
        .join('') +
      '.designer-resize-overlay{position:fixed;top:0;left:0;width:100%;height:100%;z-index:99995;cursor:inherit}' +
      '[data-page-break]{break-before:page;border:none;border-top:2px dashed #999;text-align:center;padding:8px 0;color:#999;font-size:12px;margin:16px 0;position:relative}' +
      '[data-page-break]::after{content:"Page Break";background:#fff;padding:0 12px;position:relative}' +
      '@media print{[data-page-break]{color:transparent;border:none;padding:0;margin:0}[data-page-break]::after{display:none}}'
    );
  };

  /* ================================================================
   * 注入ランタイム本体。
   * - cfg 引数（token/excluded/styleProps）以外の外部スコープ参照は禁止
   * - 任意のユーザーHTML内で動くため ES5 で記述
   * ================================================================ */
  function designRuntime(cfg) {
    'use strict';
    var TOKEN = cfg.token;
    var EXCLUDED = new Set(cfg.excluded);
    var STYLE_PROPS = cfg.styleProps;
    var selected = null;

    function post(data) {
      data.token = TOKEN;
      parent.postMessage(data, '*');
    }

    function tagInfo(el) {
      var s = el.tagName.toLowerCase();
      if (el.id) s += '#' + el.id;
      if (el.className && typeof el.className === 'string') {
        var cls = el.className.split(/\s+/).filter(function (c) {
          return c && c.indexOf('designer') === -1;
        });
        if (cls.length) s += '.' + cls.join('.');
      }
      return s;
    }

    function isInjected(el) {
      while (el) {
        if (el.hasAttribute && el.hasAttribute('data-designer-injected')) return true;
        el = el.parentElement;
      }
      return false;
    }

    function isExcluded(el) {
      return !el || !el.tagName || EXCLUDED.has(el.tagName) || isInjected(el);
    }

    /** computedStyle のスナップショット（パネル表示用） */
    function snapshot(el) {
      var cs = window.getComputedStyle(el);
      var styles = {};
      STYLE_PROPS.forEach(function (prop) {
        styles[prop] = cs[prop];
      });
      return styles;
    }

    /** 選択状態を親に通知し、選択UI（アクションバー/リサイズハンドル）を更新 */
    function notifySelect(el) {
      var ancestors = [];
      var p = el.parentElement;
      while (p && p.tagName && !EXCLUDED.has(p.tagName)) {
        ancestors.unshift(tagInfo(p));
        p = p.parentElement;
      }
      post({ type: '__design_click__', tag: tagInfo(el), styles: snapshot(el), ancestors: ancestors });
      showActionBar(el);
      updateResizeHandles(el);
    }

    function select(el) {
      if (selected) selected.removeAttribute('data-designer-selected');
      selected = el;
      el.setAttribute('data-designer-selected', 'true');
      notifySelect(el);
    }

    function mkInjected(tag, className) {
      var el = document.createElement(tag);
      if (className) el.className = className;
      el.setAttribute('data-designer-injected', 'true');
      el.style.display = 'none';
      document.body.appendChild(el);
      return el;
    }

    /* ---- hover overlay ---- */
    var hoverOverlay = mkInjected('div', 'designer-hover-overlay');
    var hoverLabel = mkInjected('div', 'designer-hover-label');

    document.addEventListener('mouseover', function (e) {
      var el = e.target;
      if (isExcluded(el)) {
        hoverOverlay.style.display = 'none';
        hoverLabel.style.display = 'none';
        return;
      }
      var r = el.getBoundingClientRect();
      hoverOverlay.style.display = 'block';
      hoverOverlay.style.left = r.left + 'px';
      hoverOverlay.style.top = r.top + 'px';
      hoverOverlay.style.width = r.width + 'px';
      hoverOverlay.style.height = r.height + 'px';
      hoverLabel.style.display = 'block';
      hoverLabel.textContent = tagInfo(el);
      var lTop = r.top - 20;
      if (lTop < 2) lTop = r.bottom + 4;
      hoverLabel.style.left = Math.max(0, r.left) + 'px';
      hoverLabel.style.top = lTop + 'px';
    });

    document.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
        hoverOverlay.style.display = 'none';
        hoverLabel.style.display = 'none';
      }
    });

    /* ---- click select ---- */
    document.addEventListener(
      'click',
      function (e) {
        var el = e.target;
        if (isInjected(el)) return;
        if (isExcluded(el)) return;
        e.preventDefault();
        e.stopPropagation();
        select(el);
      },
      true
    );

    /* ---- dblclick: contentEditable でテキスト編集 ---- */
    document.addEventListener('dblclick', function (e) {
      var el = e.target;
      if (isExcluded(el) || isInjected(el)) return;
      e.preventDefault();
      el.contentEditable = 'true';
      el.focus();
      el.addEventListener('paste', function onPaste(pe) {
        pe.preventDefault();
        var text = (pe.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
      });
      el.addEventListener('blur', function onBlur() {
        el.contentEditable = 'false';
        el.removeEventListener('blur', onBlur);
        post({ type: '__design_change__' });
      });
    });

    /* ---- keyboard ---- */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && selected) {
        selected.removeAttribute('data-designer-selected');
        selected = null;
        hideResizeHandles();
        showActionBar(null);
        post({ type: '__design_deselect__' });
      }
      if (e.key === 'Delete' && selected && !selected.isContentEditable) {
        e.preventDefault();
        // 削除は親側に集約（「元に戻す」トーストを出すため）
        post({ type: '__design_action__', action: 'delete' });
      }
    });

    /* ---- floating action bar ---- */
    var ACTION_ICONS = {
      delete:
        '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
      duplicate:
        '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
      'move-up': '<svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>',
      'move-down': '<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>',
    };
    var actionBar = mkInjected('div', 'designer-action-bar');
    actionBar.innerHTML = Object.keys(ACTION_ICONS)
      .map(function (action) {
        return '<button data-action="' + action + '" title="' + action + '">' + ACTION_ICONS[action] + '</button>';
      })
      .join('');

    function showActionBar(el) {
      if (!el) {
        actionBar.style.display = 'none';
        return;
      }
      var r = el.getBoundingClientRect();
      actionBar.style.display = 'flex';
      var barTop = r.top - 34;
      if (barTop < 4) barTop = r.bottom + 4;
      actionBar.style.left = Math.max(4, r.left) + 'px';
      actionBar.style.top = barTop + 'px';
    }

    actionBar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn || !selected) return;
      e.preventDefault();
      e.stopPropagation();
      post({ type: '__design_action__', action: btn.getAttribute('data-action') });
    });

    document.addEventListener(
      'scroll',
      function () {
        if (selected) {
          showActionBar(selected);
          updateResizeHandles(selected);
        }
      },
      true
    );

    /* ---- parent -> iframe: 祖先選択（ブレッドクラム） ---- */
    window.addEventListener('message', function (e) {
      if (!e.data || e.data.token !== TOKEN) return;
      if (e.data.type === '__design_select_ancestor__') {
        if (!selected) return;
        var target = selected;
        for (var i = 0; i < e.data.depth; i++) {
          if (target.parentElement && !EXCLUDED.has(target.parentElement.tagName)) {
            target = target.parentElement;
          } else break;
        }
        if (isExcluded(target)) return;
        select(target);
      }
    });

    /* ---- drag & drop 並べ替え ---- */
    var dragEl = null;
    var dropTarget = null;
    var dropPosition = null;
    var prevDropTarget = null;

    document.addEventListener('mousedown', function (e) {
      var el = e.target;
      if (isExcluded(el) || isInjected(el)) return;
      if (el.isContentEditable) return;
      el.setAttribute('draggable', 'true');
    });

    document.addEventListener('mouseup', function (e) {
      if (!dragEl) {
        var el = e.target;
        if (el.hasAttribute && el.hasAttribute('draggable')) el.removeAttribute('draggable');
      }
    });

    function clearDropIndicators() {
      if (prevDropTarget) {
        prevDropTarget.classList.remove('designer-drop-before', 'designer-drop-after', 'designer-drop-inside');
        prevDropTarget = null;
      }
    }

    document.addEventListener('dragstart', function (e) {
      if (resizing) {
        e.preventDefault();
        return;
      }
      var el = e.target;
      if (isExcluded(el) || isInjected(el)) {
        e.preventDefault();
        return;
      }
      dragEl = el;
      el.classList.add('designer-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
    });

    document.addEventListener('dragover', function (e) {
      if (!dragEl) {
        // 要素ドラッグ中でなければ画像ファイルドロップの受け入れ判定
        if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.indexOf('Files') !== -1) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      var target = e.target;
      if (isExcluded(target) || isInjected(target) || target === dragEl || dragEl.contains(target)) {
        clearDropIndicators();
        dropTarget = null;
        return;
      }
      clearDropIndicators();
      var r = target.getBoundingClientRect();
      var y = e.clientY - r.top;
      var third = r.height / 3;
      if (y < third) {
        target.classList.add('designer-drop-before');
        dropPosition = 'before';
      } else if (y > third * 2) {
        target.classList.add('designer-drop-after');
        dropPosition = 'after';
      } else {
        target.classList.add('designer-drop-inside');
        dropPosition = 'inside';
      }
      dropTarget = target;
      prevDropTarget = target;
    });

    document.addEventListener('drop', function (e) {
      if (!dragEl) {
        dropImageFile(e);
        return;
      }
      e.preventDefault();
      if (!dropTarget || dragEl.contains(dropTarget)) return;
      clearDropIndicators();
      if (dropPosition === 'before') {
        dropTarget.parentNode.insertBefore(dragEl, dropTarget);
      } else if (dropPosition === 'after') {
        dropTarget.parentNode.insertBefore(dragEl, dropTarget.nextSibling);
      } else if (dropPosition === 'inside') {
        dropTarget.appendChild(dragEl);
      }
      post({ type: '__design_change__' });
    });

    document.addEventListener('dragend', function () {
      clearDropIndicators();
      if (dragEl) {
        dragEl.classList.remove('designer-dragging');
        dragEl.removeAttribute('draggable');
      }
      dragEl = dropTarget = dropPosition = null;
    });

    /* ---- 画像ファイルのドロップ挿入 ---- */
    function dropImageFile(e) {
      if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
      var file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) return;
      e.preventDefault();
      if (file.size > 2 * 1024 * 1024) {
        post({ type: '__design_toast__', msg: '画像が2MBを超えています', err: true });
        return;
      }
      var reader = new FileReader();
      reader.onload = function (ev) {
        var img = document.createElement('img');
        img.src = ev.target.result;
        img.style.cssText = 'max-width:100%;height:auto;display:block;margin:8px 0';
        img.alt = 'Dropped image';
        var target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && !isExcluded(target) && !isInjected(target)) {
          if (target.tagName === 'IMG' || target.tagName === 'BR') {
            target.parentNode.insertBefore(img, target.nextSibling);
          } else {
            target.appendChild(img);
          }
        } else {
          document.body.appendChild(img);
        }
        post({ type: '__design_change__' });
        post({ type: '__design_toast__', msg: '画像を挿入しました' });
      };
      reader.readAsDataURL(file);
    }

    /* ---- 8方向リサイズハンドル ---- */
    var HANDLE_HALF = 4; // ハンドル幅8pxの半分
    var resizeHandles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(function (dir) {
      var h = mkInjected('div', 'designer-resize-handle');
      h.setAttribute('data-dir', dir);
      return h;
    });

    function updateResizeHandles(el) {
      if (!el) {
        hideResizeHandles();
        return;
      }
      var r = el.getBoundingClientRect();
      var positions = {
        nw: [r.left, r.top],
        n: [r.left + r.width / 2, r.top],
        ne: [r.right, r.top],
        e: [r.right, r.top + r.height / 2],
        se: [r.right, r.bottom],
        s: [r.left + r.width / 2, r.bottom],
        sw: [r.left, r.bottom],
        w: [r.left, r.top + r.height / 2],
      };
      resizeHandles.forEach(function (h) {
        var pos = positions[h.getAttribute('data-dir')];
        h.style.display = 'block';
        h.style.left = pos[0] - HANDLE_HALF + 'px';
        h.style.top = pos[1] - HANDLE_HALF + 'px';
      });
    }

    function hideResizeHandles() {
      resizeHandles.forEach(function (h) {
        h.style.display = 'none';
      });
    }

    var resizing = false;
    var resizeDir = null;
    var resizeStartX = 0;
    var resizeStartY = 0;
    var resizeStartW = 0;
    var resizeStartH = 0;
    var resizeTarget = null;
    var resizeOverlay = null;

    resizeHandles.forEach(function (h) {
      h.addEventListener('mousedown', function (e) {
        if (!selected) return;
        e.preventDefault();
        e.stopPropagation();
        resizing = true;
        resizeDir = h.getAttribute('data-dir');
        resizeTarget = selected;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        var cs = window.getComputedStyle(resizeTarget);
        resizeStartW = parseFloat(cs.width) || resizeTarget.offsetWidth;
        resizeStartH = parseFloat(cs.height) || resizeTarget.offsetHeight;
        // リサイズ中のマウスイベントを全て捕捉するオーバーレイ
        resizeOverlay = document.createElement('div');
        resizeOverlay.className = 'designer-resize-overlay';
        resizeOverlay.setAttribute('data-designer-injected', 'true');
        resizeOverlay.style.cursor = window.getComputedStyle(h).cursor;
        document.body.appendChild(resizeOverlay);
      });
    });

    document.addEventListener('mousemove', function (e) {
      if (!resizing || !resizeTarget) return;
      e.preventDefault();
      var dx = e.clientX - resizeStartX;
      var dy = e.clientY - resizeStartY;
      var newW = resizeStartW;
      var newH = resizeStartH;
      if (/e/.test(resizeDir)) newW = Math.max(10, resizeStartW + dx);
      if (/w/.test(resizeDir)) newW = Math.max(10, resizeStartW - dx);
      if (/s/.test(resizeDir)) newH = Math.max(10, resizeStartH + dy);
      if (/n/.test(resizeDir)) newH = Math.max(10, resizeStartH - dy);
      resizeTarget.style.width = Math.round(newW) + 'px';
      resizeTarget.style.height = Math.round(newH) + 'px';
      updateResizeHandles(resizeTarget);
      showActionBar(resizeTarget);
    });

    document.addEventListener('mouseup', function () {
      if (!resizing) return;
      resizing = false;
      resizeDir = null;
      if (resizeOverlay) {
        resizeOverlay.remove();
        resizeOverlay = null;
      }
      post({ type: '__design_change__' });
      if (resizeTarget) notifySelect(resizeTarget);
      resizeTarget = null;
    });

    /* ---- MutationObserver: 実DOM変更の検出 ---- */
    var observer = new MutationObserver(function (mutations) {
      var hasReal = mutations.some(function (m) {
        if (m.target && m.target.hasAttribute && m.target.hasAttribute('data-designer-injected')) return false;
        if (
          m.type === 'attributes' &&
          ['data-designer-injected', 'data-designer-selected', 'contenteditable', 'draggable'].indexOf(
            m.attributeName
          ) !== -1
        ) {
          return false;
        }
        if (m.type === 'childList') {
          var isReal = function (n) {
            return n.nodeType === 1 && !n.hasAttribute('data-designer-injected');
          };
          return Array.from(m.addedNodes).some(isReal) || Array.from(m.removedNodes).some(isReal);
        }
        return true;
      });
      if (hasReal) post({ type: '__design_change__' });
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'id', 'src', 'href'],
      characterData: true,
    });

    /* ---- テキスト選択時のフローティング書式ツールバー ---- */
    var FORMAT_BTN_BASE =
      'background:none;border:none;color:#c4c8d6;cursor:pointer;padding:4px 7px;border-radius:4px;font-size:13px;min-width:26px;min-height:26px';
    var FORMAT_BUTTONS = [
      { cmd: 'bold', title: '太字', label: 'B', css: 'font-weight:bold' },
      { cmd: 'italic', title: '斜体', label: 'I', css: 'font-style:italic' },
      { cmd: 'underline', title: '下線', label: 'U', css: 'text-decoration:underline' },
      { cmd: 'strikeThrough', title: '取消線', label: 'S', css: 'text-decoration:line-through' },
      { sep: true },
      {
        cmd: 'foreColor',
        title: '文字色',
        label: 'A',
        css: 'font-size:11px;position:relative;padding:2px 4px',
        color: '#ff0000',
      },
      {
        cmd: 'hiliteColor',
        title: '背景色',
        label: 'H',
        css: 'font-size:11px;position:relative;padding:2px 4px;background:#ffeb3b;color:#1e1f25',
        color: '#ffeb3b',
      },
      { sep: true },
      {
        cmd: 'createLink',
        title: 'リンク',
        label: 'Link',
        css: 'font-size:12px;color:#5b8fcc;text-decoration:underline',
      },
      { cmd: 'removeFormat', title: '書式クリア', label: '✕', css: 'font-size:12px;color:#d45a5a' },
    ];

    var formatBar = mkInjected('div');
    formatBar.style.cssText =
      'position:fixed;display:none;background:#1e1f25;border:1px solid #353842;border-radius:6px;padding:3px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.3);gap:1px;flex-wrap:nowrap';
    formatBar.innerHTML = FORMAT_BUTTONS.map(function (b) {
      if (b.sep) return '<span style="width:1px;background:#353842;margin:2px 2px;align-self:stretch"></span>';
      var colorInput = b.color
        ? '<input type="color" data-for="' +
          b.cmd +
          '" value="' +
          b.color +
          '" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%"/>'
        : '';
      return (
        '<button data-cmd="' +
        b.cmd +
        '" title="' +
        b.title +
        '" style="' +
        FORMAT_BTN_BASE +
        ';' +
        b.css +
        '">' +
        b.label +
        colorInput +
        '</button>'
      );
    }).join('');

    var formatBarTimeout = null;
    document.addEventListener('mouseup', function (e) {
      if (e.target.closest('[data-designer-injected]')) return;
      clearTimeout(formatBarTimeout);
      formatBarTimeout = setTimeout(function () {
        var sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          formatBar.style.display = 'none';
          return;
        }
        var rect = sel.getRangeAt(0).getBoundingClientRect();
        if (rect.width < 2) {
          formatBar.style.display = 'none';
          return;
        }
        formatBar.style.display = 'flex';
        var barTop = rect.top - 38;
        if (barTop < 4) barTop = rect.bottom + 6;
        formatBar.style.left = Math.max(4, rect.left + rect.width / 2 - 100) + 'px';
        formatBar.style.top = barTop + 'px';
      }, 50);
    });

    formatBar.addEventListener('mousedown', function (e) {
      e.preventDefault(); // テキスト選択を維持する
    });
    formatBar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cmd]');
      if (!btn) return;
      var cmd = btn.getAttribute('data-cmd');
      if (cmd === 'createLink') {
        var url = prompt('URL:');
        if (url) document.execCommand('createLink', false, url);
      } else if (cmd === 'foreColor' || cmd === 'hiliteColor') {
        return; // color input側で処理
      } else {
        document.execCommand(cmd, false, null);
      }
      post({ type: '__design_change__' });
    });
    formatBar.querySelectorAll('input[type=color]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        document.execCommand(this.getAttribute('data-for'), false, this.value);
        post({ type: '__design_change__' });
      });
    });
    document.addEventListener('mousedown', function (e) {
      if (!e.target.closest('[data-designer-injected]')) {
        setTimeout(function () {
          var sel = window.getSelection();
          if (!sel || sel.isCollapsed) formatBar.style.display = 'none';
        }, 10);
      }
    });
  }

  /** 注入用スクリプト文字列を生成する */
  design.buildInjectionScript = function (token) {
    var cfg = {
      token: token,
      excluded: design.EXCLUDED_TAGS,
      styleProps: design.STYLE_PROPS,
    };
    return '(' + designRuntime.toString() + ')(' + JSON.stringify(cfg) + ');';
  };

  /** iframe document に Design Mode のCSSとスクリプトを注入する */
  design.injectInto = function (iframeDoc, token) {
    if (!iframeDoc || !iframeDoc.body) return;
    iframeDoc.querySelectorAll('[data-designer-injected]').forEach(function (el) {
      el.remove();
    });
    var style = iframeDoc.createElement('style');
    style.setAttribute('data-designer-injected', 'true');
    style.textContent = design.injectionCss();
    (iframeDoc.head || iframeDoc.documentElement).appendChild(style);

    var script = iframeDoc.createElement('script');
    script.setAttribute('data-designer-injected', 'true');
    script.textContent = design.buildInjectionScript(token);
    iframeDoc.body.appendChild(script);
  };
})();
