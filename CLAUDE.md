# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ブラウザ上でHTML/Markdownをリアルタイム編集・プレビューできるシングルファイルWebアプリケーション群。AI出力の組み立てツール（Loom）も含む。

## Architecture

- **シングルファイル構成**: 各HTMLファイルが独立した完結アプリケーション。ビルド不要
- **共通パターン**: `index.html`, `markdown_preview.html`, `slides.html`, `shelf.html`, `tangle.html`, `nexus.html`, `doceditor.html`はSoft Charcoal CSS変数・ツールバー・テーマ切替など同じ設計パターンを共有。変更時は全ファイルを確認する
- **エディタ**: CodeMirror 5.65.7（CDN）を使用。`elements.htmlEditor`は初期化後CodeMirrorインスタンスに置き換わる（`getValue()` / `setValue()` / `replaceRange()`等のAPIを使用）
- **外部CDN依存**: Feather Icons, lodash (debounce), CodeMirror, Noto Sans JP。Loomは外部依存なし（JetBrains Mono fontのみ）。Shelf/TangleはCodeMirror不使用。NexusはCodeMirror使用（Markdownモード）
- **ツール間導線**: 全ファイルのツールバーに相互リンクナビゲーション（`.toolbar-nav` / Loomは`.header-nav`）
- **状態管理**: 各アプリがIIFE内でstate objectとlocalStorageで状態を管理

## Files

| File | 用途 | localStorage Keys |
|------|------|-------------------|
| `index.html` | HTMLリアルタイムプレビュー | `htmlPreviewerCode`, `htmlPreviewerLayout`, `htmlPreviewerTheme` |
| `markdown_preview.html` | Markdownプレビュー（marked.js使用） | `markdownPreviewerCode`, `markdownPreviewerLayout`, `markdownPreviewerTheme` |
| `loom.html` | AI出力ワークベンチ（Context Builder + Output Assembler） | `loom_state` |
| `shelf.html` | AIナレッジクリッパー | `shelf_data`, `shelfTheme`, `shelfView` |
| `tangle.html` | 思考アウトライナー | `tangle_data`, `tangleTheme` |
| `slides.html` | HTMLスライドプレゼンテーションエディタ | `slidesCode`, `slidesLayout`, `slidesTheme`, `slidesAspectRatio` |
| `nexus.html` | 領域横断メモワークスペース | `nexus_data`, `nexusTheme` |
| `doceditor.html` | AI生成HTMLドキュメント修正エディタ | `docEditorCode`, `docEditorLayout`, `docEditorTheme` |

## Development

ブラウザで直接HTMLファイルを開くだけ。サーバー不要。

## Key Patterns

- **レイアウト**: `lr`(左右分割), `tb`(上下分割), `po`(プレビューのみ)の3モード
- **ダークテーマ**: `data-theme="dark"` on `<html>` + CSS変数のオーバーライド
- **デバウンス保存**: lodash `_.debounce`で300ms遅延のlocalStorage書き込み（Loomも同様）
- **iframeプレビュー**: エディタ内容を`iframeDoc.open()/write()/close()`で描画
- **gutterリサイズ**: mouse/touchイベント + overlay要素でパネル比率を変更

## Loom固有の設計

- 2パネル構成: Context Builder（左: system/reference/previous/instruction）+ Output Assembler（右: code/text/config/data）
- ブロックのドラッグ並べ替え、パネル間移動、スナップショット、テンプレート機能
- `escHtml()`でXSSを防止。インポート時は`allowedKeys`でホワイトリスト検証

## Shelf固有の設計

- タグ付きクリップ保存・検索・再利用の個人ナレッジ棚
- タグサイドバーでANDフィルタ、全文検索（debounce 200ms）
- グリッド/リスト表示切替、日付グループ（今日/昨日/今週/今月/それ以前）
- JSON Export/Import: `allowedKeys`ホワイトリスト + `Object.hasOwn`でプロトタイプ汚染防止

## Tangle固有の設計

- 階層構造の思考アウトラインエディタ。複数アウトライン管理
- フラットDOMレンダリング（`paddingLeft`でインデント表現）
- ノード: `{ id, text, aiResponse, collapsed, aiCollapsed, children: Node[] }`
- ドラッグ&ドロップ（before/after/inside）、フォーカスモード（サブツリー表示）
- エクスポート: Markdown / PlainText / JSON

## Slides固有の設計

- セパレータ方式: 単一CodeMirrorエディタで `---` 区切り（Marp/Slidev互換）、スライド内の水平線は `***` / `___` / `<hr>` を使用
- HTML + Markdown両対応: `detectSlideType()` でHTMLタグ有無を判定、Markdown → `marked.parse()` + `DOMPurify.sanitize()` パイプライン
- `parseSlides()`: `/^\s*---\s*$/m` で分割 → `[{content, type, startLine, endLine}]`
- `buildIframeDocument()`: `.slide` div で包んでiframe描画。CSS `@page { size: 10in 5.625in; }` + `break-after: page` で1スライド=1ページPDF出力
- アスペクト比: 16:9（10in × 5.625in）/ 4:3（10in × 7.5in）切替
- Designモード: designer.htmlから移植。`isInScope(el)` でアクティブスライド内のみ操作可能にスコープ限定
- `syncDesignToEditor()`: アクティブスライドの `innerHTML` → `replaceRange()` で該当行範囲のみ置換
- プレゼンモード: `.presentation-overlay` (fixed, z-index: 100000) にスライド1枚表示、`transform: scale()` でビューポートフィット
- CodeMirrorセパレータ装飾: `addLineClass` で `---` 行を視覚的に強調

## Nexus固有の設計

- 領域横断Markdownワークスペース。複数ドメイン（2～8個）を並べて俯瞰するマルチペインビュー
- CSS Gridレイアウト: grid/horizontal/focus/singleの4プリセット + ガタードラッグによる自由リサイズ
- ドメインペイン: カラーインジケータ + AI要約（Markdown, 折りたたみ可）+ CodeMirrorエディタ
- データモデル（v2）: `domain → content: "## Topic\n..."` 単一Markdown文字列。旧v1（entries配列）は自動マイグレーション
- Edit/Previewトグル: 各ペイン独立でCodeMirror編集 / Markdownプレビュー切替
- Heading Outline: `## 見出し` をドロップダウンで一覧表示、行番号ベースでジャンプ
- Markdownレンダリング: `marked.parse()` → `DOMPurify.sanitize()` パイプラインでXSS防止
- グローバル検索（全ドメイン横断、debounce 200ms）+ CodeMirror `markText()` ハイライト
- クイックキャプチャ: Ctrl+Shift+N でモーダルからドメインのcontentに追記
- JSON/Markdownエクスポート、JSONインポート（v1後方互換マイグレーション + 統合/置換選択）
- `validateData()` でloadData時の検証、`validateImport()` でインポート時の厳密検証（ホワイトリスト適用）
- CDNフォールバック: CodeMirror読み込み失敗時はplain textareaにフォールバック

## DocEditor固有の設計

- AI生成HTMLドキュメントのGUI修正に特化。designer.htmlをベースにドキュメント編集機能を拡張
- **Design Modeがデフォルト起動**: 起動時から視覚編集モード。Code/Design/Outlineの3タブ切替
- designer.htmlの全機能を継承: 要素選択、スタイル編集パネル（Colors/Typography/Spacing/Box）、ブレッドクラム、アクションバー、D&D並べ替え、8方向リサイズハンドル、要素テンプレート挿入、スタイルコピー/ペースト
- **インライン文字装飾ツールバー**: プレビュー上でテキスト選択→フローティングツールバー（太字/斜体/下線/取消線/文字色/背景色/リンク/書式クリア）。`document.execCommand()` で即座に適用
- **テーブル視覚編集**: テーブル要素選択時にTableセクション表示。行追加（上/下）、列追加（左/右）、行削除、列削除。`table.insertRow()` / `row.insertCell()` でDOM直接操作
- **画像ドラッグ&ドロップ**: プレビューiframeに画像ファイルをドロップ → `FileReader.readAsDataURL()` でbase64変換 → `<img>` 要素として挿入（2MB上限警告）
- **ドキュメントアウトライン**: iframe DOMの `h1`〜`h6` を解析し見出し構造ツリー表示。クリックでスクロール
- **ソース行ハイライト**: Design Mode要素選択時、CodeMirror内の対応行をハイライト+スクロール
- **印刷**: ツールバーのプリンターボタンで `iframe.contentWindow.print()` を呼出
- `syncDesignToEditor()`: `serializeCleanHtml()` でdesigner injected要素を除去 → `beautifyHtml()` で整形 → `replaceRange(0..end)` でCodeMirror全体置換
- CodeMirror拡張: fold(xml-fold/brace-fold) + search(dialog/searchcursor) + active-line + js-beautify
