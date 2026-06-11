# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ブラウザ上でHTMLをリアルタイム編集・プレビューできるシングルファイルWebアプリケーション。コード編集の`index.html`とGUI編集の`doceditor.html`の2本構成。

## Architecture

- **シングルファイル構成**: 各HTMLファイルが独立した完結アプリケーション。ビルド不要
- **共通パターン**: `index.html`と`doceditor.html`はSoft Charcoal CSS変数・ツールバー・テーマ切替など同じ設計パターンを共有。変更時は両ファイルを確認する
- **エディタ**: CodeMirror 5.65.7（CDN）を使用。`elements.htmlEditor`は初期化後CodeMirrorインスタンスに置き換わる（`getValue()` / `setValue()` / `replaceRange()`等のAPIを使用）
- **外部CDN依存**: Feather Icons, lodash (debounce), CodeMirror, Noto Sans JP
- **ツール間導線**: 両ファイルのツールバーに相互リンクナビゲーション（`.toolbar-nav`）
- **状態管理**: 各アプリがIIFE内でstate objectとlocalStorageで状態を管理

## Files

| File | 用途 | localStorage Keys |
|------|------|-------------------|
| `index.html` | HTMLリアルタイムプレビュー | `htmlPreviewerCode`, `htmlPreviewerLayout`, `htmlPreviewerTheme` |
| `doceditor.html` | AI生成HTMLドキュメント修正エディタ | `docEditorCode`, `docEditorLayout`, `docEditorTheme` |

## Development

ブラウザで直接HTMLファイルを開くだけ。サーバー不要。

## Key Patterns

- **レイアウト**: `lr`(左右分割), `tb`(上下分割), `po`(プレビューのみ)の3モード
- **ダークテーマ**: `data-theme="dark"` on `<html>` + CSS変数のオーバーライド
- **デバウンス保存**: lodash `_.debounce`で300ms遅延のlocalStorage書き込み
- **保存ステータス表示**: ツールバーの`#save-status`に「保存中…/✓ 自動保存済み/保存失敗」を`setSaveStatus()`で表示
- **Undoトースト**: 破壊的操作（クリア/貼り付け/ファイル読込/要素削除）は`showTemporaryMessage(msg, type, {actionLabel, onAction})`で「元に戻す」アクション付きトースト（6秒表示）を出す。復元は操作前の内容をクロージャで保持して`restoreContent()`
- **容量事前警告**: `CONFIG.quotaWarnChars`(3.5M文字)超過で保存時に警告トースト（1回のみ、下回るとリセット）
- **CDNフォールバック**: CodeMirror読み込み失敗時は`createTextareaFallback()`がCM互換アダプタを返しtextareaのまま動作+警告バナー。Feather失敗時は`applyIconFallbacks()`でUnicode文字に置換
- **ショートカットヘルプ**: `?`キーまたはツールバーのヘルプボタンで`#help-overlay`モーダル表示。Escape/外側クリックで閉じる
- **iframeプレビュー**: エディタ内容を`iframeDoc.open()/write()/close()`で描画
- **gutterリサイズ**: mouse/touchイベント + overlay要素でパネル比率を変更

## DocEditor固有の設計

- AI生成HTMLドキュメントのGUI修正に特化
- **Design Modeがデフォルト起動**: 起動時から視覚編集モード。Code/Design/Outlineの3タブ切替
- 視覚編集機能一式: 要素選択、スタイル編集パネル（Colors/Typography/Spacing/Box）、ブレッドクラム、アクションバー、D&D並べ替え、8方向リサイズハンドル、要素テンプレート挿入、スタイルコピー/ペースト
- **インライン文字装飾ツールバー**: プレビュー上でテキスト選択→フローティングツールバー（太字/斜体/下線/取消線/文字色/背景色/リンク/書式クリア）。`document.execCommand()` で即座に適用
- **テーブル視覚編集**: テーブル要素選択時にTableセクション表示。行追加（上/下）、列追加（左/右）、行削除、列削除。`table.insertRow()` / `row.insertCell()` でDOM直接操作
- **画像ドラッグ&ドロップ**: プレビューiframeに画像ファイルをドロップ → `FileReader.readAsDataURL()` でbase64変換 → `<img>` 要素として挿入（2MB上限警告）
- **ドキュメントアウトライン**: iframe DOMの `h1`〜`h6` を解析し見出し構造ツリー表示。クリックでスクロール
- **ソース行ハイライト**: Design Mode要素選択時、CodeMirror内の対応行をハイライト+スクロール
- **印刷**: ツールバーのプリンターボタンで `iframe.contentWindow.print()` を呼出
- `syncDesignToEditor()`: `serializeCleanHtml()` でdesigner injected要素を除去 → `beautifyHtml()` で整形 → `replaceRange(0..end)` でCodeMirror全体置換
- CodeMirror拡張: fold(xml-fold/brace-fold) + search(dialog/searchcursor) + active-line + js-beautify
