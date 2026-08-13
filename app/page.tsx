import type { Metadata } from "next";
import { StudyApp } from "./StudyApp";

export const metadata: Metadata = {
  title: "TangoDots | FSRS単語帳",
  description: "毎日の英単語を、ドットで続けるFSRS単語帳。",
};

export default function Home() {
  return <StudyApp />;
}

