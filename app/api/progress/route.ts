import { env } from "cloudflare:workers";
import { recordAnalytics } from "../analytics";

const DEVICE_ID_HEADER = "x-tangodots-device-id";
const VALID_DEVICE_ID = /^[a-zA-Z0-9-]{16,80}$/;
const VALID_RATINGS = new Set([1, 2, 3, 4]);
const VALID_DAILY_NEW_LIMITS = new Set(Array.from({ length: 19 }, (_, index) => 10 + index * 5));
const DEFAULT_DAILY_NEW_LIMIT = 50;

function deviceIdFrom(request: Request) {
  const deviceId = request.headers.get(DEVICE_ID_HEADER) ?? "";
  return VALID_DEVICE_ID.test(deviceId) ? deviceId : null;
}

export async function GET(request: Request) {
  const deviceId = deviceIdFrom(request);
  if (!deviceId) return Response.json({ error: "無効な端末識別子です。" }, { status: 400 });

  const from = Date.now() - 91 * 24 * 60 * 60 * 1000;
  const [cardStates, reviewLogs, settings] = await env.DB.batch([
    env.DB.prepare(
      "SELECT card_id, scheduler_card_json, first_reviewed_at FROM user_card_states WHERE device_id = ?",
    ).bind(deviceId),
    env.DB.prepare(
      "SELECT card_id, rating, reviewed_at FROM review_logs WHERE device_id = ? AND reviewed_at >= ? ORDER BY reviewed_at ASC",
    ).bind(deviceId, from),
    env.DB.prepare(
      "SELECT daily_new_limit FROM user_settings WHERE device_id = ?",
    ).bind(deviceId),
  ]);

  const setting = settings.results[0] as { daily_new_limit?: number } | undefined;
  const view = new URL(request.url).searchParams.get("view");
  recordAnalytics(view === "study" ? "study_opened" : "home_opened");
  return Response.json({ cards: cardStates.results, history: reviewLogs.results, dailyNewLimit: setting?.daily_new_limit ?? DEFAULT_DAILY_NEW_LIMIT });
}

export async function PUT(request: Request) {
  const deviceId = deviceIdFrom(request);
  if (!deviceId) return Response.json({ error: "無効な端末識別子です。" }, { status: 400 });

  const payload = await request.json() as { dailyNewLimit?: number };
  if (!VALID_DAILY_NEW_LIMITS.has(payload.dailyNewLimit ?? 0)) {
    return Response.json({ error: "1日の新規単語数は10〜100語を5語刻みで指定してください。" }, { status: 400 });
  }

  await env.DB.prepare(
    "INSERT INTO user_settings (device_id, daily_new_limit, updated_at) VALUES (?, ?, ?) ON CONFLICT(device_id) DO UPDATE SET daily_new_limit = excluded.daily_new_limit, updated_at = excluded.updated_at",
  ).bind(deviceId, payload.dailyNewLimit, Date.now()).run();
  recordAnalytics("daily_limit_changed", payload.dailyNewLimit);

  return Response.json({ ok: true, dailyNewLimit: payload.dailyNewLimit });
}

export async function POST(request: Request) {
  const deviceId = deviceIdFrom(request);
  if (!deviceId) return Response.json({ error: "無効な端末識別子です。" }, { status: 400 });

  const payload = await request.json() as {
    cardId?: number;
    schedulerCard?: unknown;
    rating?: number;
    reviewedAt?: number;
    firstReviewedAt?: number;
  };
  if (!Number.isInteger(payload.cardId) || payload.cardId! < 1 || payload.cardId! > 2300 ||
      !VALID_RATINGS.has(payload.rating ?? 0) || !Number.isFinite(payload.reviewedAt) ||
      !Number.isFinite(payload.firstReviewedAt) || !payload.schedulerCard) {
    return Response.json({ error: "学習データの形式が正しくありません。" }, { status: 400 });
  }

  const schedulerCardJson = JSON.stringify(payload.schedulerCard);
  const updatedAt = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO user_card_states (device_id, card_id, scheduler_card_json, first_reviewed_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(device_id, card_id) DO UPDATE SET scheduler_card_json = excluded.scheduler_card_json, first_reviewed_at = COALESCE(user_card_states.first_reviewed_at, excluded.first_reviewed_at), updated_at = excluded.updated_at",
    ).bind(deviceId, payload.cardId, schedulerCardJson, payload.firstReviewedAt, updatedAt),
    env.DB.prepare(
      "INSERT INTO review_logs (device_id, card_id, rating, reviewed_at) VALUES (?, ?, ?, ?)",
    ).bind(deviceId, payload.cardId, payload.rating, payload.reviewedAt),
  ]);
  recordAnalytics((["answer_again", "answer_hard", "answer_good", "answer_easy"] as const)[payload.rating! - 1]);

  return Response.json({ ok: true });
}
