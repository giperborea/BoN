import type { Metadata, Viewport } from "next";
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";
import "./globals.css";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "BoN Chess — шахматная школа",
  description: "Журнал школы, студии Lichess, игра «Тренируй гроссмейстера» и коллекция карточек",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#b5651d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
