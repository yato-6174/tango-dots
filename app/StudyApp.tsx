"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { createEmptyCard, fsrs, Rating, State, type Card } from "ts-fsrs";
import { useEffect, useMemo, useState } from "react";

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
const DAILY_NEW_CARD_LIMIT = 100;
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

function formatInterval(due: Date) {
  const minutes = Math.max(1, Math.round((due.getTime() - Date.now()) / 60000));
  if (minutes < 60) return `${minutes}分後`;
  const days = Math.max(1, Math.round(minutes / 1440));
  return `${days}日後`;
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEncouragement(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

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
      fetch("/api/progress", { headers: deviceHeaders(deviceId) }).then((response) => {
        if (!response.ok) throw new Error("progress fetch failed");
        return response.json() as Promise<{ cards: { card_id: number; scheduler_card_json: string; first_reviewed_at: number | null }[]; history: { card_id: number; rating: Rating; reviewed_at: number }[] }>;
      }),
    ]).then(([seeds, progress]) => {
      const stateByCardId = new Map(progress.cards.map((card) => [card.card_id, {
        schedulerCard: JSON.parse(card.scheduler_card_json) as SerializedCard,
        firstReviewedAt: card.first_reviewed_at,
      }]));
      setCards(seeds.map((seed) => ({ ...createStoredCard(seed), ...(stateByCardId.get(seed.sourceNumber) ?? {}) })));
      setHistory(progress.history.map((log) => ({ cardId: log.card_id, reviewedAt: new Date(log.reviewed_at).toISOString(), rating: log.rating })));
      setLoaded(true);
    }).catch(() => {
      setSaveError(true);
      setLoaded(true);
    });
  }, []);

  const startOfToday = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }, []);

  const introducedToday = cards.filter((card) => card.firstReviewedAt !== null && card.firstReviewedAt >= startOfToday).length;
  const remainingNewSlots = Math.max(0, DAILY_NEW_CARD_LIMIT - introducedToday);

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
  const preview = current ? scheduler.repeat(hydrateCard(current.schedulerCard), new Date()) : null;

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

  if (!loaded) return <main className="app-shell"><p className="muted">単語を読み込んでいます…</p></main>;

  return (
    <main className="app-shell">
      <header className="site-header"><a className="brand" href="/">TangoDots</a>{mode === "study" && <a className="back-link" href="/">記録に戻る</a>}</header>
      {mode === "home" && <>
      <section className="summary">
        <p className="eyebrow">今日の学習</p>
        <h1 key={encouragement} className="encouragement">{encouragement}</h1>
        <p className="summary-count">復習 <strong>{reviewCount}</strong> 枚 / 今日の新規 <strong>{introducedToday}</strong> / {DAILY_NEW_CARD_LIMIT} 枚</p>
        <p className="new-remaining">未学習 <strong>{newCount}</strong> 枚</p>
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
          <div className="daily-progress" role="progressbar" aria-label="今日の新規単語の進捗" aria-valuemin={0} aria-valuemax={DAILY_NEW_CARD_LIMIT} aria-valuenow={introducedToday}>
            <span className="daily-progress-bar" style={{ width: `${(introducedToday / DAILY_NEW_CARD_LIMIT) * 100}%` }} />
          </div>
          <small>{introducedToday} / {DAILY_NEW_CARD_LIMIT} 個</small>
        </div>
        <a className="start-button" href="/study">学習をはじめる</a>
      </section>
      </>}
      {mode === "study" && (current ? <section className="study-card" aria-live="polite">
        <div className="card-meta">{currentPosition} / {todaySetCount}</div>
        <p className="word">{current.front}</p>
        {revealed ? <><p className="meaning">{current.back}</p><div className="rating-grid">
          {[Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].map((rating) => <button className={`rating rating-${rating}`} key={rating} onClick={() => answer(rating)}>
            <span>{ratingLabels[rating]}</span><small>{preview ? formatInterval(preview[rating].card.due) : ""}</small>
          </button>)}
        </div></> : <button className="reveal" onClick={() => setRevealed(true)}>答えを見る</button>}
      </section> : <section className="complete"><h2>今日の学習は完了です</h2><p>{reviewCount > 0 ? "復習を完了してください。" : `今日の新規 ${DAILY_NEW_CARD_LIMIT} 枚を完了しました。また明日。`}</p><a className="back-link complete-link" href="/">記録を見る</a></section>)}
      {mode === "home" && <>
        <p className="privacy">学習履歴はCloudflare D1に保存されます。{saveError ? " 保存に失敗しました。ページを再読み込みして再試行してください。" : ""}</p>
        <footer className="site-footer">© 2026 Kade_6174. All rights reserved.</footer>
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
