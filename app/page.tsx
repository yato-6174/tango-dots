import type { Metadata } from "next";
import { StudyApp } from "./StudyApp";

export const metadata: Metadata = {
  title: "TangoDots | 毎日続く英単語帳",
  description: "1日100語から、復習を優先して続ける英単語帳。",
};

export default function Home() {
  return <StudyApp mode="home" />;
}
