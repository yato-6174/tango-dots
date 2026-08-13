import Foundation

struct VocabularySeed: Codable, Identifiable, Hashable {
    let sourceNumber: Int
    let front: String
    let back: String

    var id: Int { sourceNumber }

    static func load(from bundle: Bundle = .main) -> [VocabularySeed] {
        guard let url = bundle.url(forResource: "vocabulary", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let cards = try? JSONDecoder().decode([VocabularySeed].self, from: data)
        else {
            return []
        }
        return cards
    }
}

