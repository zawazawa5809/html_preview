/**
 * editor.js — CodeMirror 初期化と textarea フォールバック
 *
 * 返り値は CodeMirror インスタンス互換のオブジェクト。
 * vendor/ の CodeMirror が読み込めない異常時でも、textarea のまま
 * 同一APIで動作を継続する。
 */
(function () {
  'use strict';
  var App = (window.App = window.App || {});

  var FALLBACK_HISTORY_LIMIT = 100;

  function createTextareaFallback(textarea) {
    var listeners = [];
    // 非推奨の document.execCommand('undo') に依存しない自前の履歴スタック
    var history = [textarea.value];
    var hIndex = 0;

    function notifyChange() {
      listeners.forEach(function (fn) {
        fn();
      });
    }

    function record() {
      if (textarea.value === history[hIndex]) return;
      history = history.slice(0, hIndex + 1);
      history.push(textarea.value);
      if (history.length > FALLBACK_HISTORY_LIMIT) history.shift();
      hIndex = history.length - 1;
    }

    function restore(index) {
      hIndex = index;
      textarea.value = history[hIndex];
      notifyChange();
    }

    textarea.addEventListener('input', function () {
      record();
      notifyChange();
    });

    return {
      getValue: function () {
        return textarea.value;
      },
      setValue: function (v) {
        textarea.value = v;
        record();
      },
      on: function (ev, fn) {
        if (ev === 'change') listeners.push(fn);
      },
      undo: function () {
        if (hIndex > 0) restore(hIndex - 1);
      },
      redo: function () {
        if (hIndex < history.length - 1) restore(hIndex + 1);
      },
      lastLine: function () {
        return textarea.value.split('\n').length - 1;
      },
      getLine: function (n) {
        return textarea.value.split('\n')[n] || '';
      },
      replaceRange: function (text) {
        textarea.value = text;
        record();
      },
      // Design Mode が利用する拡張API（フォールバック時はno-op）
      operation: function (fn) {
        fn();
      },
      refresh: function () {},
      scrollIntoView: function () {},
      addLineClass: function () {},
      removeLineClass: function () {},
      getSearchCursor: function () {
        return {
          findNext: function () {
            return false;
          },
          from: function () {
            return { line: 0, ch: 0 };
          },
        };
      },
    };
  }

  /**
   * @param {HTMLTextAreaElement} textarea
   * @param {object} cmOptions CodeMirror.fromTextArea へのオプション
   * @param {function=} onFallback フォールバック発動時の通知
   */
  App.createEditor = function (textarea, cmOptions, onFallback) {
    if (typeof window.CodeMirror !== 'undefined') {
      return window.CodeMirror.fromTextArea(textarea, cmOptions);
    }
    if (onFallback) onFallback();
    return createTextareaFallback(textarea);
  };
})();
