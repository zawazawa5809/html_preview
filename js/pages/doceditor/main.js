/**
 * pages/doceditor/main.js — DocEditor のエントリポイント
 * （タブ切替 / Design Mode制御 / iframeメッセージ / DOM→ソース同期）
 */
(function () {
  'use strict';
  var App = window.App;
  var design = App.design;

  var CONFIG = {
    storageKey: 'docEditorCode',
    layoutStorageKey: 'docEditorLayout',
    themeStorageKey: 'docEditorTheme',
    protectedStorageKey: 'docEditorProtected',
    debounceDelay: 300,
    designSyncDelay: 600,
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

  var state = {
    designMode: false,
    protectedMode: false,
    activeTab: 'code',
    syncingFromDesign: false,
    designToken: window.crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    highlightedLines: [],
  };

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
    {
      lineNumbers: true,
      mode: 'htmlmixed',
      lineWrapping: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
      styleActiveLine: true,
      extraKeys: { 'Alt-F': 'findPersistent' },
    },
    function onFallback() {
      var div = document.createElement('div');
      div.className = 'asset-warning';
      div.setAttribute('role', 'alert');
      div.textContent =
        'エディタ拡張（CodeMirror）の読み込みに失敗したため、簡易エディタで動作しています。vendor/ フォルダが揃っているか確認してください。';
      document.body.insertBefore(div, $('split-view'));
    }
  );

  function beautifyHtml(html) {
    if (typeof window.html_beautify === 'function') {
      return window.html_beautify(html, {
        indent_size: 2,
        wrap_line_length: 0,
        preserve_newlines: true,
        max_preserve_newlines: 2,
        indent_inner_html: true,
      });
    }
    return html;
  }

  var scheduleSave = App.debounce(function () {
    store.save(editor.getValue());
  }, CONFIG.debounceDelay);
  var scheduleSync = App.debounce(syncDesignToEditor, CONFIG.designSyncDelay);
  var scheduleOutline = App.debounce(buildOutline, 500);

  /* ---- プレビュー / 保存 ---- */
  function updatePreview() {
    App.renderPreview(iframe, editor.getValue());
    if (state.designMode) {
      design.injectInto(iframe.contentDocument, state.designToken);
      panel.clearSelection(); // ソース起点の再描画で選択は失われるためパネルも追従
    }
    scheduleOutline();
  }

  function commitChange() {
    updatePreview();
    setSaveStatus('saving');
    scheduleSave();
  }

  function handleEditorInput() {
    if (state.syncingFromDesign) {
      state.syncingFromDesign = false;
      return;
    }
    commitChange();
  }

  /* ---- DOM -> ソース同期 ---- */
  function syncDesignToEditor() {
    if (!state.designMode) return;
    var iframeDoc = iframe.contentDocument;
    if (!iframeDoc || !iframeDoc.documentElement) return;

    var html = beautifyHtml(design.serializeCleanHtml(iframeDoc));
    if (html === editor.getValue()) return; // 実質変更なし（エディタ履歴を汚さない）

    state.syncingFromDesign = true;
    // changeイベントが発火しなかった場合でもフラグが残らないようにする
    setTimeout(function () {
      state.syncingFromDesign = false;
    }, 100);
    editor.operation(function () {
      var last = editor.lastLine();
      editor.replaceRange(html, { line: 0, ch: 0 }, { line: last, ch: editor.getLine(last).length });
    });
    setSaveStatus('saving');
    scheduleSave();
  }

  /* ---- Design Mode ---- */
  function getSelectedElement() {
    var doc = iframe.contentDocument;
    return doc ? doc.querySelector('[data-designer-selected]') : null;
  }

  function sendToIframe(message) {
    var win = iframe.contentWindow;
    if (!win) return;
    message.token = state.designToken;
    win.postMessage(message, '*');
  }

  /** 削除（全経路共通）。削除前のスナップショットで「元に戻す」を提供する */
  function deleteSelected(el) {
    scheduleSync.flush(); // 先行する編集を確定してからスナップショット
    var previous = editor.getValue();
    el.remove();
    panel.clearSelection();
    scheduleSync();
    App.showToast('要素を削除しました', 'success', {
      actionLabel: '元に戻す',
      onAction: function () {
        editor.setValue(previous);
        commitChange();
        App.showToast('削除を元に戻しました');
      },
    });
  }

  var panel = App.createDesignPanel({
    getSelectedElement: getSelectedElement,
    getIframeDoc: function () {
      return iframe.contentDocument;
    },
    getIframeWin: function () {
      return iframe.contentWindow;
    },
    scheduleSync: scheduleSync,
    deleteSelected: deleteSelected,
    sendToIframe: sendToIframe,
  });

  function switchTab(tab) {
    if (tab === 'design' && !state.designMode) {
      enableDesignMode();
      return;
    }
    state.activeTab = tab;
    $('tab-code').classList.toggle('active', tab === 'code');
    $('tab-design').classList.toggle('active', tab === 'design');
    $('tab-outline').classList.toggle('active', tab === 'outline');
    $('code-panel').style.display = tab === 'code' ? '' : 'none';
    $('design-toolbar').style.display = tab === 'design' ? '' : 'none';
    $('outline-panel').style.display = tab === 'outline' ? '' : 'none';
    if (tab === 'code') editor.refresh();
    if (tab === 'outline') buildOutline();
  }

  function enableDesignMode() {
    if (state.protectedMode) {
      // sandbox化されたiframeでは注入スクリプトが実行できない
      App.showToast('保護プレビュー中はデザインモードを使用できません', 'error');
      return;
    }
    state.designMode = true;
    $('design-mode-btn').classList.add('active');
    $('preview-panel').classList.add('design-active');
    switchTab('design');
    panel.clearSelection();
    var doc = iframe.contentDocument;
    if (doc && doc.body) design.injectInto(doc, state.designToken);
    App.showToast('デザインモード: ON');
  }

  function disableDesignMode() {
    var doc = iframe.contentDocument;
    if (doc && doc.body) {
      var selected = doc.querySelector('[data-designer-selected]');
      if (selected) selected.removeAttribute('data-designer-selected');
    }
    state.designMode = false;
    $('design-mode-btn').classList.remove('active');
    $('preview-panel').classList.remove('design-active');
    switchTab('code');
    updatePreview(); // designer注入物を除いたクリーンな状態で再描画
    App.showToast('デザインモード: OFF');
  }

  function toggleDesignMode() {
    if (state.designMode) disableDesignMode();
    else enableDesignMode();
  }

  /* ---- 保護プレビュー（信頼しないHTMLを開くモード） ---- */
  function applyProtectedUi(on) {
    var btn = $('protected-mode-btn');
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
    $('design-mode-btn').disabled = on;
  }

  function setProtectedMode(on) {
    if (on && state.designMode) disableDesignMode();
    state.protectedMode = on;
    App.safeSet(CONFIG.protectedStorageKey, on ? '1' : '0');
    applyProtectedUi(on);
    iframe = App.recreatePreviewIframe(iframe, on ? App.PROTECTED_SANDBOX : null);
    updatePreview();
    App.showToast(
      on ? '保護プレビュー: ON（プレビュー内のスクリプトを実行しません）' : '保護プレビュー: OFF',
      on ? 'success' : undefined
    );
  }

  /**
   * Design Mode中の多段Undo/Redo。DOM→ソース同期が1操作=1履歴entryとして
   * エディタ履歴に積まれるため、エディタのundo/redoへ集約する。
   * 戻した内容はchangeイベント経由でプレビューに再描画される。
   */
  function designHistoryStep(dir) {
    scheduleSync.flush(); // 未確定のDesign変更を履歴に確定させてから操作する
    panel.clearSelection();
    if (dir === 'undo') editor.undo();
    else editor.redo();
  }

  /* ---- iframe からのメッセージ ---- */
  function handleDesignMessage(e) {
    if (!e.data || e.data.token !== state.designToken) return;
    switch (e.data.type) {
      case '__design_click__':
        panel.showSelection(e.data.tag, e.data.styles, e.data.ancestors);
        highlightSourceLine(e.data.tag, e.data.occurrence);
        break;
      case '__design_change__':
        scheduleSync();
        break;
      case '__design_undo__':
        designHistoryStep('undo');
        break;
      case '__design_redo__':
        designHistoryStep('redo');
        break;
      case '__design_deselect__':
        panel.clearSelection();
        break;
      case '__design_action__':
        var el = getSelectedElement();
        if (!el) return;
        if (e.data.action === 'delete') {
          deleteSelected(el);
        } else if (design.elementAction(el, e.data.action)) {
          scheduleSync();
        }
        break;
      case '__design_toast__':
        App.showToast(e.data.msg, e.data.err ? 'error' : undefined);
        break;
    }
  }

  /* ---- ソース行ハイライト ---- */
  /**
   * 選択要素の開始タグ行を強調する。occurrence（同名タグの出現順、iframe側で
   * 算出）でN番目の開始タグを特定するため、同名タグが複数あっても正しい行を指す。
   */
  function highlightSourceLine(tag, occurrence) {
    state.highlightedLines.forEach(function (line) {
      editor.removeLineClass(line, 'background', 'cm-design-highlight');
    });
    state.highlightedLines = [];

    var tagName = tag.split(/[#.]/)[0];
    // 前方一致の誤検出を防ぐ（例: <p が <pre に一致しない）
    var query = new RegExp('<' + tagName + '(?=[\\s>/])', 'i');
    var cursor = editor.getSearchCursor(query, null, { caseFold: true });
    var remaining = typeof occurrence === 'number' && occurrence >= 0 ? occurrence : 0;
    var found = false;
    while (cursor.findNext()) {
      if (remaining === 0) {
        found = true;
        break;
      }
      remaining--;
    }
    if (found) {
      var line = cursor.from().line;
      editor.addLineClass(line, 'background', 'cm-design-highlight');
      state.highlightedLines.push(line);
      if (state.activeTab === 'code') {
        editor.scrollIntoView({ line: line, ch: 0 }, 100);
      }
    }
  }

  /* ---- アウトライン ---- */
  function buildOutline() {
    App.buildOutline(iframe.contentDocument, $('outline-list'), $('outline-empty'));
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
    if (!content.trim()) {
      App.showToast('コピーする内容がありません');
      return;
    }
    navigator.clipboard.writeText(content).then(
      function () {
        App.showToast('クリップボードにコピーしました');
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
    App.downloadHtml(
      html,
      App.filenameFromTitle(html, {
        fallback: 'doceditor_output',
        suffix: '_' + App.jstTimestamp(),
      })
    );
  }

  /* ---- ヘルプモーダル（フォーカストラップ + フォーカス復元付き） ---- */
  var helpModal = App.createModal(helpOverlay);

  /** Designタブで選択要素をDeleteキー削除してよい状況か */
  function canDeleteByKey() {
    if (!state.designMode || state.activeTab !== 'design') return false;
    var active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA')) {
      return false;
    }
    if (active === iframe) {
      var doc = iframe.contentDocument;
      var inner = doc && doc.activeElement;
      if (inner && inner.isContentEditable) return false;
    }
    return !!getSelectedElement();
  }

  /* ---- キーボードショートカット（ヘルプ表もこの定義から生成） ---- */
  var KEY_BINDINGS = [
    {
      key: 'Escape',
      when: helpModal.isOpen,
      run: helpModal.close,
      help: null,
    },
    {
      key: 'Escape',
      when: panel.isDropdownOpen,
      run: panel.closeDropdown,
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
    {
      key: 'd',
      ctrl: true,
      run: function (e) {
        e.stopPropagation();
        toggleDesignMode();
      },
      help: ['Ctrl + D', 'デザインモード切替'],
    },
    {
      // CapsLock等で e.key が 'D' になるケース
      key: 'D',
      ctrl: true,
      run: function (e) {
        e.stopPropagation();
        toggleDesignMode();
      },
      help: null,
    },
    {
      key: 'Delete',
      when: canDeleteByKey,
      run: function () {
        deleteSelected(getSelectedElement());
      },
      help: ['Delete', '選択中の要素を削除（デザインモード）'],
    },
  ];

  var HELP_EXTRA_ROWS = [
    ['Esc', '要素の選択解除・パネルを閉じる'],
    ['Alt + F', 'コード内検索'],
  ];

  /* ---- 初期化 ---- */
  function initialize() {
    var saved = store.load();
    editor.setValue(saved !== null ? saved : DEFAULT_CONTENT);
    setSaveStatus('saved');
    theme.init();
    layout.init();
    state.protectedMode = App.safeGet(CONFIG.protectedStorageKey) === '1';
    if (state.protectedMode) {
      // 初回描画前にsandboxを適用する（保存済みコードのスクリプトを実行しないため）
      applyProtectedUi(true);
      iframe = App.recreatePreviewIframe(iframe, App.PROTECTED_SANDBOX);
    }
    updatePreview();

    editor.on('change', handleEditorInput);

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
    $('design-mode-btn').addEventListener('click', toggleDesignMode);
    $('protected-mode-btn').addEventListener('click', function () {
      setProtectedMode(!state.protectedMode);
    });
    $('print-btn').addEventListener('click', function () {
      if (state.protectedMode) {
        // sandbox（allow-modalsなし）ではiframe内のprint()がブロックされる
        App.showToast('保護プレビュー中は印刷できません', 'error');
        return;
      }
      var win = iframe.contentWindow;
      if (win) win.print();
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

    // タブ（design toolbar / outline panel はエディタ側カラムに移動して表示）
    editorContainer.appendChild($('design-toolbar'));
    editorContainer.appendChild($('outline-panel'));
    $('tab-code').addEventListener('click', function () {
      switchTab('code');
    });
    $('tab-design').addEventListener('click', function () {
      switchTab('design');
    });
    $('tab-outline').addEventListener('click', function () {
      switchTab('outline');
    });

    helpOverlay.addEventListener('click', function (e) {
      if (e.target === helpOverlay) helpModal.close();
    });
    App.renderHelpRows($('help-table'), KEY_BINDINGS, HELP_EXTRA_ROWS);
    document.addEventListener('keydown', App.createKeymap(KEY_BINDINGS), true);

    window.addEventListener('message', handleDesignMessage);

    // ドロップダウンの外側クリックで閉じる
    document.addEventListener('click', function (e) {
      if (panel.isDropdownOpen() && !e.target.closest('#dt-add-child') && !e.target.closest('#dt-add-dropdown')) {
        panel.closeDropdown();
      }
    });

    if (typeof window.feather !== 'undefined') window.feather.replace();

    // Design Modeをデフォルト起動（保護プレビュー中は注入スクリプトが動かないため起動しない）
    if (!state.protectedMode) enableDesignMode();
  }

  initialize();
})();
