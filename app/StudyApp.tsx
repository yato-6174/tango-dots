"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { createEmptyCard, fsrs, Rating, State, type Card } from "ts-fsrs";
import { useEffect, useMemo, useRef, useState } from "react";

type VocabularySeed = { sourceNumber: number; front: string; back: string };
type StoredCard = VocabularySeed & {
  schedulerCard: SerializedCard;
  firstReviewedAt: number | null;
};
type SerializedCard = Omit<Card, "due" | "last_review"> & {
  due: string;
  last_review: string | null;
};
type ReviewLog = { cardId: number; reviewedAt: string; rating: Rating };

const DEVICE_ID_KEY = "tangodots.device-id.v1";
const AGE_SURVEY_DONE_KEY = "tangodots.age-survey-done.v1";
const DEFAULT_DAILY_NEW_CARD_LIMIT = 50;
const DAILY_NEW_CARD_LIMITS = Array.from({ length: 19 }, (_, index) => 10 + index * 5);
const ENCOURAGEMENTS = [
  "千里の道も一歩から。",
  "継続は力なり。",
  "小さな前進も、前進。",
  "今日の一語が、明日の自信になる。",
  "完璧より、続けること。",
  "学びは、未来の自分への贈り物。",
  "焦らず、比べず、一歩ずつ。",
];
const scheduler = fsrs({
  request_retention: 0.9,
  enable_fuzz: true,
  enable_short_term: true,
  learning_steps: ["1m", "10m"],
  relearning_steps: ["10m"],
});

const ratingLabels: Record<Rating, string> = {
  [Rating.Again]: "もう一度",
  [Rating.Hard]: "難しい",
  [Rating.Good]: "良い",
  [Rating.Easy]: "かんたん",
};

function serializeCard(card: Card): SerializedCard {
  return {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review?.toISOString() ?? null,
  };
}

function hydrateCard(card: SerializedCard): Card {
  return {
    ...card,
    due: new Date(card.due),
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  };
}

function createStoredCard(seed: VocabularySeed): StoredCard {
  return { ...seed, schedulerCard: serializeCard(createEmptyCard()), firstReviewedAt: null };
}

function activityLevel(count: number) {
  if (count === 0) return 0;
  if (count < 10) return 1;
  if (count < 30) return 2;
  return 3;
}

export function StudyApp({ mode = "home" }: { mode?: "home" | "study" }) {
  const [cards, setCards] = useState<StoredCard[]>([]);
  const [history, setHistory] = useState<ReviewLog[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [encouragement, setEncouragement] = useState(ENCOURAGEMENTS[0]);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [dailyNewLimit, setDailyNewLimit] = useState(DEFAULT_DAILY_NEW_CARD_LIMIT);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [ageRange, setAgeRange] = useState("");
  const [ageSurveyDone, setAgeSurveyDone] = useState(true);
  const backupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEncouragement(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAgeSurveyDone(localStorage.getItem(AGE_SURVEY_DONE_KEY) === "true");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const startedAt = Date.now();
    const reportDuration = () => {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      if (seconds < 5) return;
      void fetch("/api/telemetry", {
        method: "POST",
        keepalive: true,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: "time_spent_seconds", value: seconds }),
      });
    };
    window.addEventListener("pagehide", reportDuration);
    return () => window.removeEventListener("pagehide", reportDuration);
  }, [mode]);

  useEffect(() => {
    const dismissTooltip = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".dot-button")) {
        setActiveDay(null);
      }
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveDay(null);
    };
    document.addEventListener("pointerdown", dismissTooltip);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissTooltip);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, []);

  useEffect(() => {
    const deviceId = getDeviceId();
    Promise.all([
      fetch("/vocabulary.json").then((response) => response.json() as Promise<VocabularySeed[]>),
      fetch(`/api/progress?view=${mode}`, { headers: deviceHeaders(deviceId) }).then((response) => {
        if (!response.ok) throw new Error("progress fetch failed");
        return response.json() as Promise<{ cards: { card_id: number; scheduler_card_json: string; first_reviewed_at: number | null }[]; history: { card_id: number; rating: Rating; reviewed_at: number }[]; dailyNewLimit: number }>;
      }),
    ]).then(([seeds, progress]) => {
      const stateByCardId = new Map(progress.cards.map((card) => [card.card_id, {
        schedulerCard: JSON.parse(card.scheduler_card_json) as SerializedCard,
        firstReviewedAt: card.first_reviewed_at,
      }]));
      setCards(seeds.map((seed) => ({ ...createStoredCard(seed), ...(stateByCardId.get(seed.sourceNumber) ?? {}) })));
      setHistory(progress.history.map((log) => ({ cardId: log.card_id, reviewedAt: new Date(log.reviewed_at).toISOString(), rating: log.rating })));
      setDailyNewLimit(progress.dailyNewLimit);
      setLoaded(true);
    }).catch(() => {
      setSaveError(true);
      setLoaded(true);
    });
  }, [mode]);

  const startOfToday = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }, []);

  const introducedToday = cards.filter((card) => card.firstReviewedAt !== null && card.firstReviewedAt >= startOfToday).length;
  const remainingNewSlots = Math.max(0, dailyNewLimit - introducedToday);

  const current = useMemo(() => {
    const now = new Date();
    const due = cards
      .filter(({ schedulerCard }) => {
        const card = hydrateCard(schedulerCard);
        return card.state !== State.New && card.due <= now;
      })
      .sort((a, b) => hydrateCard(a.schedulerCard).due.getTime() - hydrateCard(b.schedulerCard).due.getTime());
    const newCards = cards.filter(({ schedulerCard }) => hydrateCard(schedulerCard).state === State.New);
    return due[0] ?? (remainingNewSlots > 0 ? newCards[0] : null);
  }, [cards, remainingNewSlots]);

  const reviewCount = cards.filter(({ schedulerCard }) => {
    const card = hydrateCard(schedulerCard);
    return card.state !== State.New && card.due <= new Date();
  }).length;
  const newCount = cards.filter(({ schedulerCard }) => hydrateCard(schedulerCard).state === State.New).length;

  const todayReviewedCardIds = useMemo(() => new Set(history
    .filter((log) => new Date(log.reviewedAt).getTime() >= startOfToday)
    .map((log) => log.cardId)), [history, startOfToday]);
  const todayCompletedCount = todayReviewedCardIds.size;
  const dueUnseenTodayCount = cards.filter(({ sourceNumber, schedulerCard }) => {
    const card = hydrateCard(schedulerCard);
    return card.state !== State.New && card.due <= new Date() && !todayReviewedCardIds.has(sourceNumber);
  }).length;
  const todaySetCount = todayCompletedCount + dueUnseenTodayCount + remainingNewSlots;
  const currentPosition = current && !todayReviewedCardIds.has(current.sourceNumber)
    ? todayCompletedCount + 1
    : todayCompletedCount;

  const days = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
    return Array.from({ length: 91 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (90 - index));
      const key = formatter.format(date);
      const count = new Set(history
        .filter((log) => formatter.format(new Date(log.reviewedAt)) === key)
        .map((log) => log.cardId)).size;
      return { date, count };
    });
  }, [history]);

  const streak = (() => {
    let total = 0;
    for (const day of [...days].reverse()) {
      if (day.count === 0) break;
      total += 1;
    }
    return total;
  })();

  function answer(rating: Rating) {
    if (!current) return;
    const result = scheduler.next(hydrateCard(current.schedulerCard), new Date(), rating);
    const serialized = serializeCard(result.card);
    const reviewedAt = new Date().getTime();
    const firstReviewedAt = current.firstReviewedAt ?? reviewedAt;
    setCards((previous) => previous.map((item) => item.sourceNumber === current.sourceNumber
      ? { ...item, schedulerCard: serialized, firstReviewedAt }
      : item));
    setHistory((previous) => [...previous, { cardId: current.sourceNumber, reviewedAt: new Date(reviewedAt).toISOString(), rating }]);
    setRevealed(false);
    fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json", ...deviceHeaders(getDeviceId()) },
      body: JSON.stringify({ cardId: current.sourceNumber, schedulerCard: serialized, rating, reviewedAt, firstReviewedAt }),
    }).then((response) => {
      if (!response.ok) setSaveError(true);
    }).catch(() => setSaveError(true));
  }

  function changeDailyNewLimit(value: number) {
    setDailyNewLimit(value);
    fetch("/api/progress", {
      method: "PUT",
      headers: { "content-type": "application/json", ...deviceHeaders(getDeviceId()) },
      body: JSON.stringify({ dailyNewLimit: value }),
    }).then((response) => {
      if (!response.ok) setSaveError(true);
    }).catch(() => setSaveError(true));
  }

  async function downloadBackup() {
    setBackupMessage(null);
    try {
      const response = await fetch("/api/backup", { headers: deviceHeaders(getDeviceId()) });
      if (!response.ok) throw new Error("backup download failed");
      const backup = await response.json();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tangodots-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setBackupMessage("バックアップをダウンロードしました。iCloud DriveやGoogle Driveなどへ保管してください。");
    } catch {
      setBackupMessage("バックアップを作成できませんでした。もう一度お試しください。");
    }
  }

  async function restoreBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!window.confirm("現在のこの端末の学習履歴を、バックアップの内容に置き換えます。よろしいですか？")) return;

    setIsRestoring(true);
    setBackupMessage(null);
    try {
      const backup = JSON.parse(await file.text());
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "content-type": "application/json", ...deviceHeaders(getDeviceId()) },
        body: JSON.stringify(backup),
      });
      if (!response.ok) throw new Error("backup restore failed");
      window.location.reload();
    } catch {
      setBackupMessage("復元できませんでした。TangoDotsから出力したJSONファイルを選択してください。");
      setIsRestoring(false);
    }
  }

  function submitAgeRange() {
    if (!ageRange) return;
    void fetch("/api/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "age_range_reported", detail: ageRange }),
    });
    localStorage.setItem(AGE_SURVEY_DONE_KEY, "true");
    setAgeSurveyDone(true);
  }

  if (!loaded) return <main className="app-shell"><p className="muted">単語を読み込んでいます…</p></main>;

  return (
    <main className="app-shell">
      <header className="site-header"><a className="brand" href="/">TangoDots</a>{mode === "study" ? <a className="back-link" href="/">記録に戻る</a> : <a className="about-link" href="/about">使い方</a>}</header>
      {mode === "home" && <div className="home-content">
      <section className="summary">
        <p className="eyebrow">今日の学習</p>
        <h1 key={encouragement} className="encouragement">{encouragement}</h1>
        <div className="summary-stats" aria-label="今日の学習量">
          <div><span>復習</span><strong>{reviewCount}<small>語</small></strong></div>
          <div><span>今日の新規</span><strong>{introducedToday}<small> / {dailyNewLimit}語</small></strong></div>
        </div>
        <p className="new-remaining">未学習 <strong>{newCount}</strong> 語</p>
      </section>
      <section className="activity-card" aria-labelledby="activity-title">
        <div><h2 id="activity-title">学習の記録</h2><p>{streak}日連続</p></div>
        <div className="activity-grid" aria-label="直近91日の学習記録" onMouseLeave={() => setActiveDay(null)}>
          {days.map((day) => {
            const dayKey = day.date.toISOString();
            const isActive = activeDay === dayKey;
            const label = `${day.date.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}: ${day.count}語`;
            return <span className={`dot-wrap ${isActive ? "is-active" : ""}`} key={dayKey}>
              <button
                type="button"
                className={`dot-button dot level-${activityLevel(day.count)}`}
                aria-label={label}
                aria-expanded={isActive}
                onMouseEnter={() => setActiveDay(dayKey)}
                onFocus={() => setActiveDay(dayKey)}
                onClick={() => setActiveDay((previous) => previous === dayKey ? null : dayKey)}
              />
              {isActive && <span className="dot-tooltip" role="tooltip">{label}</span>}
            </span>;
          })}
        </div>
        <small>直近91日</small>
      </section>
      <section className="start-card">
        <div className="start-card-copy"><h2>今日のセット</h2><p>{reviewCount > 0 ? `復習 ${reviewCount} 枚を優先して始めましょう。` : `新規の単語をあと ${remainingNewSlots} 個まで学習できます。`}</p>
          <label className="daily-limit-control">1日の新規単語
            <select value={dailyNewLimit} onChange={(event) => changeDailyNewLimit(Number(event.target.value))}>
              {DAILY_NEW_CARD_LIMITS.map((limit) => <option key={limit} value={limit}>{limit}語</option>)}
            </select>
          </label>
          <div className="daily-progress" role="progressbar" aria-label="今日の新規単語の進捗" aria-valuemin={0} aria-valuemax={dailyNewLimit} aria-valuenow={Math.min(introducedToday, dailyNewLimit)}>
            <span className="daily-progress-bar" style={{ width: `${Math.min(100, (introducedToday / dailyNewLimit) * 100)}%` }} />
          </div>
          <small>{introducedToday} / {dailyNewLimit} 個</small>
        </div>
        <a className="start-button" href="/study">学習をはじめる</a>
      </section>
      <section className="backup-card" aria-labelledby="backup-title">
        <div>
          <h2 id="backup-title">データのバックアップ</h2>
          <p>学習履歴とFSRSの復習予定をJSONファイルに保存できます。ブラウザのデータを削除する前や、端末を変える前に保管してください。</p>
        </div>
        <div className="backup-actions">
          <button type="button" className="backup-button" onClick={downloadBackup}>バックアップを保存</button>
          <button type="button" className="backup-button backup-button-secondary" onClick={() => backupInputRef.current?.click()} disabled={isRestoring}>{isRestoring ? "復元中…" : "バックアップを復元"}</button>
          <input ref={backupInputRef} hidden type="file" accept="application/json,.json" onChange={restoreBackup} />
        </div>
        {backupMessage && <p className="backup-message" role="status">{backupMessage}</p>}
      </section>
      {!ageSurveyDone && <section className="survey-card" aria-labelledby="survey-title">
        <div>
          <h2 id="survey-title">任意アンケート</h2>
          <p>サービス改善のため、年代のみを匿名で集計します。送信しない場合は何も記録されません。</p>
        </div>
        <div className="survey-actions">
          <label>年代
            <select value={ageRange} onChange={(event) => setAgeRange(event.target.value)}>
              <option value="">選択してください</option>
              <option value="13-17">13〜17歳</option>
              <option value="18-24">18〜24歳</option>
              <option value="25-34">25〜34歳</option>
              <option value="35-44">35〜44歳</option>
              <option value="45-54">45〜54歳</option>
              <option value="55+">55歳以上</option>
            </select>
          </label>
          <button type="button" className="backup-button" disabled={!ageRange} onClick={submitAgeRange}>匿名で送信</button>
          <button type="button" className="survey-skip" onClick={() => { localStorage.setItem(AGE_SURVEY_DONE_KEY, "true"); setAgeSurveyDone(true); }}>回答しない</button>
        </div>
      </section>}
      </div>}
      {mode === "study" && <section className="study-progress" aria-label="今日の学習進捗">
        <div><span>今日の進捗</span><strong>{todayCompletedCount} / {todaySetCount} 語</strong></div>
        <div className="study-progress-track" role="progressbar" aria-label="今日の学習の進捗" aria-valuemin={0} aria-valuemax={todaySetCount} aria-valuenow={todayCompletedCount}>
          <span style={{ width: `${todaySetCount === 0 ? 100 : Math.min(100, (todayCompletedCount / todaySetCount) * 100)}%` }} />
        </div>
      </section>}
      {mode === "study" && (current ? <section className="study-card" aria-live="polite">
        <div className="card-meta">{currentPosition} / {todaySetCount}</div>
        <p className="word">{current.front}</p>
        {revealed ? <><p className="meaning">{current.back}</p><div className="rating-grid">
          {[Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].map((rating) => <button className={`rating rating-${rating}`} key={rating} onClick={() => answer(rating)}>{ratingLabels[rating]}</button>)}
        </div></> : <button className="reveal" onClick={() => setRevealed(true)}>答えを見る</button>}
      </section> : <section className="complete"><h2>今日の学習は完了です</h2><p>{reviewCount > 0 ? "復習を完了してください。" : `今日の新規 ${dailyNewLimit} 語を完了しました。また明日。`}</p><a className="back-link complete-link" href="/">記録を見る</a></section>)}
      {mode === "home" && <>
        <p className="privacy">学習データはこのブラウザに紐づきます。個人情報を含まない匿名の利用統計（利用画面・滞在時間・任意の年代）を、サービス改善のために集計します。{saveError ? " 保存に失敗しました。ページを再読み込みして再試行してください。" : ""}</p>
        <footer className="site-footer">© 2026 yato-6174. All rights reserved.</footer>
      </>}
    </main>
  );
}

function getDeviceId() {
  const stored = localStorage.getItem(DEVICE_ID_KEY);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

function deviceHeaders(deviceId: string) {
  return { "x-tangodots-device-id": deviceId };
}
