# 拡張版HTMLプレビューアー

ブラウザ上でHTMLをリアルタイムに編集・プレビューできるWebツール群です。
`index.html` はコード編集ベースのプレビュー、`doceditor.html` はAI生成HTMLドキュメントのGUI修正に対応します。

**完全オフラインで動作します。** 依存ライブラリはすべて `vendor/` に同梱されており、
フォルダごとコピーして `index.html` をブラウザで開くだけで使えます（サーバー・ネットワーク不要）。
同じファイル群を GitHub Pages 等の静的ホスティングでそのまま公開することもできます（ADR-0001）。

## 主な機能
- 入力内容のリアルタイムプレビュー
- 左右分割・上下分割・プレビューのみのレイアウト切り替え（ドラッグでリサイズ可）
- ローカルストレージへの自動保存・HTMLファイルのエクスポート
- ダークテーマ / キーボードショートカット（`?` で一覧表示）
- GUIによる視覚編集（DocEditor: 要素選択・スタイル編集・D&D並べ替え・テーブル編集・画像ドロップ・アウトライン・印刷）

## フォルダ構成

```
index.html / doceditor.html   ページ本体
styles/      tokens.css（デザイントークン） / common.css（共通UI） / doceditor.css
js/lib/      ページ横断の共有モジュール（window.App 名前空間）
js/pages/    ページごとのエントリと固有モジュール
vendor/      実行時依存ライブラリ（npm run vendor で生成。直接編集しない）
tests/       Vitest によるユニット/スモークテスト
docs/adr/    アーキテクチャ決定記録（ADR）
```

## 使う

ビルド工程はありません。`index.html` または `doceditor.html` をブラウザで開くだけです。

## セキュリティ上の注意

通常モードのプレビューは sandbox なしの iframe で描画されるため、**貼り付けた
HTML内の `<script>` はツール本体と同一オリジンで実行されます**（ツールの
localStorage 保存データへ到達可能です）。これは DocEditor の Design Mode
（iframe内DOMへの直接アクセス）が同一オリジン動作を前提としているための
トレードオフです。

- **信頼できる出所のHTMLのみ**を通常モードで開いてください（自分で書いたもの・自分の指示でAIが生成したもの等）
- **出所不明のHTMLを開く場合は、ツールバーの盾アイコン「保護プレビュー」をONにしてください。**
  プレビューiframeが `sandbox="allow-same-origin"` で再生成され、HTML内のスクリプトは実行されません
  （アウトライン等のDOM読み取り機能は動作します）。設定は保存され、次回起動時は最初の描画から適用されます
- 保護プレビュー中は、スクリプト注入を前提とする機能（DocEditor の Design Mode・印刷）は使用できません

## 開発

```bash
npm install            # 開発ツール（Vitest等）の取得
npm test               # ユニットテスト実行
npm run test:watch     # ウォッチモード
npm run test:coverage  # カバレッジ計測（閾値チェック付き）
npm run test:e2e       # E2Eテスト（Playwright。初回は npx playwright install chromium）
npm run lint           # ESLint（ES5構文規約 + グローバル参照チェック）
npm run format         # Prettierで整形（format:check で検査のみ）
npm run vendor         # 依存更新時: node_modules → vendor/ の再生成
```

- 開発はTDDで進めます。挙動を変える前にテストで仕様を固定してください（ADR-0003）
- push / PR で CI（lint + フォーマット検査 + テスト/カバレッジ + vendor整合性チェック + E2E）が走ります
- main へのマージで GitHub Pages へ自動デプロイされます
- 設計判断の経緯は `docs/adr/` を参照してください
