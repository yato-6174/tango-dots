# TangoDots 利用統計

Cloudflare Workers Analytics Engine の `tangodots_usage` データセットに、匿名の集計イベントを記録します。

記録するもの:

- ホーム画面・学習画面の開始
- 4種類の評価の選択数
- 1日の新規単語数の変更（設定値のみ）
- バックアップの保存・復元
- 任意で送信された年代区分
- ページ表示中の滞在時間（秒）

記録しないもの:

- 単語・訳語・カードID
- 端末識別子、IPアドレス、メールアドレス
- ユーザーが入力した文章
- 正確な年齢、年代アンケートの未回答者の情報

## 集計例

Cloudflare API トークンに `Account Analytics: Read` 権限を付与し、次のように実行します。

```bash
curl "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/analytics_engine/sql" \
  -H "Authorization: Bearer <API_TOKEN>" \
  --data "SELECT blob1 AS event, SUM(_sample_interval) AS count FROM tangodots_usage WHERE timestamp > NOW() - INTERVAL '30' DAY GROUP BY event ORDER BY count DESC"
```

評価だけを確認する例:

```sql
SELECT blob1 AS rating, SUM(_sample_interval) AS count
FROM tangodots_usage
WHERE timestamp > NOW() - INTERVAL '30' DAY
  AND blob1 LIKE 'answer_%'
GROUP BY rating
ORDER BY count DESC
```

平均滞在時間を確認する例:

```sql
SELECT ROUND(SUM(double1) / SUM(_sample_interval), 1) AS average_seconds
FROM tangodots_usage
WHERE timestamp > NOW() - INTERVAL '30' DAY
  AND blob1 = 'time_spent_seconds'
```

既存のD1には匿名端末ごとの学習状態・回答履歴があるため、アクティブな学習者数などを調べる場合は、D1を管理者として直接照会します。D1の内容を外部公開するAPIは作成しません。
