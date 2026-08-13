import SwiftUI
import WidgetKit

struct TangoDotsEntry: TimelineEntry {
    let date: Date
    let dueReviews: Int
    let streak: Int
}

struct TangoDotsProvider: TimelineProvider {
    func placeholder(in context: Context) -> TangoDotsEntry {
        TangoDotsEntry(date: .now, dueReviews: 12, streak: 6)
    }

    func getSnapshot(in context: Context, completion: @escaping (TangoDotsEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TangoDotsEntry>) -> Void) {
        let entry = placeholder(in: context)
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: .now) ?? .now
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

struct TangoDotsWidgetView: View {
    let entry: TangoDotsEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("TangoDots")
                .font(.headline)
            Text("今日の復習")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("\(entry.dueReviews) 枚")
                .font(.system(size: 34, weight: .bold, design: .rounded))
            Text("\(entry.streak) 日連続")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

@main
struct TangoDotsWidget: Widget {
    let kind = "TangoDotsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TangoDotsProvider()) { entry in
            TangoDotsWidgetView(entry: entry)
        }
        .configurationDisplayName("TangoDots")
        .description("今日の復習枚数と学習の継続を表示します。")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

