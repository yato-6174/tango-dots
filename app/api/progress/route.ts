import { env } from "cloudflare:workers";

const DEVICE_ID_HEADER = "x-tangodots-device-id";
const VALID_DEVICE_ID = /^[a-zA-Z0-9-]{16,80}$/;
const VALID_RATINGS = new Set([1, 2, 3, 4]);

function deviceIdFrom(request: Request) {
  const deviceId = request.headers.get(DEVICE_ID_HEADER) ?? "";
  return VALID_DEVICE_ID.test(deviceId) ? deviceId : null;
}

export async function GET(request: Request) {
  const deviceId = deviceIdFrom(request);
  if (!deviceId) return Response.json({ error: "無効な端末識別子です。" }, { status: 400 });

  const from = Date.now() - 91 * 24 * 60 * 60 * 1000;
  const [cardStates, reviewLogs] = await env.DB.batch([
    env.DB.prepare(
      "SELECT card_id, scheduler_card_json FROM user_card_states WHERE device_id = ?",
    ).bind(deviceId),
    env.DB.prepare(
      "SELECT card_id, rating, reviewed_at FROM review_logs WHERE device_id = ? AND reviewed_at >= ? ORDER BY reviewed_at ASC",
    ).bind(deviceId, from),
  ]);

  return Response.json({ cards: cardStates.results, history: reviewLogs.results });
}

export async function POST(request: Request) {
  const deviceId = deviceIdFrom(request);
  if (!deviceId) return Response.json({ error: "無効な端末識別子です。" }, { status: 400 });

  const payload = await request.json() as {
    cardId?: number;
    schedulerCard?: unknown;
    rating?: number;
    reviewedAt?: number;
  };
  if (!Number.isInteger(payload.cardId) || payload.cardId! < 1 || payload.cardId! > 2300 ||
      !VALID_RATINGS.has(payload.rating ?? 0) || !Number.isFinite(payload.reviewedAt) || !payload.schedulerCard) {
    return Response.json({ error: "学習データの形式が正しくありません。" }, { status: 400 });
  }

  const schedulerCardJson = JSON.stringify(payload.schedulerCard);
  const updatedAt = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO user_card_states (device_id, card_id, scheduler_card_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(device_id, card_id) DO UPDATE SET scheduler_card_json = excluded.scheduler_card_json, updated_at = excluded.updated_at",
    ).bind(deviceId, payload.cardId, schedulerCardJson, updatedAt),
    env.DB.prepare(
      "INSERT INTO review_logs (device_id, card_id, rating, reviewed_at) VALUES (?, ?, ?, ?)",
    ).bind(deviceId, payload.cardId, payload.rating, payload.reviewedAt),
  ]);

  return Response.json({ ok: true });
}
