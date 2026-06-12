/**
 * storage.js — localStorage の安全な読み書きとコード自動保存
 */
(function () {
  'use strict';
  var App = (window.App = window.App || {});

  App.safeGet = function (key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      App.logError('storage', error);
      return null;
    }
  };

  App.safeSet = function (key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      App.logError('storage', error);
      return false;
    }
  };

  /** ツールバーの保存ステータス表示（保存中…/✓ 自動保存済み/保存失敗） */
  App.createSaveStatus = function (el) {
    return function setStatus(status) {
      if (!el) return;
      el.classList.remove('is-saved', 'is-error');
      if (status === 'saving') {
        el.textContent = '保存中…';
      } else if (status === 'saved') {
        el.textContent = '✓ 自動保存済み';
        el.classList.add('is-saved');
      } else if (status === 'error') {
        el.textContent = '保存失敗';
        el.classList.add('is-error');
      }
    };
  };

  /**
   * エディタ内容の自動保存ストア。
   * opts: { key, quotaWarnChars, setStatus(status), warn(message) }
   */
  App.createCodeStore = function (opts) {
    var quotaWarned = false;

    function save(code) {
      try {
        localStorage.setItem(opts.key, code);
        opts.setStatus('saved');
        if (code.length > opts.quotaWarnChars) {
          if (!quotaWarned) {
            quotaWarned = true;
            opts.warn('保存データがブラウザ保存の上限に近づいています。ファイルとして保存してください');
          }
        } else {
          quotaWarned = false;
        }
      } catch (error) {
        opts.setStatus('error');
        if (error.name === 'QuotaExceededError') {
          opts.warn('ストレージの容量が不足しています。ファイルとして保存してください (Ctrl+S)');
        }
        App.logError('save', error);
      }
    }

    return {
      save: save,
      load: function () {
        return App.safeGet(opts.key);
      },
    };
  };
})();
