# TangoDots

TangoDotsは、FSRS（Free Spaced Repetition Scheduler）で復習のタイミングを調整する、**完全無料・広告なし・課金なし**のWeb単語帳です。PC・スマートフォンのブラウザから使え、毎日の学習量は91日分の継続ドットで確認できます。

## 機能

- 「もう一度 / 難しい / 良い / かんたん」の日本語4段階評価
- `ts-fsrs` によるFSRS v6スケジューリング
- Cloudflare D1へ学習履歴を保存
- GitHub風の継続ドット（直近91日）
- 新規単語は1日100語まで。FSRSの復習を優先して出題
- 2,300語の初期デッキ

## 技術構成

- React / TypeScript / vinext
- Cloudflare Workers互換のビルド出力
- `ts-fsrs` 5.4.1
- Cloudflare Workers + Cloudflare D1（いずれも無料プランで運用）

## ローカルでの起動

```bash
npm install
npm run dev
```

## Cloudflareへの公開

Cloudflare FreeプランでD1データベースとWorkersを使う。`wrangler.jsonc` にはD1バインディングが設定済みで、公開時は次を実行する。

```bash
npm run deploy
```

無料枠を超えた場合に有料プランへ自動移行する設定は使わない。無料枠の上限に達した日は、D1を使う保存・読込み処理が一時的に利用できなくなる。

## データについて

初期デッキは、ユーザー提供の `単語データ.xlsx` から生成した `public/vocabulary.json` を使用します。学習履歴はCloudflare D1へ保存します。利用者に料金が発生する機能、広告、課金、サブスクリプションは設けません。端末のブラウザには、D1のデータを識別する匿名端末IDのみを保存します。

単語・訳語を公開配信する場合は、参照した辞書等の利用条件・権利を確認してください。詳細は[Web版設計書](docs/tangodots-web-design.md)を参照してください。
