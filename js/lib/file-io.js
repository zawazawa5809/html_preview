/**
 * file-io.js — HTMLファイルの読み込み/ダウンロード/ファイル名生成
 */
(function () {
  'use strict';
  var App = (window.App = window.App || {});

  var MAX_FILE_BYTES = 5 * 1024 * 1024;
  // 英数・記号の一部・空白・日本語（記号/かな/カナ/全角英数/漢字）以外を _ に置換
  var FILENAME_UNSAFE = /[^a-z0-9_\-\s\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\u4E00-\u9FAF]+/gi;
  var WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

  /**
   * <title> からダウンロード用ファイル名を生成する。
   * opts: { fallback: title不在時のベース名, suffix: 末尾文字列(任意) }
   */
  App.filenameFromTitle = function (html, opts) {
    var suffix = opts.suffix || '';
    var m = (html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    var base;
    if (m && m[1] && m[1].trim()) {
      base = m[1].trim().replace(FILENAME_UNSAFE, '_').replace(/\s+/g, '_');
      if (WINDOWS_RESERVED.test(base)) base = '_' + base;
    } else {
      base = opts.fallback;
    }
    return base + suffix + '.html';
  };

  /** JST(+9:00)の YYYYMMDD_hhmmss */
  App.jstTimestamp = function (date) {
    var now = date || new Date();
    var jst = new Date(now.getTime() + 9 * 60 * 60000);
    function pad(n) {
      return String(n).padStart(2, '0');
    }
    return (
      jst.getUTCFullYear() +
      pad(jst.getUTCMonth() + 1) +
      pad(jst.getUTCDate()) +
      '_' +
      pad(jst.getUTCHours()) +
      pad(jst.getUTCMinutes()) +
      pad(jst.getUTCSeconds())
    );
  };

  App.validateHtmlFile = function (file) {
    if (!file) return { ok: false, error: 'ファイルがありません' };
    if (file.size > MAX_FILE_BYTES) {
      return { ok: false, error: 'ファイルサイズが5MBを超えています' };
    }
    var ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (ext !== '.html' && ext !== '.htm') {
      return { ok: false, error: 'HTMLファイル(.html, .htm)のみ対応しています' };
    }
    return { ok: true };
  };

  /**
   * HTMLファイルを検証して読み込む。
   * handlers: { onLoad(text), onError(message) }
   */
  App.readHtmlFile = function (file, handlers) {
    var check = App.validateHtmlFile(file);
    if (!check.ok) {
      if (file) handlers.onError(check.error);
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      handlers.onLoad(e.target.result);
    };
    reader.onerror = function () {
      handlers.onError('ファイルの読み込みに失敗しました');
    };
    reader.onabort = function () {
      handlers.onError('ファイルの読み込みが中断されました');
    };
    reader.readAsText(file);
  };

  App.downloadHtml = function (html, filename) {
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link); // Firefox はDOM接続が必要
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };
})();
