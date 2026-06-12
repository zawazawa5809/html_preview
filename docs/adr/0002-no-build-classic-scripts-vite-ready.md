# ADR-0002: ビルド無しのクラシックスクリプト構成（Vite即時移行可能を必須要件とする）

- Status: Accepted
- Date: 2026-06-11

## Context

単一HTMLファイル構成はコード量の肥大（1ファイル3,400行超）と2ファイル間の
大規模重複（約1,200行）を招いていたため、マルチファイル構成へ移行する。
その際の制約は次の2つ。

1. **「ブラウザで直接開くだけ・サーバー不要」を維持する**（ADR-0001のオフライン原則）。
   ここで決定的なのは、`<script type="module">` が `file://` では CORS
   （origin が `null` になる）により Chrome / Edge / Firefox でブロックされる
   という事実である。つまり no-build を守る限り ES Modules は使えない。
2. **将来 Vite へ問題なく移行できる構成であること**（必須要件）。

## Decision

1. **クラシック `<script src>` + 名前空間パターン**を採用する。
   各JSファイルはIIFEで包み、`window.App` 名前空間に機能を登録する。
   依存順はHTML側の `<script defer>` の列挙順で保証する（`defer` は記述順実行）。
2. **ディレクトリ構成は Vite の MPA 構成と同型に切る**:

   ```
   index.html / doceditor.html   # ページ（=Viteのエントリ）
   styles/    tokens.css / common.css / doceditor.css
   js/lib/    ページ横断の共有モジュール（1ファイル1責務）
   js/pages/  ページごとのエントリと固有モジュール
   vendor/    実行時依存（ADR-0001）
   ```

3. **Vite移行手順を設計時点で固定する**（これが「即時リファクタ可能」の根拠）:
   - 各libファイルの IIFE ラッパーを外し、`App.xxx = ...` を `export` に置換する
   - ページエントリの先頭に `import` を並べ、HTMLの `<script>` 列を
     `<script type="module" src="js/pages/xxx.js">` 1本に置き換える
   - `vendor/` を npm import（`import CodeMirror from 'codemirror'`）に置換する
   - `vite.config.js` に `build.rollupOptions.input` で2ページを登録する
   - テストは既に Vitest（Viteと同一トランスフォーム基盤）のため変更不要
   - `file://` 配布が引き続き必要なら `vite-plugin-singlefile` 等で
     自己完結HTMLを出力する選択肢も取れる
4. モジュール内の相互参照は**呼び出し時に `App.*` を参照**する
   （ロード時参照を避け、読み込み順への依存を最小化する）。

## Consequences

- (+) `file://` で全ブラウザ動作。ツールチェーン無しで開発を始められる
- (+) 1ファイル1責務になり、共有ロジックの重複（約1,200行）が解消された
- (+) Vitest によるユニットテストが可能になった（単一HTML内のIIFEでは不可能だった）
- (-) `import` が無いため依存関係がHTMLの記述順に暗黙に依存する。
  対策: スモークテストが参照整合性を検証し、libは呼び出し時参照を徹底する
- (-) グローバル名前空間 `window.App` を1つ占有する
