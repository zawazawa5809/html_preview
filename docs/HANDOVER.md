# HANDOVER — 引き継ぎドキュメント

最終更新: 2026-06-12 / 対象: `main`（PR #22 マージ済み）

## 1. 現在の状態

- PR #22「マルチファイル構成へ移行」は **main へマージ済み**（マージコミット `0ce23c2`）。CI全チェックgreen、レビュー指摘1件（keymapのShift照合）は修正・resolve済み
- GitHub Pages 稼働確認済み（main マージで `deploy-pages.yml` が自動デプロイ）
- テスト: ユニット13ファイル / 142テスト（`npm test`）+ E2E 18テスト（`npm run test:e2e`）。全GREEN
- 品質ゲート: ESLint（`npm run lint`）/ Prettier（`npm run format:check`）/ カバレッジ閾値（`npm run test:coverage`）がCIで強制される
- 改善バックログ（下記）のP1全件・P2全件・P3の2件、および残課題2件（並べ替えタッチ対応・保護プレビュー）は実施済み

### 直近の主要コミット

| コミット | 内容 |
|----------|------|
| `52060a2` | マルチファイル構成への移行本体（62ファイル） |
| `d285bbb` | keymap: 修飾キー無し印字キーのShift照合をスキップ（US配列の `?` 対応） |

## 2. このリポジトリの歩き方

- アーキテクチャの根拠: `docs/adr/0001`（オフライン/ホスト同一成果物・CDN全廃）、`0002`（no-build + Vite移行手順固定）、`0003`（TDD/CI方針）。**構成を変える前に必ずADRを読むこと**
- 開発規約の詳細: `CLAUDE.md`（モジュール一覧・Key Patterns・Testing Notes）
- 開発コマンド: `npm test` / `npm run test:watch` / `npm run vendor`（依存更新時のみ）
- 動作確認: HTMLをブラウザで直接開く。サーバー不要

### 壊しやすいポイント（先に知っておくべき不変条件）

- 外部URL参照を追加しない。`tests/smoke.test.js` が落ちる（意図的なガード）
- HTMLのscript/link追加・ID変更はスモークテストと両ページの整合を確認
- アクセント色は `--da-secondary`（CSS）と `App.design.ACCENT`（JS）の2箇所で同値 `#5b8fcc` を維持
- ショートカットは各ページの `KEY_BINDINGS` 配列だけを編集する（ヘルプ表は自動生成）
- 注入スクリプト（`designRuntime`）は自己完結必須。外側スコープを参照すると `toString()` 注入で壊れる。`cfg` 引数経由で渡すこと
- `vendor/` は生成物。手編集するとCIの整合性チェックで落ちる

### jsdomで検証できない領域

gutterドラッグリサイズ・CodeMirror実描画/実編集・Design Modeの選択/削除/同期・Pointer並べ替え・保護プレビューのsandbox挙動は `e2e/` のPlaywrightテストがカバー済み。
**引き続き手動確認が必要**: 印刷 / クリップボード実挙動 / CodeMirror検索ダイアログ・折りたたみ / 実タッチデバイスでの長押し並べ替えの操作感（E2Eはマウス経路のみ）

## 3. 改善バックログ（推奨順）

### P1: ~~価値が高く、すぐ着手できる~~ → **完了（2026-06-12）**

1. ~~**E2Eテスト（Playwright）の導入**~~ ✅
   `e2e/` に11テスト（index 6 / doceditor 5）。`file://` を直接開いて実CodeMirror編集→プレビュー反映・gutterドラッグ・レイアウト/テーマ切替・localStorage永続化・Design Mode選択/削除/DOM→ソース同期・アウトラインを検証。CIに `e2e` ジョブ追加（失敗時はplaywright-reportをartifact保存）
2. ~~**ESLint + Prettier + CIのlintステップ**~~ ✅
   `eslint.config.mjs`: js/ は `ecmaVersion: 5` + `sourceType: 'script'` でES6+構文を構文エラーとして検出（組み込みグローバルのみES2015許可）。Prettierは `singleQuote` / `printWidth: 120` / `trailingComma: "es5"`（関数引数の末尾カンマ=ES2017構文を避けるため）。全コード整形済み
3. ~~**カバレッジ計測（`vitest --coverage` + CI閾値）**~~ ✅
   `npm run test:coverage`。閾値は現状値直下（Stmts 38 / Branch 28 / Funcs 45 / Lines 40）の回帰ガード。テスト追加時に引き上げること。注: design-mode.js の注入ランタイムは `new Function` 実行のためカバレッジに乗らない

### P2: ~~機能・品質の底上げ~~ → **完了（2026-06-12）**

1. ~~**Design Modeの複数段Undo履歴**~~ ✅
   エディタ側CodeMirror履歴との統合方式で実装。DOM→ソース同期が1操作=1履歴entryになり（同一内容syncはスキップ）、iframe内のCtrl+Z/Ctrl+Y(Ctrl+Shift+Z)を `__design_undo__`/`__design_redo__` メッセージで親へ中継して `editor.undo()/redo()` に集約。contenteditable編集中はネイティブundo優先
2. ~~**ソース行ハイライトの精度向上**~~ ✅
   iframe側が同名タグの出現順（occurrence、designer注入物は除外）を `__design_click__` に同梱し、ソース側がN番目の開始タグを境界つき正規表現（`<p` が `<pre` に誤一致しない）で特定する
3. ~~**`document.execCommand` 脱却**~~ ✅
   書式ツールバーは `Range.extractContents()` の境界自動分割を利用したSelection/Range実装（トグル解除・部分選択解除対応）。textareaフォールバックのundo/redoは自前履歴スタック（上限100件）
4. ~~**プレビューiframeのセキュリティ方針の明文化**~~ ✅
   READMEに「セキュリティ上の注意」を追加。sandbox化モードは引き続き将来課題（下記・残課題）
5. ~~**アクセシビリティ強化**~~ ✅
   `js/lib/modal.js`（フォーカストラップ+フォーカス復元）をヘルプモーダルへ適用・閉じるボタン追加。`dt-add-child` に `aria-haspopup`/`aria-expanded`、セクション開閉は Enter/Space 対応（role=button/tabindex/aria-expanded/aria-controls）

### P3: 中期（タイミングを見て）

1. **CodeMirror 6 への更新 + Vite移行（セットで実施）** — **未実施（トリガー未充足のため見送り）**
   CM5はメンテナンスモード。CM6はESMのみのため、ADR-0002に固定したVite移行手順とセットで行うのが効率的。移行トリガーの目安: TypeScriptが欲しくなった時 / 依存が増えてvendor管理が煩雑になった時 / CM5に支障が出た時。**2026-06時点でいずれも未充足**（依存3件・CM5に実害なし）。実施時はADR-0002の改訂が必要
2. **大容量ドキュメント対応** — **未実施（現状の容量警告で実用上充足のため見送り）**
   localStorage上限（約5MB）が実質の文書サイズ上限。IndexedDBへの移行で解消できるが、保存APIが同期前提のため起動フローの非同期化を伴う。超過の実需要が出てから着手する
3. ~~**サンプルコンテンツのデータブロック化**~~ ✅（2026-06-12）
   両ページの `DEFAULT_CONTENT` を `<script type="text/html" id="default-content">` データブロックへ移行（`<template>` は完全なHTML文書を保持できないためデータブロックを採用）。スモークテストも追従済み
4. ~~**モバイル/タッチでのDesign Mode操作**~~ ✅（2026-06-12・完了）
   リサイズハンドル・gutterドラッグを PointerEvent + `touch-action:none` に統一（タッチ対応）。書式ツールバーは `selectionchange` ベースに変更しタッチ/キーボード選択にも反応。要素並べ替えもPointerEventベースに再実装済み（下記）

### 残課題（新規追加分）→ **完了（2026-06-12）**

1. ~~**要素並べ替えD&Dのタッチ対応**~~ ✅
   HTML5 DnDを廃止しPointerEventベースに再実装（マウス/ペン=移動閾値6pxで開始、タッチ=長押し350msで開始・成立前の移動はスクロールに譲る）。ドラッグ中の状態は `data-designer-dragging`/`data-designer-drop` 属性で表現（class汚染によるDOM→ソース同期への混入を解消）。ドラッグ直後のclickは選択として扱わない（400ms窓）。HTML5 DnDが残るのは外部からの画像ファイルドロップ受け入れのみ。ツールが `draggable` 属性を使わなくなったため、`serializeCleanHtml` はユーザー自身の `draggable` 属性を保持するようになった
2. ~~**「信頼しないHTMLを開くモード」（保護プレビュー）**~~ ✅
   両ページのツールバーに盾アイコン `#protected-mode-btn` を追加。ONで `App.recreatePreviewIframe()` がiframeを `sandbox="allow-same-origin"` で**要素ごと再生成**（sandboxフラグはdocument生成時固定のため属性付け替えでは効かない）。スクリプトは実行されないが親からのDOM読み取りは可能（アウトライン等は動作）。設定は `htmlPreviewerProtected`/`docEditorProtected` で永続化され、再読込時は初回描画前に適用（保存済みコードのスクリプトを一度も実行しない）。DocEditorではDesign Modeと排他（保護ONで強制OFF・ボタンdisabled・印刷もガード）。file:// 配下でも親からのアクセスが維持されることをE2Eで確認済み

## 4. 運用メモ

- 依存更新フロー: package.jsonのバージョン変更 → `npm install && npm run vendor` → コミット（vendor差分込み）。CIが乖離を検出する
- `@playwright/test` は `1.56` に固定（Claude Codeリモート実行環境のプリインストールブラウザ Chromium 141/build 1194 に合わせるため。CDNダウンロードが当該環境では不可）。更新する場合はCIは問題ないが、リモート環境でのE2E実行可否を確認すること
- デプロイ: mainマージのみ。ロールバックはmainのrevert
- localStorageキー: ページごとに独立（`htmlPreviewer*` / `docEditor*`）。**キー変更はユーザーの保存データ消失を意味する**ので避ける
