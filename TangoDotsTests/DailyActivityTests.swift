import XCTest
@testable import TangoDots

final class DailyActivityTests: XCTestCase {
    func testActivityLevelUsesConfiguredThresholds() {
        XCTAssertEqual(DailyActivity(date: .now, answers: 0).level, 0)
        XCTAssertEqual(DailyActivity(date: .now, answers: 1).level, 1)
        XCTAssertEqual(DailyActivity(date: .now, answers: 9).level, 1)
        XCTAssertEqual(DailyActivity(date: .now, answers: 10).level, 2)
        XCTAssertEqual(DailyActivity(date: .now, answers: 29).level, 2)
        XCTAssertEqual(DailyActivity(date: .now, answers: 30).level, 3)
    }
}

