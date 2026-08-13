import type { Metadata } from "next";
/* eslint-disable @next/next/no-html-link-for-pages */

export const metadata: Metadata = {
  title: "使い方 | TangoDots",
  description: "TangoDotsの評価ボタンとFSRS学習方式の説明。",
};

const choices = [
  ["もう一度", "思い出せなかった、または答えを間違えたとき。"],
  ["難しい", "思い出せたものの、かなり迷った・自信がなかったとき。"],
  ["良い", "無理なく思い出せたとき。迷ったら、まずはこれを選びます。"],
  ["かんたん", "すぐに、十分な自信をもって思い出せたとき。"],
];

export default function AboutPage() {
  return <main className="app-shell about-page">
    <header className="site-header"><a className="brand" href="/">TangoDots</a><a className="back-link" href="/">記録に戻る</a></header>
    <section className="about-hero">
      <p className="eyebrow">TangoDotsについて</p>
      <h1>忘れかける頃に、もう一度。</h1>
      <p>毎日の英単語を、少量ずつ、回答に合わせた復習タイミングで続ける単語帳です。</p>
    </section>
    <section className="about-section">
      <h2>評価の選び方</h2>
      <p>「答えを見たあと」ではなく、答えを見る前にどの程度思い出せたかで選びます。</p>
      <dl className="choice-list">
        {choices.map(([label, description]) => <div key={label}><dt>{label}</dt><dd>{description}</dd></div>)}
      </dl>
    </section>
    <section className="about-section">
      <h2>なぜ続けやすいのか</h2>
      <p>新規単語は1日100語までに抑え、まず期限が来た復習を出します。一度に大量の単語へ取り組むより、日々の負担を一定にしやすい設計です。</p>
    </section>
    <section className="about-section">
      <h2>FSRSによる復習</h2>
      <p>FSRS（Free Spaced Repetition Scheduler）は、回答履歴をもとに次の復習時期を調整します。固定の間隔で全員に同じ復習を出す方式と比べ、覚えている単語の反復を減らし、忘れやすい単語へ時間を使いやすくします。</p>
      <p>効果は評価を正直に選び、短時間でも継続することで高まりやすくなります。</p>
    </section>
    <footer className="site-footer">© 2026 Kade_6174. All rights reserved.</footer>
  </main>;
}
