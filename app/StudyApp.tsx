"use client";

import { createEmptyCard, fsrs, Rating, State, type Card } from "ts-fsrs";
import { useEffect, useMemo, useState } from "react";

type VocabularySeed = { sourceNumber: number; front: string; back: string };
type StoredCard = VocabularySeed & { schedulerCard: SerializedCard };
type SerializedCard = Omit<Card, "due" | "last_review"> & {
  due: string;
  last_review: string | null;
};
type ReviewLog = { reviewedAt: string; rating: Rating };

const DEVICE_ID_KEY = "tangodots.device-id.v1";
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
  return { ...seed, schedulerCard: serializeCard(createEmptyCard()) };
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

export function StudyApp() {
  const [cards, setCards] = useState<StoredCard[]>([]);
  const [history, setHistory] = useState<ReviewLog[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    const deviceId = getDeviceId();
    Promise.all([
      fetch("/vocabulary.json").then((response) => response.json() as Promise<VocabularySeed[]>),
      fetch("/api/progress", { headers: deviceHeaders(deviceId) }).then((response) => {
        if (!response.ok) throw new Error("progress fetch failed");
        return response.json() as Promise<{ cards: { card_id: number; scheduler_card_json: string }[]; history: { rating: Rating; reviewed_at: number }[] }>;
      }),
    ]).then(([seeds, progress]) => {
      const stateByCardId = new Map(progress.cards.map((card) => [card.card_id, JSON.parse(card.scheduler_card_json) as SerializedCard]));
      setCards(seeds.map((seed) => ({ ...createStoredCard(seed), schedulerCard: stateByCardId.get(seed.sourceNumber) ?? serializeCard(createEmptyCard()) })));
      setHistory(progress.history.map((log) => ({ reviewedAt: new Date(log.reviewed_at).toISOString(), rating: log.rating })));
      setLoaded(true);
    }).catch(() => setSaveError(true));
  }, []);

  const current = useMemo(() => {
    const now = new Date();
    const due = cards
      .filter(({ schedulerCard }) => hydrateCard(schedulerCard).due <= now)
      .sort((a, b) => hydrateCard(a.schedulerCard).due.getTime() - hydrateCard(b.schedulerCard).due.getTime());
    return due[0] ?? cards.find(({ schedulerCard }) => hydrateCard(schedulerCard).state === State.New) ?? null;
  }, [cards]);

  const reviewCount = cards.filter(({ schedulerCard }) => {
    const card = hydrateCard(schedulerCard);
    return card.state !== State.New && card.due <= new Date();
  }).length;
  const newCount = cards.filter(({ schedulerCard }) => hydrateCard(schedulerCard).state === State.New).length;
  const preview = current ? scheduler.repeat(hydrateCard(current.schedulerCard), new Date()) : null;

  const days = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
    return Array.from({ length: 91 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (90 - index));
      const key = formatter.format(date);
      const count = history.filter((log) => formatter.format(new Date(log.reviewedAt)) === key).length;
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
    const reviewedAt = Date.now();
    setCards((previous) => previous.map((item) => item.sourceNumber === current.sourceNumber
      ? { ...item, schedulerCard: serialized }
      : item));
    setHistory((previous) => [...previous, { reviewedAt: new Date(reviewedAt).toISOString(), rating }]);
    setRevealed(false);
    fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json", ...deviceHeaders(getDeviceId()) },
      body: JSON.stringify({ cardId: current.sourceNumber, schedulerCard: serialized, rating, reviewedAt }),
    }).then((response) => {
      if (!response.ok) setSaveError(true);
    }).catch(() => setSaveError(true));
  }

  if (!loaded) return <main className="app-shell"><p className="muted">単語を読み込んでいます…</p></main>;

  return (
    <main className="app-shell">
      <header className="site-header"><span className="brand">TangoDots</span><span>無料・FSRS単語帳</span></header>
      <section className="summary">
        <p className="eyebrow">今日の学習</p>
        <h1>少しずつ、確実に。</h1>
        <p className="summary-count">復習 <strong>{reviewCount}</strong> 枚　新規 <strong>{newCount}</strong> 枚</p>
      </section>
      <section className="activity-card" aria-labelledby="activity-title">
        <div><h2 id="activity-title">学習の記録</h2><p>{streak}日連続</p></div>
        <div className="activity-grid" aria-label="直近91日の学習記録">
          {days.map((day) => <span key={day.date.toISOString()} className={`dot level-${activityLevel(day.count)}`} title={`${day.date.toLocaleDateString("ja-JP")}: ${day.count}枚`} />)}
        </div>
        <small>直近91日</small>
      </section>
      {current ? <section className="study-card" aria-live="polite">
        <div className="card-meta">{current.sourceNumber} / {cards.length}</div>
        <p className="word">{current.front}</p>
        {revealed ? <><p className="meaning">{current.back}</p><div className="rating-grid">
          {[Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].map((rating) => <button className={`rating rating-${rating}`} key={rating} onClick={() => answer(rating)}>
            <span>{ratingLabels[rating]}</span><small>{preview ? formatInterval(preview[rating].card.due) : ""}</small>
          </button>)}
        </div></> : <button className="reveal" onClick={() => setRevealed(true)}>答えを見る</button>}
      </section> : <section className="complete"><h2>今日の学習は完了です</h2><p>また次の復習で会いましょう。</p></section>}
      <p className="privacy">学習履歴はCloudflare D1に保存されます。{saveError ? " 保存に失敗しました。ページを再読み込みして再試行してください。" : ""}</p>
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
