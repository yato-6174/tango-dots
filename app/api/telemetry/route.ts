import { recordAnalytics } from "../analytics";

const AGE_RANGES = new Set(["13-17", "18-24", "25-34", "35-44", "45-54", "55+", "no_answer"]);
const MAX_VISIT_SECONDS = 60 * 60;

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as { event?: string; value?: number; detail?: string } | null;
  if (!payload) return Response.json({ error: "集計データの形式が正しくありません。" }, { status: 400 });

  if (payload.event === "age_range_reported" && AGE_RANGES.has(payload.detail ?? "")) {
    recordAnalytics("age_range_reported", 1, payload.detail!);
    return Response.json({ ok: true });
  }

  if (payload.event === "time_spent_seconds" && Number.isFinite(payload.value) && payload.value! >= 5 && payload.value! <= MAX_VISIT_SECONDS) {
    recordAnalytics("time_spent_seconds", Math.round(payload.value!));
    return Response.json({ ok: true });
  }

  return Response.json({ error: "対応していない集計イベントです。" }, { status: 400 });
}
