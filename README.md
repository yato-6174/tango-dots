# TangoDots

TangoDotsは、FSRS（Free Spaced Repetition Scheduler）で復習のタイミングを調整する、シンプルなWeb単語帳です。PC・スマートフォンのブラウザから使え、毎日の学習量は91日分の継続ドットで確認できます。

## 機能

- 「もう一度 / 難しい / 良い / かんたん」の日本語4段階評価
- `ts-fsrs` によるFSRS v6スケジューリング
- ブラウザ内のローカルストレージへ学習履歴を保存
- GitHub風の継続ドット（直近91日）
- 2,300語の初期デッキ

## 技術構成

- React / TypeScript / vinext
- Cloudflare Workers互換のビルド出力
- `ts-fsrs` 5.4.1
- Cloudflareへのデプロイ

## ローカルでの起動

```bash
npm install
npm run dev
```

## データについて

初期デッキは、ユーザー提供の `単語データ.xlsx` から生成した `public/vocabulary.json` を使用します。学習履歴はサーバーに送信せず、利用中のブラウザにのみ保存されます。ブラウザのサイトデータを削除すると、学習履歴も消去されます。

単語・訳語を公開配信する場合は、参照した辞書等の利用条件・権利を確認してください。詳細は[Web版設計書](docs/tangodots-web-design.md)を参照してください。
