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

  function createTextareaFallback(textarea) {
    var listeners = [];
    textarea.addEventListener('input', function () {
      listeners.forEach(function (fn) {
        fn();
      });
    });
    return {
      getValue: function () {
        return textarea.value;
      },
      setValue: function (v) {
        textarea.value = v;
      },
      on: function (ev, fn) {
        if (ev === 'change') listeners.push(fn);
      },
      undo: function () {
        textarea.focus();
        try { document.execCommand('undo'); } catch (e) { /* 非対応ブラウザは無視 */ }
      },
      redo: function () {
        textarea.focus();
        try { document.execCommand('redo'); } catch (e) { /* 非対応ブラウザは無視 */ }
      },
      lastLine: function () {
        return textarea.value.split('\n').length - 1;
      },
      getLine: function (n) {
        return textarea.value.split('\n')[n] || '';
      },
      replaceRange: function (text) {
        textarea.value = text;
      },
      // Design Mode が利用する拡張API（フォールバック時はno-op）
      operation: function (fn) { fn(); },
      refresh: function () {},
      scrollIntoView: function () {},
      addLineClass: function () {},
      removeLineClass: function () {},
      getSearchCursor: function () {
        return {
          findNext: function () { return false; },
          from: function () { return { line: 0, ch: 0 }; },
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
