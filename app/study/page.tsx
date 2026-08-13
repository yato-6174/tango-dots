import type { Metadata } from "next";
import { StudyApp } from "../StudyApp";

export const metadata: Metadata = {
  title: "学習する | TangoDots",
  description: "TangoDotsで今日の英単語を学習する。",
};

export default function StudyPage() {
  return <StudyApp mode="study" />;
}
