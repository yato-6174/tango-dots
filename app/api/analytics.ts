import { env } from "cloudflare:workers";

export type AnalyticsEvent =
  | "home_opened"
  | "study_opened"
  | "answer_again"
  | "answer_hard"
  | "answer_good"
  | "answer_easy"
  | "daily_limit_changed"
  | "backup_downloaded"
  | "backup_restored"
  | "age_range_reported"
  | "time_spent_seconds";

// Do not add device IDs, card IDs, IP addresses, vocabulary, or free-form text here.
// This dataset is intentionally limited to anonymous, aggregate product metrics.
export function recordAnalytics(event: AnalyticsEvent, value = 1, detail = "") {
  env.TANGODOTS_ANALYTICS.writeDataPoint({
    blobs: [event, detail],
    doubles: [value],
    indexes: [event],
  });
}
