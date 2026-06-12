/**
 * keymap.js — 宣言的キーボードショートカット
 *
 * バインディング定義（key/ctrl/shift/alt/when/run/help）の単一の配列から
 * ハンドラとヘルプモーダルの表を両方生成する。実装とヘルプ表の
 * 二重管理によるドリフトを防ぐ。
 */
(function () {
  'use strict';
  var App = (window.App = window.App || {});

  App.createKeymap = function (bindings) {
    return function handler(e) {
      for (var i = 0; i < bindings.length; i++) {
        var b = bindings[i];
        if (e.key !== b.key) continue;
        if (!!b.ctrl !== e.ctrlKey) continue;
        // Ctrl/Altを伴わない印字キー（'?' 等）はShift状態が e.key に反映済みのため
        // 照合しない（US配列では '?' = Shift+/ で shiftKey=true になる）
        var shiftAgnostic = !b.ctrl && !b.alt && b.key.length === 1;
        if (!shiftAgnostic && !!b.shift !== e.shiftKey) continue;
        if (!!b.alt !== e.altKey) continue;
        if (b.when && !b.when(e)) continue;
        e.preventDefault();
        b.run(e);
        return;
      }
    };
  };

  /**
   * バインディング定義からヘルプ表の <tr> 群を生成する。
   * extraRows: キーマップ外の説明行 [['Esc', '閉じる'], ...]
   */
  App.renderHelpRows = function (tableEl, bindings, extraRows) {
    var rows = bindings
      .filter(function (b) {
        return b.help;
      })
      .map(function (b) {
        return b.help;
      })
      .concat(extraRows || []);

    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      var tdKeys = document.createElement('td');
      // 'Ctrl + Shift + C' -> <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd>
      row[0].split(' + ').forEach(function (part, idx) {
        if (idx > 0) tdKeys.appendChild(document.createTextNode(' + '));
        // '1 / 2 / 3' のような選択肢はスラッシュ区切りでkbd化
        part.split(' / ').forEach(function (alt, j) {
          if (j > 0) tdKeys.appendChild(document.createTextNode(' / '));
          var kbd = document.createElement('kbd');
          kbd.textContent = alt;
          tdKeys.appendChild(kbd);
        });
      });
      var tdDesc = document.createElement('td');
      tdDesc.textContent = row[1];
      tr.appendChild(tdKeys);
      tr.appendChild(tdDesc);
      tableEl.appendChild(tr);
    });
  };

  /** 入力中（エディタ/フォーム/contentEditable）かどうか */
  App.isTypingContext = function (target) {
    if (!target || !target.closest) return false;
    return !!(
      target.closest('.CodeMirror') ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    );
  };
})();
