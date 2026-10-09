"use client";
import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Board } from "./Board";
import { ActionForm } from "./ActionForm";
import { addPuzzleAction } from "@/app/actions/journal";

const THEMES = ["mateIn1", "mateIn2", "mateIn3", "fork", "pin", "skewer", "discoveredAttack", "deflection", "decoy", "backRank", "promotion", "hangingPiece", "sacrifice", "removeDefender"];

export function PuzzleEditor() {
  const [fen, setFen] = useState("6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1");
  const [moves, setMoves] = useState("a1a8");
  const check = useMemo(() => {
    let c: Chess;
    try { c = new Chess(fen.trim()); } catch (e) { return { error: "FEN: " + (e as Error).message, san: [] as string[], fen: "8/8/8/8/8/8/8/8 w - - 0 1", turn: "white" as const }; }
    const turn = c.turn() === "w" ? "white" as const : "black" as const;
    const start = c.fen();
    const san: string[] = [];
    const list = moves.trim().split(/[\s,]+/).filter(Boolean);
    for (const m of list) {
      try { san.push(c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }).san); }
      catch { return { error: `Ход «${m}» нелегален`, san, fen: start, turn }; }
    }
    if (list.length % 2 === 0) return { error: "Число ходов должно быть нечётным (последний — ход ученика)", san, fen: start, turn };
    return { error: "", san, fen: start, turn, mate: c.isCheckmate() };
  }, [fen, moves]);
  const config = useMemo(() => ({ fen: check.fen, orientation: check.turn, viewOnly: true, coordinates: true }), [check.fen, check.turn]);

  return (
    <div className="grid grid-2">
      <div>
        <div className="board-wrap" style={{ maxWidth: 380 }}><Board config={config} /></div>
        <div className="small mt">
          {check.error ? <span className="neg">{check.error}</span> : <>Решение: <b>{check.san.join(" ")}</b>{check.mate && " — мат ✓"}</>}
        </div>
      </div>
      <ActionForm action={addPuzzleAction} className="stack" submit="Добавить задачу" resetOnOk>
        <label className="field">FEN (ходит ученик)<input name="fen" value={fen} onChange={(e) => setFen(e.target.value)} required /></label>
        <label className="field">Ходы в UCI через пробел: ученик, соперник, ученик…<input name="moves" value={moves} onChange={(e) => setMoves(e.target.value)} required /></label>
        <div className="form-grid">
          <label className="field">Рейтинг задачи<input name="rating" type="number" defaultValue={1200} min={400} max={3000} /></label>
          <label className="field">Тема<select name="theme">{THEMES.map((t) => <option key={t}>{t}</option>)}</select></label>
        </div>
        <label className="field">Название<input name="title" required placeholder="Мат по последней горизонтали" /></label>
        <label className="field">Подсказка<input name="hint" placeholder="Необязательно" /></label>
        <p className="tiny muted">Принимается только заданная цепочка (на последнем ходу засчитывается любой мат). Соперник отвечает ходами из цепочки.</p>
      </ActionForm>
    </div>
  );
}
