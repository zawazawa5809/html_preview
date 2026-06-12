/**
 * preview.js — iframe へのプレビュー描画
 */
(function () {
  'use strict';
  var App = (window.App = window.App || {});

  function getIframeDoc(iframe) {
    return iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
  }

  /**
   * HTMLをiframeに描画する。失敗時はエラー表示を描画して false を返す。
   */
  App.renderPreview = function (iframe, html) {
    var doc = getIframeDoc(iframe);
    if (!doc) return false;
    try {
      doc.open();
      doc.write(html);
      doc.close();
      return true;
    } catch (error) {
      App.logError('preview', error);
      try {
        doc.open();
        doc.write(
          '<div style="padding:20px;background:#fff3cd;border:1px solid #ffeaa7;color:#856404;font-family:system-ui">' +
            '<h3 style="margin-top:0">プレビューエラー</h3>' +
            '<pre style="background:#f8f9fa;padding:10px;border-radius:4px;overflow-x:auto">' +
            App.escHtml(error.message || String(error)) +
            '</pre></div>'
        );
        doc.close();
      } catch (e) {
        App.logError('preview-error-render', e);
      }
      return false;
    }
  };

  App.getIframeDoc = getIframeDoc;
})();
