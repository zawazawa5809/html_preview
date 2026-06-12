# 引き継ぎ資料（HANDOVER）

最終更新: 2026-06-12（PR #22 マージ時点 / v2.0.0）

このドキュメントは、本リポジトリの開発を引き継ぐ人向けの案内です。
詳細な実装ガイドは [CLAUDE.md](../CLAUDE.md)、設計判断の経緯は [docs/adr/](adr/) を一次情報として参照してください。

## 1. プロジェクト概要

ブラウザ上でHTMLをリアルタイム編集・プレビューできるWebツール群。

| ページ | 役割 |
|--------|------|
| `index.html` | コード編集ベースのHTMLプレビューアー |
| `doceditor.html` | AI生成HTMLドキュメントのGUI修正（要素選択・スタイル編集・D&D並べ替え・テーブル/画像編集・アウトライン・印刷） |

**最重要の制約: ビルド不要・完全オフライン動作**。`file://` で直接開けること、かつ同一ファイル群をそのまま GitHub Pages で公開できることを両立しています（ADR-0001）。この制約から、CDN参照は禁止・依存は `vendor/` 同梱・ESMではなくクラシック `<script defer>` + `window.App` 名前空間という構成になっています（ADR-0002）。

## 2. 現在の状態

- **PR #22**（2026-06-12 マージ）で単一HTMLファイル構成からマルチファイル構成（`styles/` + `js/lib/` + `js/pages/` + `vendor/`）へ移行済み
- テスト: Vitest + jsdom で **12ファイル / 98テスト、全件パス**（2026-06-12 確認）
- CI: GitHub Actions で push/PR ごとにテスト + vendor整合性チェック（`.github/workflows/ci.yml`）
- デプロイ: main へのマージで GitHub Pages へ自動デプロイ（`.github/workflows/deploy-pages.yml`）。初回のみ Settings → Pages → Source を「GitHub Actions」に設定する必要あり
- 既知の未完了タスク・バグは現時点でなし

## 3. セットアップと日常の開発フロー

```bash
npm install        # 開発ツール（Vitest等）の取得。実行時には不要
npm test           # テスト一括実行
npm run test:watch # ウォッチモード
npm run vendor     # 依存更新時のみ: node_modules → vendor/ の再生成
```

- **動作確認**はブラウザで `index.html` / `doceditor.html` を直接開くだけ（サーバー不要）
- **TDDで進める**（ADR-0003）: 挙動を変える前にテストを書く/直す
- **依存更新**: `package.json` を変更 → `npm install && npm run vendor`。`vendor/` は生成物なので**直接編集禁止**（CIが乖離を検出します）

## 4. アーキテクチャの要点（はまりやすい所）

詳細は CLAUDE.md に一覧がありますが、引き継ぎ時に特に注意すべき点:

- **外部URL参照は一切追加しない**こと。`tests/smoke.test.js` が外部URL参照ゼロ・script/link の実在・必須DOM IDを機械的に検証しており、HTML構造を変えたらこのテストを追従させる
- **スクリプトのロード順**はHTMLの `<script defer>` の列挙順がすべて。モジュール間参照は呼び出し時に行う規約でロード順依存を最小化している
- **キーボードショートカット**は各ページの `KEY_BINDINGS` 配列が単一情報源で、ヘルプモーダルの表も同配列から自動生成される。ハンドラとヘルプ表を別々に編集しないこと
- **Design Mode の注入スクリプト**（`js/pages/doceditor/design-mode.js`）は `designRuntime(cfg)` という実関数を `toString()` で文字列化して iframe に注入する方式。文字列連結でスクリプトを書かないこと。iframe↔親の通信は `postMessage` + ランダムtoken検証
- **アクセント色 #5b8fcc** はCSS変数 `--da-secondary` と注入側JSの `App.design.ACCENT` の2箇所にあり、同値を維持すること
- 色は必ず `styles/tokens.css` の変数を使う。`transition: all` は使わない

## 5. テストでカバーできていないもの（手動確認が必要）

jsdomの制約により以下は自動テスト対象外です。関連箇所を変更したら手動確認してください:

- 実レイアウト（分割表示・gutterのドラッグリサイズ）
- 印刷（DocEditorの印刷機能）
- クリップボード操作
- `file://` での実ブラウザ動作（特に vendor/ 欠損時のtextareaフォールバックバナー）

## 6. 将来の選択肢

- **Vite移行**: 必要になった場合の移行手順は ADR-0002 に固定済み。現状は `file://` 動作要件があるため移行しない判断
- localStorage 容量（3.5M文字で警告）を超えるドキュメントを扱う需要が出たら、保存方式の再検討が必要（`js/lib/storage.js` の `createCodeStore`）

## 7. 主要ドキュメントの場所

| ドキュメント | 内容 |
|--------------|------|
| `README.md` | 利用者向けの概要・使い方 |
| `CLAUDE.md` | 開発者向け詳細（モジュール一覧・パターン・テスト方針） |
| `docs/adr/0001` | オフライン/ホスト両対応の配布方針（CDN禁止の根拠） |
| `docs/adr/0002` | ビルド無し・クラシックスクリプト構成と Vite 移行手順 |
| `docs/adr/0003` | TDD（Vitest）と CI/CD の方針 |
