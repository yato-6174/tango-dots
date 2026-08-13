import { env } from "cloudflare:workers";
import { recordAnalytics } from "../analytics";

const DEVICE_ID_HEADER = "x-tangodots-device-id";
const VALID_DEVICE_ID = /^[a-zA-Z0-9-]{16,80}$/;
const VALID_RATINGS = new Set([1, 2, 3, 4]);
const VALID_DAILY_NEW_LIMITS = new Set(Array.from({ length: 19 }, (_, index) => 10 + index * 5));
const MAX_BACKUP_LOGS = 100_000;
const STATEMENTS_PER_BATCH = 50;

type BackupCard = {
  card_id: number;
  scheduler_card_json: string;
  first_reviewed_at: number | null;
};
type BackupLog = { card_id: number; rating: number; reviewed_at: number };
type BackupPayload = {
  version: 1;
  exportedAt: string;
  cards: BackupCard[];
  history: BackupLog[];
  dailyNewLimit: number;
};

function deviceIdFrom(request: Request) {
  const deviceId = request.headers.get(DEVICE_ID_HEADER) ?? "";
  return VALID_DEVICE_ID.test(deviceId) ? deviceId : null;
}

function isCardId(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 2300;
}

function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== "object") return false;
  const backup = value as Partial<BackupPayload>;
  if (backup.version !== 1 || typeof backup.exportedAt !== "string" ||
      !Array.isArray(backup.cards) || !Array.isArray(backup.history) ||
      !VALID_DAILY_NEW_LIMITS.has(backup.dailyNewLimit ?? 0) || backup.cards.length > 2300 ||
      backup.history.length > MAX_BACKUP_LOGS) return false;

  return backup.cards.every((card) => isCardId(card.card_id) &&
    typeof card.scheduler_card_json === "string" && card.scheduler_card_json.length > 1 &&
    (card.first_reviewed_at === null || Number.isFinite(card.first_reviewed_at))) &&
    backup.history.every((log) => isCardId(log.card_id) && VALID_RATINGS.has(log.rating) && Number.isFinite(log.reviewed_at));
}

export async function GET(request: Request) {
  const deviceId = deviceIdFrom(request);
  if (!deviceId) return Response.json({ error: "無効な端末識別子です。" }, { status: 400 });

  const [cardStates, reviewLogs, settings] = await env.DB.batch([
    env.DB.prepare("SELECT card_id, scheduler_card_json, first_reviewed_at FROM user_card_states WHERE device_id = ? ORDER BY card_id ASC").bind(deviceId),
    env.DB.prepare("SELECT card_id, rating, reviewed_at FROM review_logs WHERE device_id = ? ORDER BY reviewed_at ASC").bind(deviceId),
    env.DB.prepare("SELECT daily_new_limit FROM user_settings WHERE device_id = ?").bind(deviceId),
  ]);
  const setting = settings.results[0] as { daily_new_limit?: number } | undefined;
  recordAnalytics("backup_downloaded");

  return Response.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    cards: cardStates.results,
    history: reviewLogs.results,
    dailyNewLimit: setting?.daily_new_limit ?? 50,
  } satisfies BackupPayload, {
    headers: { "content-disposition": "attachment; filename=tangodots-backup.json" },
  });
}

export async function POST(request: Request) {
  const deviceId = deviceIdFrom(request);
  if (!deviceId) return Response.json({ error: "無効な端末識別子です。" }, { status: 400 });

  const payload: unknown = await request.json().catch(() => null);
  if (!isBackupPayload(payload)) return Response.json({ error: "バックアップファイルの形式が正しくありません。" }, { status: 400 });

  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM user_card_states WHERE device_id = ?").bind(deviceId),
    env.DB.prepare("DELETE FROM review_logs WHERE device_id = ?").bind(deviceId),
    env.DB.prepare("DELETE FROM user_settings WHERE device_id = ?").bind(deviceId),
  ]);

  const statements = [
    ...payload.cards.map((card) => env.DB.prepare(
      "INSERT INTO user_card_states (device_id, card_id, scheduler_card_json, first_reviewed_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).bind(deviceId, card.card_id, card.scheduler_card_json, card.first_reviewed_at, now)),
    ...payload.history.map((log) => env.DB.prepare(
      "INSERT INTO review_logs (device_id, card_id, rating, reviewed_at) VALUES (?, ?, ?, ?)",
    ).bind(deviceId, log.card_id, log.rating, log.reviewed_at)),
    env.DB.prepare("INSERT INTO user_settings (device_id, daily_new_limit, updated_at) VALUES (?, ?, ?)").bind(deviceId, payload.dailyNewLimit, now),
  ];
  for (let index = 0; index < statements.length; index += STATEMENTS_PER_BATCH) {
    await env.DB.batch(statements.slice(index, index + STATEMENTS_PER_BATCH));
  }
  recordAnalytics("backup_restored");

  return Response.json({ ok: true });
}
