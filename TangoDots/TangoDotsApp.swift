import SwiftUI

@main
struct TangoDotsApp: App {
    @State private var store = StudyStore.initial

    var body: some Scene {
        WindowGroup {
            HomeView(store: store)
        }
    }
}
