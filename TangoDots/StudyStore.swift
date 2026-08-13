import Foundation
import Observation

@Observable
final class StudyStore {
    var deckName: String
    var dueReviews: Int
    var newCards: Int
    var cardCount: Int
    var activity: [DailyActivity]

    init(deckName: String, dueReviews: Int, newCards: Int, cardCount: Int, activity: [DailyActivity]) {
        self.deckName = deckName
        self.dueReviews = dueReviews
        self.newCards = newCards
        self.cardCount = cardCount
        self.activity = activity
    }

    static let initial = StudyStore(
        deckName: "英単語",
        dueReviews: 0,
        newCards: min(VocabularySeed.load().count, 20),
        cardCount: VocabularySeed.load().count,
        activity: []
    )

    static let preview = StudyStore(
        deckName: "英単語",
        dueReviews: 12,
        newCards: 8,
        cardCount: 2_300,
        activity: DailyActivity.preview
    )
}

struct DailyActivity: Identifiable, Hashable {
    let date: Date
    let answers: Int

    var id: Date { date }

    var level: Int {
        switch answers {
        case 0: 0
        case 1...9: 1
        case 10...29: 2
        default: 3
        }
    }

    static let preview: [DailyActivity] = {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: .now)
        return (0..<91).compactMap { offset in
            guard let date = calendar.date(byAdding: .day, value: offset - 90, to: today) else { return nil }
            let answers = offset.isMultiple(of: 9) ? 0 : (offset * 7) % 38
            return DailyActivity(date: date, answers: answers)
        }
    }()
}
