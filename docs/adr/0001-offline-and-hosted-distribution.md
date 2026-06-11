# ADR-0001: 完全オフラインとオンラインホスティングを同一成果物で両立する

- Status: Accepted
- Date: 2026-06-11

## Context

本ツール群は次の2通りの使い方を想定する。

1. **完全オフライン**: フォルダごとコピーし、ブラウザで `index.html` を直接開く（`file://`）。
   ネットワークが無い環境・持ち出し先・社内の隔離環境でも動作しなければならない。
2. **オンライン（ホストする）**: GitHub Pages 等の静的ホスティングで配信し、URLで共有する。

従来はCodeMirror・lodash・Feather Icons・js-beautify・Google Fonts を
unpkg / cdnjs / Google Fonts のCDNから実行時に取得していた。このため

- オフラインでは機能が縮退し（CodeMirror→textarea等）、その縮退を補うための
  フォールバック機構（CDN警告バナー・アイコン代替文字など）がコードを肥大させていた
- CDN障害・提供終了・改竄（サプライチェーン）が実行時リスクとして残っていた
- 「フォルダごとコピーすれば動く」という本ツールの価値が成立していなかった

## Decision

**実行時の外部オリジン依存をゼロにする。** 具体的には:

1. 依存ライブラリは npm でバージョン固定して取得し、`npm run vendor`
   （`scripts/vendor.mjs`）で `vendor/` にコピーしてリポジトリにコミットする。
   HTMLからは相対パスでのみ参照する。
2. Webフォント（Google Fonts の Noto Sans JP）は廃止し、OSのフォントスタックに
   フォールバックする（`font-family: "Noto Sans JP", "Hiragino...", Meiryo, sans-serif`）。
   OSにNoto Sans JPがあればそれが使われる。
3. lodash は debounce のみの利用だったため vendor 対象にせず、自前実装
   （`js/lib/core.js` の `App.debounce`）に置き換える。
4. オフライン版とホスト版で**成果物を分けない**。相対パスのみで構成された同一の
   静的ファイル群が、`file://` でも任意の静的ホスティングでもそのまま動く。
   ホスティングは GitHub Actions（`.github/workflows/deploy-pages.yml`）で
   GitHub Pages へ自動デプロイする。
5. 回帰防止として、スモークテスト（`tests/smoke.test.js`）が
   「外部オリジンへの参照が無いこと」「参照先ファイルが実在すること」をCIで検証する。

## Consequences

- (+) オフラインで全機能が動作し、CDNフォールバック機構（約150行）を削除できた
- (+) 依存のバージョンが package.json / vendor/ で固定され、ビルド再現性と
  サプライチェーン耐性が向上した
- (+) 配布 = フォルダコピー、公開 = push のみ、と運用が単純化された
- (-) リポジトリサイズが vendor/ の分（約850KB）増える
- (-) 依存更新は `npm install` + `npm run vendor` の手動2ステップになる
  （CIの vendor 整合性チェックで更新漏れは検出される）
- 注意: `vendor/` は生成物なので直接編集しない。変更は package.json 経由で行う
