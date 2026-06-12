/**
 * pages/index.js — HTMLプレビューアーのエントリポイント
 */
(function () {
  'use strict';
  var App = window.App;

  var CONFIG = {
    storageKey: 'htmlPreviewerCode',
    layoutStorageKey: 'htmlPreviewerLayout',
    themeStorageKey: 'htmlPreviewerTheme',
    debounceDelay: 300,
    quotaWarnChars: 3.5 * 1024 * 1024, // localStorage上限(約5M文字)に近づいたら警告
  };

  var DEFAULT_CONTENT =
    '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>サンプルページ</title>' +
    '<style>:root{--p:#1f2937;--s:#3b82f6;--w:#fff;--g:#f9fafb;--d:#111827}' +
    'body{font-family:system-ui,sans-serif;font-size:16px;line-height:1.6;margin:0;padding:24px;background:var(--g);color:var(--d)}' +
    '.c{max-width:800px;margin:0 auto;padding:32px;background:var(--w);border-radius:8px;box-shadow:0 4px 6px -1px rgba(0,0,0,.1)}' +
    'h1{font-size:32px;font-weight:700;color:var(--p);border-bottom:2px solid var(--s);padding-bottom:12px;margin-bottom:24px}' +
    'p{margin-bottom:16px}' +
    '.btn{background:var(--s);color:var(--w);border:none;padding:12px 24px;border-radius:6px;cursor:pointer;font:inherit;transition:background .2s,transform .2s}' +
    '.btn:hover{background:#2563eb;transform:translateY(-1px)}</style></head>' +
    '<body><div class="c"><h1>HTMLプレビューアーへようこそ</h1>' +
    '<p>エディタにHTMLコードを入力または貼り付けると、こちらにリアルタイムでプレビューが表示されます。</p>' +
    '<p>ツールバーのボタンでレイアウトを変更したり、ファイルを保存したりできます。</p>' +
    '<button class="btn" onclick="alert(\'こんにちは！\')">クリックテスト</button></div></body></html>';

  function $(id) {
    return document.getElementById(id);
  }

  var iframe = $('preview-container');
  var helpOverlay = $('help-overlay');

  /* ---- 基盤コントローラ ---- */
  var setSaveStatus = App.createSaveStatus($('save-status'));
  var store = App.createCodeStore({
    key: CONFIG.storageKey,
    quotaWarnChars: CONFIG.quotaWarnChars,
    setStatus: setSaveStatus,
    warn: function (msg) {
      App.showToast(msg, 'error');
    },
  });
  var theme = App.createTheme({
    storageKey: CONFIG.themeStorageKey,
    button: $('theme-toggle-btn'),
  });
  var layout = App.createLayout({
    storageKey: CONFIG.layoutStorageKey,
    splitView: $('split-view'),
    editorPane: $('editor-container'),
    previewPane: $('preview-panel'),
    buttons: { lr: $('layout-lr-btn'), tb: $('layout-tb-btn'), po: $('layout-po-btn') },
  });

  var editor = App.createEditor(
    $('html-editor'),
    { lineNumbers: true, mode: 'htmlmixed' },
    function onFallback() {
      var div = document.createElement('div');
      div.className = 'asset-warning';
      div.setAttribute('role', 'alert');
      div.textContent =
        'エディタ拡張（CodeMirror）の読み込みに失敗したため、簡易エディタで動作しています。vendor/ フォルダが揃っているか確認してください。';
      document.body.insertBefore(div, $('split-view'));
    }
  );

  var scheduleSave = App.debounce(function () {
    store.save(editor.getValue());
  }, CONFIG.debounceDelay);

  /** 編集内容の反映: プレビュー更新 + 自動保存 */
  function commitChange() {
    App.renderPreview(iframe, editor.getValue());
    setSaveStatus('saving');
    scheduleSave();
  }

  /* ---- エディター操作 ---- */
  function setContentWithUndo(newContent, doneMessage, undoneMessage) {
    var previous = editor.getValue();
    editor.setValue(newContent);
    commitChange();
    App.showToast(doneMessage, 'success', {
      actionLabel: '元に戻す',
      onAction: function () {
        editor.setValue(previous);
        commitChange();
        App.showToast(undoneMessage);
      },
    });
  }

  function clearEditor() {
    if (editor.getValue().trim() === '') {
      App.showToast('エディターは既に空です');
      return;
    }
    setContentWithUndo('', 'エディターをクリアしました', 'クリアを元に戻しました');
  }

  function copyEditor() {
    var content = editor.getValue();
    if (content.trim() === '') {
      App.showToast('コピーする内容がありません');
      return;
    }
    navigator.clipboard.writeText(content).then(
      function () {
        App.showToast('エディター内容をクリップボードにコピーしました');
      },
      function (error) {
        App.logError('copy', error);
        App.showToast('コピーに失敗しました', 'error');
      }
    );
  }

  function pasteEditor() {
    navigator.clipboard.readText().then(
      function (text) {
        if (!text.trim()) {
          App.showToast('クリップボードが空です', 'error');
          return;
        }
        setContentWithUndo(text, 'クリップボードから貼り付けました', '貼り付けを元に戻しました');
      },
      function (error) {
        App.logError('paste', error);
        App.showToast('貼り付けに失敗しました', 'error');
      }
    );
  }

  function openFile(file) {
    App.readHtmlFile(file, {
      onLoad: function (text) {
        setContentWithUndo(text, 'ファイルを読み込みました', '読み込み前の内容に戻しました');
      },
      onError: function (msg) {
        App.showToast(msg, 'error');
      },
    });
  }

  function saveToFile() {
    var html = editor.getValue();
    App.downloadHtml(html, App.filenameFromTitle(html, { fallback: 'preview' }));
  }

  /* ---- ヘルプモーダル ---- */
  function toggleHelp() {
    helpOverlay.hidden = !helpOverlay.hidden;
  }
  function closeHelp() {
    helpOverlay.hidden = true;
  }

  /* ---- キーボードショートカット（ヘルプ表もこの定義から生成） ---- */
  var KEY_BINDINGS = [
    {
      key: 'Escape',
      when: function () {
        return !helpOverlay.hidden;
      },
      run: closeHelp,
      help: null,
    },
    {
      key: '?',
      when: function (e) {
        return !App.isTypingContext(e.target);
      },
      run: toggleHelp,
      help: ['?', 'このヘルプを表示'],
    },
    { key: 's', ctrl: true, run: saveToFile, help: ['Ctrl + S', 'HTMLファイルをダウンロード'] },
    { key: 'z', ctrl: true, run: function () { editor.undo(); }, help: ['Ctrl + Z', '元に戻す'] },
    { key: 'y', ctrl: true, run: function () { editor.redo(); }, help: ['Ctrl + Y', 'やり直す'] },
    { key: 'Z', ctrl: true, shift: true, run: function () { editor.redo(); }, help: null },
    { key: 'C', ctrl: true, shift: true, run: copyEditor, help: ['Ctrl + Shift + C', 'コードをコピー'] },
    { key: 'V', ctrl: true, shift: true, run: pasteEditor, help: ['Ctrl + Shift + V', 'クリップボードから貼り付け'] },
    { key: 'Delete', ctrl: true, run: clearEditor, help: ['Ctrl + Delete', 'エディターをクリア'] },
    { key: '1', ctrl: true, run: function () { layout.apply('lr'); }, help: ['Ctrl + 1 / 2 / 3', '左右分割 / 上下分割 / プレビューのみ'] },
    { key: '2', ctrl: true, run: function () { layout.apply('tb'); }, help: null },
    { key: '3', ctrl: true, run: function () { layout.apply('po'); }, help: null },
  ];

  /* ---- 初期化 ---- */
  function initialize() {
    var saved = store.load();
    editor.setValue(saved !== null ? saved : DEFAULT_CONTENT);
    setSaveStatus('saved');
    theme.init();
    layout.init();
    App.renderPreview(iframe, editor.getValue());

    editor.on('change', commitChange);

    App.initSplitDrag({
      gutter: $('gutter'),
      editorPane: $('editor-container'),
      previewPane: $('preview-panel'),
      getLayout: layout.current,
    });

    $('layout-lr-btn').addEventListener('click', function () { layout.apply('lr'); });
    $('layout-tb-btn').addEventListener('click', function () { layout.apply('tb'); });
    $('layout-po-btn').addEventListener('click', function () { layout.apply('po'); });
    $('undo-btn').addEventListener('click', function () { editor.undo(); });
    $('redo-btn').addEventListener('click', function () { editor.redo(); });
    $('copy-btn').addEventListener('click', copyEditor);
    $('paste-btn').addEventListener('click', pasteEditor);
    $('clear-btn').addEventListener('click', clearEditor);
    $('save-btn').addEventListener('click', saveToFile);
    $('theme-toggle-btn').addEventListener('click', theme.toggle);
    $('help-btn').addEventListener('click', toggleHelp);

    $('open-btn').addEventListener('click', function () {
      $('file-input').click();
    });
    $('file-input').addEventListener('change', function (e) {
      openFile(e.target.files[0]);
      e.target.value = '';
    });
    var editorContainer = $('editor-container');
    editorContainer.addEventListener('dragover', function (e) {
      e.preventDefault();
    });
    editorContainer.addEventListener('drop', function (e) {
      e.preventDefault();
      openFile(e.dataTransfer.files[0]);
    });

    helpOverlay.addEventListener('click', function (e) {
      if (e.target === helpOverlay) closeHelp();
    });
    App.renderHelpRows($('help-table'), KEY_BINDINGS);
    document.addEventListener('keydown', App.createKeymap(KEY_BINDINGS), true);

    if (typeof window.feather !== 'undefined') window.feather.replace();
  }

  initialize();
})();
