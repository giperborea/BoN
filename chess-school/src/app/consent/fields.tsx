"use client";
import { useState } from "react";

export function ConsentTypeFields() {
  const [type, setType] = useState("SELF");
  return (
    <div className="stack">
      <label className="row"><input type="radio" name="type" value="SELF" checked={type === "SELF"} onChange={() => setType("SELF")} /> Мне исполнилось 14 лет — даю согласие сам(а)</label>
      <label className="row"><input type="radio" name="type" value="PARENT" checked={type === "PARENT"} onChange={() => setType("PARENT")} /> Мне меньше 14 лет — согласие даёт родитель</label>
      {type === "PARENT" && (
        <label className="field">ФИО родителя / законного представителя<input name="parentName" placeholder="Иванова Мария Петровна" /></label>
      )}
    </div>
  );
}
