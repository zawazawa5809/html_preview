# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ブラウザ上でHTMLをリアルタイム編集・プレビューできるWebツール群。コード編集の`index.html`とGUI編集の`doceditor.html`の2ページ構成。**ビルド不要・完全オフライン動作**（`file://`で直接開ける）かつ、同一ファイル群をそのまま静的ホスティング（GitHub Pages）で公開できる。

## Architecture

設計判断の経緯と根拠は `docs/adr/` を必ず参照すること。

- **ADR-0001**: 実行時の外部オリジン依存ゼロ（CDN禁止）。依存は `vendor/` に同梱
- **ADR-0002**: `file://` ではESMがCORSでブロックされるため、クラシック`<script defer>` + `window.App` 名前空間パターン。Vite移行手順を固定済み
- **ADR-0003**: Vitest + jsdom でTDD。CI/CDはGitHub Actions

### フォルダ構成

| パス | 役割 |
|------|------|
| `index.html` / `doceditor.html` | ページ本体（マークアップのみ。CSS/JSは外部参照） |
| `styles/tokens.css` | デザイントークン（da-*パレット / app-*セマンティック / ダークテーマ） |
| `styles/common.css` | 両ページ共通UI（ツールバー/分割レイアウト/gutter/トースト/ヘルプモーダル） |
| `styles/doceditor.css` | DocEditor固有UI（タブ/Designパネル/アウトライン） |
| `js/lib/` | 共有モジュール。1ファイル1責務。IIFEで `window.App` に登録 |
| `js/pages/index.js` | プレビューアーのエントリ |
| `js/pages/doceditor/` | DocEditorのエントリ(main.js)と固有モジュール |
| `vendor/` | 実行時依存（**生成物。直接編集禁止。** `npm run vendor` で再生成） |
| `tests/` | Vitestテスト（ユニット/スモーク） |
| `e2e/` | Playwright E2Eテスト（実ブラウザで `file://` を直接開いて検証） |
| `scripts/vendor.mjs` | node_modules → vendor/ のコピー（依存リストの単一情報源） |

localStorage keys: `htmlPreviewerCode/Layout/Theme`（index）, `docEditorCode/Layout/Theme`（doceditor）

### js/lib/ モジュール一覧

| ファイル | 提供API（App.*） |
|----------|------------------|
| `core.js` | `debounce`(flush/cancel付), `escHtml`, `colorToHex`, `parsePx`, `logError` |
| `storage.js` | `safeGet/safeSet`, `createSaveStatus`, `createCodeStore`（容量警告含む） |
| `toast.js` | `showToast(msg, type, {actionLabel, onAction})` |
| `keymap.js` | `createKeymap`(宣言的KB定義), `renderHelpRows`(ヘルプ表生成), `isTypingContext` |
| `editor.js` | `createEditor`（CodeMirror初期化。失敗時はtextareaアダプタにフォールバック） |
| `theme.js` | `createTheme`（data-theme属性 + localStorage） |
| `layout.js` | `createLayout`(lr/tb/po切替), `initSplitDrag`(gutterリサイズ) |
| `preview.js` | `renderPreview`(iframe描画+エラー表示), `getIframeDoc` |
| `file-io.js` | `filenameFromTitle`, `jstTimestamp`, `validateHtmlFile`, `readHtmlFile`, `downloadHtml` |

### DocEditor (js/pages/doceditor/)

- `design-mode.js`: Design Modeの中核。**注入スクリプトは `designRuntime(cfg)` という実関数**で、`buildInjectionScript()` が `toString()` + JSON設定引数で文字列化する（文字列連結でスクリプトを書かないこと）。`STYLE_PROPS`/`EXCLUDED_TAGS`/`templates`/`elementAction`/`tableContext`/`serializeCleanHtml` を提供
- `design-panel.js`: スタイル編集パネル。`createDesignPanel(ctx)` でDI（ctx経由でiframe/同期/削除へアクセス）
- `outline.js`: 見出しツリー（クリックでスクロール+フラッシュ）
- `main.js`: 配線。タブ・Design Mode ON/OFF（デフォルト起動）・postMessageハンドラ・DOM→ソース同期（`serializeCleanHtml`→`html_beautify`→`replaceRange`）・印刷

## Development

- **動作確認**: HTMLファイルをブラウザで直接開く（サーバー不要）
- **テスト**: `npm test`（Vitest + jsdom）。**TDDで進める**: 挙動変更の前にテストを書く/直す
- **E2E**: `npm run test:e2e`（Playwright/Chromium。初回のみ `npx playwright install chromium`）
- **Lint/Format**: `npm run lint`（js/はES5構文に固定、no-undefでグローバル参照ミス検出）/ `npm run format`（Prettier）
- **依存更新**: package.jsonを変更 → `npm install && npm run vendor`（vendor/を手で編集しない）
- **CI**: push/PRで lint + format検査 + テスト（カバレッジ閾値付き）+ vendor整合性チェック + E2E。mainマージでGitHub Pagesへ自動デプロイ

## Key Patterns

- **名前空間**: 全モジュールはIIFE内で `window.App` に登録。モジュール間参照は呼び出し時に行う（ロード順依存の最小化）。スクリプトのロード順はHTMLの`<script defer>`列挙順
- **キーボードショートカット**: 各ページの `KEY_BINDINGS` 配列（key/ctrl/shift/when/run/help）が単一情報源。ヘルプモーダルの表も同配列から `renderHelpRows` で生成される。**ハンドラとヘルプ表を別々に編集しないこと**
- **Undoトースト**: 破壊的操作（クリア/貼り付け/ファイル読込/要素削除）は `showToast(msg, 'success', {actionLabel:'元に戻す', onAction})` で6秒トースト。操作前内容をクロージャで保持（`setContentWithUndo`）
- **保存ステータス**: `createSaveStatus` が `#save-status` に「保存中…/✓ 自動保存済み/保存失敗」を表示。`createCodeStore` が3.5M文字超過で容量警告（1回のみ、下回るとリセット）
- **デザイントークン**: 色は必ず `styles/tokens.css` の変数を使う。アクセント色はCSSが `--da-secondary`、iframe注入側JSが `App.design.ACCENT`（同値 #5b8fcc を維持すること）
- **CSSアニメーション**: `transition: all` は使わない（対象プロパティを明示）
- **レイアウト**: `lr`(左右)/`tb`(上下)/`po`(プレビューのみ)。クラス `layout-*` で切替、50%初期値はCSS側が持つ
- **iframeプレビュー**: `renderPreview()` が `iframeDoc.open()/write()/close()`。DocEditorはDesign Mode中の再描画時に `design.injectInto()` を再実行
- **Design Modeメッセージ**: iframe↔親は `postMessage` + ランダムtoken検証（`__design_click__`/`__design_change__`/`__design_deselect__`/`__design_action__`/`__design_toast__`）
- **DOM→ソース同期**: `serializeCleanHtml()` がdesigner注入物と編集用属性を除去 → `beautifyHtml()` → CodeMirror全置換。`syncingFromDesign` フラグでchangeループを抑止
- **エディタフォールバック**: `createEditor` はCodeMirror不在時にCM互換textareaアダプタを返し `.asset-warning` バナーを表示（vendor/欠損などの異常系）

## Testing Notes

- テストはクラシックスクリプトを `import '../js/lib/x.js'` の副作用ロードで読み込み、`window.App` 経由で検証する
- `tests/smoke.test.js` が参照整合性（script/link実在・**外部URL参照ゼロ**・必須DOM ID）を守っている。HTML構造を変えたらここを追従させる
- 注入スクリプトは `new Function` による構文検証 + jsdom実行でメッセージプロトコルまで検証している
- jsdomで検証できない領域のうち、実レイアウト・gutterドラッグ・実CodeMirror編集・Design Mode選択/削除/同期は `e2e/` のPlaywrightテストがカバーする。印刷・クリップボード・D&Dの実操作感は引き続き手動確認
