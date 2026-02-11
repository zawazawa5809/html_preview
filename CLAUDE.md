# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ブラウザ上でHTML/Markdownをリアルタイム編集・プレビューできるシングルファイルWebアプリケーション群。AI出力の組み立てツール（Loom）も含む。

## Architecture

- **シングルファイル構成**: 各HTMLファイルが独立した完結アプリケーション。ビルド不要
- **共通パターン**: `index.html`と`markdown_preview.html`はCSS変数・ツールバー・split-view・gutter resizeなど同じ設計パターンを共有。変更時は両方を確認する
- **エディタ**: CodeMirror 5.65.7（CDN）を使用。`elements.htmlEditor`は初期化後CodeMirrorインスタンスに置き換わる（`getValue()` / `setValue()` / `replaceRange()`等のAPIを使用）
- **外部CDN依存**: Feather Icons, lodash (debounce), CodeMirror, Noto Sans JP。Loomは外部依存なし（JetBrains Mono fontのみ）
- **状態管理**: 各アプリがIIFE内でstate objectとlocalStorageで状態を管理

## Files

| File | 用途 | localStorage Keys |
|------|------|-------------------|
| `index.html` | HTMLリアルタイムプレビュー | `htmlPreviewerCode`, `htmlPreviewerLayout`, `htmlPreviewerTheme` |
| `markdown_preview.html` | Markdownプレビュー（marked.js使用） | `markdownPreviewerCode`, `markdownPreviewerLayout`, `markdownPreviewerTheme` |
| `loom.html` | AI出力ワークベンチ（Context Builder + Output Assembler） | `loom_state` |

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
