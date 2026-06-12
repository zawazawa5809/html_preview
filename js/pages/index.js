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
    protectedStorageKey: 'htmlPreviewerProtected',
    debounceDelay: 300,
    quotaWarnChars: 3.5 * 1024 * 1024, // localStorage上限(約5M文字)に近づいたら警告
  };

  function $(id) {
    return document.getElementById(id);
  }

  // 初期サンプルはHTML内のデータブロック（#default-content）が単一情報源
  var defaultContentEl = $('default-content');
  var DEFAULT_CONTENT = defaultContentEl ? defaultContentEl.textContent.trim() : '';

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

  var editor = App.createEditor($('html-editor'), { lineNumbers: true, mode: 'htmlmixed' }, function onFallback() {
    var div = document.createElement('div');
    div.className = 'asset-warning';
    div.setAttribute('role', 'alert');
    div.textContent =
      'エディタ拡張（CodeMirror）の読み込みに失敗したため、簡易エディタで動作しています。vendor/ フォルダが揃っているか確認してください。';
    document.body.insertBefore(div, $('split-view'));
  });

  var scheduleSave = App.debounce(function () {
    store.save(editor.getValue());
  }, CONFIG.debounceDelay);

  /** 編集内容の反映: プレビュー更新 + 自動保存 */
  function commitChange() {
    App.renderPreview(iframe, editor.getValue());
    setSaveStatus('saving');
    scheduleSave();
  }

  /* ---- 保護プレビュー（信頼しないHTMLを開くモード） ---- */
  var protectedMode = false;

  function setProtectedMode(on) {
    protectedMode = on;
    App.safeSet(CONFIG.protectedStorageKey, on ? '1' : '0');
    var btn = $('protected-mode-btn');
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
    iframe = App.recreatePreviewIframe(iframe, on ? App.PROTECTED_SANDBOX : null);
    App.renderPreview(iframe, editor.getValue());
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

  /* ---- ヘルプモーダル（フォーカストラップ + フォーカス復元付き） ---- */
  var helpModal = App.createModal(helpOverlay);

  /* ---- キーボードショートカット（ヘルプ表もこの定義から生成） ---- */
  var KEY_BINDINGS = [
    {
      key: 'Escape',
      when: helpModal.isOpen,
      run: helpModal.close,
      help: null,
    },
    {
      key: '?',
      when: function (e) {
        return !App.isTypingContext(e.target);
      },
      run: helpModal.toggle,
      help: ['?', 'このヘルプを表示'],
    },
    { key: 's', ctrl: true, run: saveToFile, help: ['Ctrl + S', 'HTMLファイルをダウンロード'] },
    {
      key: 'z',
      ctrl: true,
      run: function () {
        editor.undo();
      },
      help: ['Ctrl + Z', '元に戻す'],
    },
    {
      key: 'y',
      ctrl: true,
      run: function () {
        editor.redo();
      },
      help: ['Ctrl + Y', 'やり直す'],
    },
    {
      key: 'Z',
      ctrl: true,
      shift: true,
      run: function () {
        editor.redo();
      },
      help: null,
    },
    { key: 'C', ctrl: true, shift: true, run: copyEditor, help: ['Ctrl + Shift + C', 'コードをコピー'] },
    { key: 'V', ctrl: true, shift: true, run: pasteEditor, help: ['Ctrl + Shift + V', 'クリップボードから貼り付け'] },
    { key: 'Delete', ctrl: true, run: clearEditor, help: ['Ctrl + Delete', 'エディターをクリア'] },
    {
      key: '1',
      ctrl: true,
      run: function () {
        layout.apply('lr');
      },
      help: ['Ctrl + 1 / 2 / 3', '左右分割 / 上下分割 / プレビューのみ'],
    },
    {
      key: '2',
      ctrl: true,
      run: function () {
        layout.apply('tb');
      },
      help: null,
    },
    {
      key: '3',
      ctrl: true,
      run: function () {
        layout.apply('po');
      },
      help: null,
    },
  ];

  /* ---- 初期化 ---- */
  function initialize() {
    var saved = store.load();
    editor.setValue(saved !== null ? saved : DEFAULT_CONTENT);
    setSaveStatus('saved');
    theme.init();
    layout.init();
    if (App.safeGet(CONFIG.protectedStorageKey) === '1') {
      // 初回描画前にsandboxを適用する（保存済みコードのスクリプトを実行しないため）
      setProtectedMode(true);
    } else {
      App.renderPreview(iframe, editor.getValue());
    }

    editor.on('change', commitChange);

    App.initSplitDrag({
      gutter: $('gutter'),
      editorPane: $('editor-container'),
      previewPane: $('preview-panel'),
      getLayout: layout.current,
    });

    $('layout-lr-btn').addEventListener('click', function () {
      layout.apply('lr');
    });
    $('layout-tb-btn').addEventListener('click', function () {
      layout.apply('tb');
    });
    $('layout-po-btn').addEventListener('click', function () {
      layout.apply('po');
    });
    $('undo-btn').addEventListener('click', function () {
      editor.undo();
    });
    $('redo-btn').addEventListener('click', function () {
      editor.redo();
    });
    $('copy-btn').addEventListener('click', copyEditor);
    $('paste-btn').addEventListener('click', pasteEditor);
    $('clear-btn').addEventListener('click', clearEditor);
    $('save-btn').addEventListener('click', saveToFile);
    $('theme-toggle-btn').addEventListener('click', theme.toggle);
    $('help-btn').addEventListener('click', helpModal.toggle);
    $('help-close-btn').addEventListener('click', helpModal.close);
    $('protected-mode-btn').addEventListener('click', function () {
      setProtectedMode(!protectedMode);
      App.showToast(
        protectedMode ? '保護プレビュー: ON（プレビュー内のスクリプトを実行しません）' : '保護プレビュー: OFF',
        protectedMode ? 'success' : undefined
      );
    });

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
      if (e.target === helpOverlay) helpModal.close();
    });
    App.renderHelpRows($('help-table'), KEY_BINDINGS);
    document.addEventListener('keydown', App.createKeymap(KEY_BINDINGS), true);

    if (typeof window.feather !== 'undefined') window.feather.replace();
  }

  initialize();
})();
