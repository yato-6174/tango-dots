import SwiftUI

struct ActivityGridView: View {
    let activity: [DailyActivity]
    private let columns = Array(repeating: GridItem(.fixed(14), spacing: 4), count: 13)

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("学習の記録")
                .font(.headline)
            LazyVGrid(columns: columns, spacing: 4) {
                ForEach(activity) { day in
                    Circle()
                        .fill(color(for: day.level))
                        .frame(width: 14, height: 14)
                        .accessibilityLabel(accessibilityText(for: day))
                }
            }
            Text("直近91日")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private func color(for level: Int) -> Color {
        switch level {
        case 0: .gray.opacity(0.18)
        case 1: .mint.opacity(0.35)
        case 2: .mint.opacity(0.65)
        default: .mint
        }
    }

    private func accessibilityText(for day: DailyActivity) -> String {
        let date = day.date.formatted(date: .abbreviated, time: .omitted)
        return "\(date)、回答 \(day.answers) 枚"
    }
}

