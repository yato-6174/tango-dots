import SwiftUI

struct HomeView: View {
    @Bindable var store: StudyStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    header
                    ActivityGridView(activity: store.activity)
                    deckCard
                }
                .padding(20)
            }
            .navigationTitle("TangoDots")
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("今日の学習")
                .font(.title2.bold())
            Text("復習 \(store.dueReviews) 枚 ・ 新規 \(store.newCards) 枚")
                .foregroundStyle(.secondary)
            Button("学習をはじめる") {
                // 学習セッション画面は次の実装段階で接続する。
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.top, 4)
        }
    }

    private var deckCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(store.deckName)
                .font(.headline)
            Text("復習 \(store.dueReviews) ・ 新規 \(store.newCards) ・ 収録 \(store.cardCount)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.quaternary, in: RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    HomeView(store: .preview)
}
