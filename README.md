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

LEAP関連の単語・訳語データは、このリポジトリに含めていません。App Storeで配信する教材には、掲載元および権利者から必要な許諾を得る必要があります。詳細は [設計書](outputs/anki-fsrs-iphone-design.md) を参照してください。
