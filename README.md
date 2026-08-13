# TangoDots

日本語で使える、FSRS対応のシンプルなiPhone英単語帳アプリです。毎日の学習は継続ドットとホーム画面ウィジェットで確認できます。

## 技術

- SwiftUI / iOS 17+
- FSRS v5: [open-spaced-repetition/swift-fsrs](https://github.com/open-spaced-repetition/swift-fsrs)
- XcodeGenでプロジェクトを生成
- WidgetKit / App Groups

## 開発を始める（macOS）

1. XcodeとXcodeGenをインストールする。
2. リポジトリのルートで `xcodegen generate` を実行する。
3. `TangoDots.xcodeproj` をXcodeで開き、Signing & Capabilitiesで自分のTeamを選ぶ。
4. App Groupsの `group.com.kade6174.tangodots` をDeveloper Account上でも有効にしてから実機で実行する。

## コンテンツについて

初期デッキは、ユーザー提供の `単語データ.xlsx` から生成した `TangoDots/Resources/vocabulary.json` を使用します。元のExcelファイルはリポジトリへ含めません。App Storeで配信する教材には、単語・訳語の作成に利用した辞書などについて必要な利用許諾を確認してください。詳細は [設計書](outputs/anki-fsrs-iphone-design.md) を参照してください。
