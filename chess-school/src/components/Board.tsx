"use client";
import { useEffect, useRef } from "react";
import { Chessground } from "chessground";
import type { Api } from "chessground/api";
import type { Config } from "chessground/config";

/** Тонкая обёртка над chessground (та же доска, что на lichess.org). */
export function Board({ config, onReady }: { config: Config; onReady?: (api: Api) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  useEffect(() => {
    if (!el.current) return;
    api.current = Chessground(el.current, config);
    onReady?.(api.current);
    return () => api.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { api.current?.set(config); }, [config]);
  return <div ref={el} style={{ width: "100%", height: "100%" }} />;
}
