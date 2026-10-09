"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import type { Config } from "chessground/config";
import type { Key } from "chessground/types";
import { Board } from "./Board";
import { nextPuzzleAction, submitMoveAction, giveUpAction } from "@/app/actions/game";

type Puzzle = {
  attemptId: string; fen: string; orientation: "white" | "black"; title: string; hint: string | null;
  rating: number; theme: string; code: string; resumed: boolean; lastMove: string[] | null;
};
type LevelInfo = { level: number; title: string; icon: string; xpInto: number; xpNeed: number; progress: number };
type Finish = {
  rating: number; delta: number; xp: number; level: LevelInfo; levelUp: boolean;
  achievements: { title: string; icon: string; packs: number }[];
};
type Status = "loading" | "playing" | "wait" | "solved" | "failed" | "error";

const THEME_LABEL: Record<string, string> = {
  mateIn1: "Мат в 1 ход", mateIn2: "Мат в 2 хода", mateIn3: "Мат в 3 хода", fork: "Вилка", pin: "Связка",
  skewer: "Линейный удар", discoveredAttack: "Вскрытое нападение", deflection: "Отвлечение", decoy: "Завлечение",
  backRank: "Последняя горизонталь", promotion: "Превращение", hangingPiece: "Незащищённая фигура",
  sacrifice: "Жертва", removeDefender: "Уничтожение защиты",
};

function destsOf(chess: Chess) {
  const dests = new Map<Key, Key[]>();
  for (const m of chess.moves({ verbose: true })) {
    dests.set(m.from as Key, [...(dests.get(m.from as Key) ?? []), m.to as Key]);
  }
  return dests;
}
const uciOf = (from: string, to: string, promo?: string) => from + to + (promo ?? "");

export function PuzzleGame({ initialRating, initialLevel, characterName }: {
  initialRating: number; initialLevel: LevelInfo; characterName: string;
}) {
  const chess = useRef(new Chess());
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [fen, setFen] = useState(chess.current.fen());
  const [lastMove, setLastMove] = useState<Key[] | undefined>();
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(initialRating);
  const [level, setLevel] = useState<LevelInfo>(initialLevel);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [solution, setSolution] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [session, setSession] = useState({ solved: 0, failed: 0 });

  const toast = (text: string) => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  };

  const sync = useCallback((lm?: Key[]) => {
    setFen(chess.current.fen());
    setLastMove(lm);
  }, []);

  const load = useCallback(async () => {
    setStatus("loading"); setPuzzle(null); setFinish(null); setSolution([]); setShowHint(false); setMessage("");
    const r = await nextPuzzleAction();
    if (!("ok" in r) || !r.ok) { setStatus("error"); setMessage(("error" in r && r.error) || "Ошибка"); return; }
    const p = r.puzzle;
    chess.current = new Chess(p.fen);
    setPuzzle(p);
    setRating(p.character.rating);
    sync((p.lastMove as Key[] | null) ?? undefined);
    setStatus("playing");
    setMessage(p.orientation === "white" ? "Ход белых — найдите лучший ход" : "Ход чёрных — найдите лучший ход");
    if (p.resumed) toast("Продолжаем незавершённую задачу");
  }, [sync]);

  const started = useRef(false);
  useEffect(() => { if (started.current) return; started.current = true; load(); }, [load]);

  const applyFinish = (res: Finish) => {
    setFinish(res);
    setRating(res.rating);
    setLevel(res.level);
    if (res.levelUp) toast(`${res.level.icon} Новый уровень: ${res.level.level} — ${res.level.title}!`);
    for (const a of res.achievements) toast(`${a.icon} Достижение «${a.title}»${a.packs ? ` +${a.packs} пак.` : ""}`);
  };

  const playSolution = async (moves: string[]) => {
    for (const m of moves) {
      await new Promise((r) => setTimeout(r, 650));
      try {
        chess.current.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
        sync([m.slice(0, 2) as Key, m.slice(2, 4) as Key]);
      } catch { break; }
    }
  };

  const send = async (from: string, to: string, promotion?: string) => {
    if (!puzzle) return;
    let played;
    try { played = chess.current.move({ from, to, promotion }); } catch { sync(); return; }
    sync([from as Key, to as Key]);
    setStatus("wait");
    const r = await submitMoveAction(puzzle.attemptId, uciOf(from, to, promotion));
    if (!("ok" in r) || !r.ok) { setStatus("error"); setMessage(("error" in r && r.error) || "Ошибка"); return; }
    const res = r.res;
    if (res.result === "correct") {
      setMessage("Верно! Соперник отвечает…");
      await new Promise((x) => setTimeout(x, 450));
      const m = res.reply;
      chess.current.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
      sync([m.slice(0, 2) as Key, m.slice(2, 4) as Key]);
      setMessage("Верно! Продолжайте");
      setStatus("playing");
    } else if (res.result === "solved") {
      setStatus("solved");
      setMessage("Задача решена! 🎉");
      setSession((s) => ({ ...s, solved: s.solved + 1 }));
      applyFinish(res);
    } else {
      setStatus("failed");
      setMessage(`Ход ${played.san} — ошибка. Смотрите решение`);
      setSession((s) => ({ ...s, failed: s.failed + 1 }));
      applyFinish(res);
      const sanLine: string[] = [];
      chess.current.undo();
      const tmp = new Chess(chess.current.fen());
      for (const m of res.solution) {
        try { sanLine.push(tmp.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }).san); } catch { break; }
      }
      setSolution(sanLine);
      sync();
      playSolution(res.solution);
    }
  };

  const giveUp = async () => {
    if (!puzzle || status !== "playing") return;
    setStatus("wait");
    const r = await giveUpAction(puzzle.attemptId);
    if (!("ok" in r) || !r.ok) { setStatus("error"); return; }
    setStatus("failed");
    setMessage("Решение задачи");
    setSession((s) => ({ ...s, failed: s.failed + 1 }));
    applyFinish(r.res);
    const tmp = new Chess(chess.current.fen());
    setSolution(r.res.solution.map((m) => { try { return tmp.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }).san; } catch { return m; } }));
    playSolution(r.res.solution);
  };

  const onMove = (orig: Key, dest: Key) => {
    const piece = chess.current.get(orig as Square);
    if (piece?.type === "p" && (dest[1] === "8" || dest[1] === "1")) { setPromo({ from: orig, to: dest }); return; }
    send(orig, dest);
  };

  const turn = chess.current.turn() === "w" ? "white" : "black";
  const config: Config = useMemo(() => ({
    fen,
    orientation: puzzle?.orientation ?? "white",
    turnColor: turn,
    lastMove,
    check: chess.current.inCheck(),
    coordinates: true,
    movable: {
      free: false,
      color: status === "playing" ? puzzle?.orientation : undefined,
      dests: status === "playing" ? destsOf(chess.current) : new Map(),
      showDests: true,
      events: { after: onMove },
    },
    premovable: { enabled: false },
    draggable: { showGhost: true },
    animation: { enabled: true, duration: 220 },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [fen, lastMove, status, puzzle]);

  return (
    <div className="game-layout">
      <div>
        <div className="board-wrap">
          <Board config={config} />
          {promo && (
            <div className="promo">
              <div className="box">
                {(["q", "r", "b", "n"] as const).map((p) => (
                  <button key={p} onClick={() => { const pr = promo; setPromo(null); send(pr.from, pr.to, p); }}>
                    {{ q: "♛", r: "♜", b: "♝", n: "♞" }[p]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="stack">
        <div className={`status-line ${status === "solved" ? "good" : status === "failed" ? "bad" : "turn"}`}>
          {status === "loading" ? "Загружаем задачу…" : message}
        </div>
        {puzzle && (
          <div className="card">
            <div className="row between">
              <h3 style={{ margin: 0 }}>{puzzle.title}</h3>
              <span className="badge">{puzzle.code}</span>
            </div>
            <div className="row small muted" style={{ marginTop: 6 }}>
              <span>Сложность: <b>{puzzle.rating}</b></span>
              {(status === "solved" || status === "failed") && <span>· Тема: {THEME_LABEL[puzzle.theme] ?? puzzle.theme}</span>}
            </div>
            {showHint && puzzle.hint && <div className="alert info" style={{ marginTop: 10, marginBottom: 0 }}>💡 {puzzle.hint}</div>}
            {solution.length > 0 && <div className="small" style={{ marginTop: 10 }}>Решение: <b>{solution.join("  ")}</b></div>}
            <div className="row" style={{ marginTop: 12 }}>
              {status === "playing" && puzzle.hint && !showHint && <button className="btn secondary sm" onClick={() => setShowHint(true)}>Подсказка</button>}
              {status === "playing" && <button className="btn ghost sm" onClick={giveUp}>Сдаться</button>}
              {(status === "solved" || status === "failed" || status === "error") && (
                <button className="btn lg" onClick={load}>Следующая задача →</button>
              )}
            </div>
          </div>
        )}
        <div className="card">
          <div className="small muted">Персонаж</div>
          <div className="row between">
            <b>{characterName}</b>
            <span className="badge accent">{level.icon} Ур. {level.level} · {level.title}</span>
          </div>
          <div className="row" style={{ alignItems: "baseline", marginTop: 6 }}>
            <span className="rating-big">{rating}</span>
            {finish && <span className={finish.delta >= 0 ? "delta-up" : "delta-down"}>{finish.delta >= 0 ? "+" : ""}{finish.delta}</span>}
            {finish && <span className="small muted">+{finish.xp} XP</span>}
          </div>
          <div className="progress" style={{ marginTop: 8 }}><div style={{ width: `${Math.round(level.progress * 100)}%` }} /></div>
          <div className="tiny muted" style={{ marginTop: 4 }}>Опыт до следующего уровня: {level.xpInto}/{level.xpNeed}</div>
          <div className="small muted" style={{ marginTop: 8 }}>За сессию: ✅ {session.solved} · ❌ {session.failed}</div>
        </div>
        <p className="tiny muted">Правила: один шанс на задачу — ошибка сразу засчитывается. Решённые и нерешённые задачи могут выпасть снова.</p>
      </div>
      <div className="toast-stack">{toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div>
    </div>
  );
}
