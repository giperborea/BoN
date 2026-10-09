// Тестовые «игровые» портреты гроссмейстеров: стилизованный SVG, генерируемый из slug.
// Когда появятся арты (GPT), достаточно заполнить Grandmaster.imageUrl — будет показана картинка.

const PALETTES: Record<string, [string, string, string]> = {
  LEGENDARY: ["#5a3a07", "#f5a623", "#ffe3a3"],
  EPIC: ["#3b1a5c", "#a855f7", "#e9d5ff"],
  RARE: ["#102a54", "#3b82f6", "#cfe1ff"],
  COMMON: ["#2b3440", "#64748b", "#e2e8f0"],
};
const SKIN = ["#f2d3b1", "#e8be96", "#d9a47a", "#c48a5f", "#a86f48", "#f6dcc4"];
const HAIR = ["#2b211b", "#4a3426", "#6b4a2f", "#a0784f", "#d8c7a8", "#888", "#111", "#c9c9c9"];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export type GmLike = { slug: string; name: string; rarity: string; worldChampion?: boolean; imageUrl?: string | null };

export function GmAvatar({ gm, className }: { gm: GmLike; className?: string }) {
  if (gm.imageUrl) return <img src={gm.imageUrl} alt={gm.name} className={className} style={{ objectFit: "cover" }} />;
  const h = hash(gm.slug);
  const [dark, mid, light] = PALETTES[gm.rarity] ?? PALETTES.COMMON;
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >> 3) % HAIR.length];
  const hairStyle = (h >> 6) % 4;
  const glasses = ((h >> 9) % 4) === 0;
  const beard = ((h >> 11) % 5) === 0;
  const suit = ["#1f2937", "#3f2d20", "#1e3a5f", "#3b3b3b", "#4a1d1d"][(h >> 13) % 5];
  const piece = ["♔", "♕", "♖", "♗", "♘"][(h >> 16) % 5];
  const initials = gm.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  const id = `g${h.toString(36)}`;
  return (
    <svg viewBox="0 0 300 340" className={className} role="img" aria-label={gm.name}>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <radialGradient id={`${id}glow`} cx=".5" cy=".38" r=".55">
          <stop offset="0" stopColor={light} stopOpacity=".55" />
          <stop offset="1" stopColor={light} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="340" fill={`url(#${id}bg)`} />
      <rect width="300" height="340" fill={`url(#${id}glow)`} />
      {/* шахматная клетка на фоне */}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={(i % 3) * 100 + ((Math.floor(i / 3) % 2) ? 50 : 0)} y={Math.floor(i / 3) * 50} width="50" height="50" fill="#fff" opacity=".05" />
      ))}
      <text x="250" y="70" fontSize="64" fill={light} opacity=".35" textAnchor="middle">{piece}</text>
      {/* плечи */}
      <path d="M40 340 C 45 270, 95 245, 150 245 C 205 245, 255 270, 260 340 Z" fill={suit} />
      <path d="M128 245 L150 290 L172 245 Z" fill="#f5f5f5" />
      <path d="M146 258 L150 300 L154 258 Z" fill={dark} />
      {/* шея и голова */}
      <rect x="132" y="205" width="36" height="45" rx="12" fill={skin} />
      <ellipse cx="150" cy="160" rx="54" ry="64" fill={skin} />
      {/* волосы */}
      {hairStyle === 0 && <path d="M96 150 C 92 95, 125 88, 150 88 C 182 88, 210 98, 205 150 C 196 118, 170 108, 150 110 C 128 110, 104 118, 96 150 Z" fill={hair} />}
      {hairStyle === 1 && <path d="M98 140 C 100 100, 130 92, 155 94 C 185 96, 206 112, 202 140 C 185 125, 175 118, 150 120 C 130 121, 112 128, 98 140 Z" fill={hair} />}
      {hairStyle === 2 && <path d="M94 165 C 86 100, 122 84, 152 86 C 190 88, 214 108, 206 165 C 200 130, 196 116, 182 112 C 160 124, 120 118, 108 120 C 100 130, 98 145, 94 165 Z" fill={hair} />}
      {hairStyle === 3 && <path d="M104 128 C 110 108, 128 100, 150 100 C 172 100, 192 108, 197 128 C 182 122, 118 122, 104 128 Z" fill={hair} opacity=".85" />}
      {beard && <path d="M104 175 C 110 225, 135 232, 150 232 C 165 232, 190 225, 196 175 C 185 200, 170 208, 150 208 C 130 208, 115 200, 104 175 Z" fill={hair} />}
      {/* глаза, брови, рот */}
      <ellipse cx="129" cy="160" rx="5" ry="6" fill="#222" />
      <ellipse cx="171" cy="160" rx="5" ry="6" fill="#222" />
      <path d="M117 145 Q129 139 140 145" stroke={hair} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M160 145 Q171 139 183 145" stroke={hair} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M137 194 Q150 202 163 194" stroke="#8a4b3a" strokeWidth="4" fill="none" strokeLinecap="round" />
      {glasses && (
        <g stroke="#222" strokeWidth="3.5" fill="none">
          <circle cx="129" cy="160" r="15" /><circle cx="171" cy="160" r="15" /><path d="M144 160 L156 160" />
        </g>
      )}
      {gm.worldChampion && (
        <path d="M112 92 L122 62 L136 82 L150 54 L164 82 L178 62 L188 92 Z" fill="#ffd54a" stroke="#a87b00" strokeWidth="3" />
      )}
      <rect x="0" y="296" width="300" height="44" fill="#000" opacity=".35" />
      <text x="150" y="327" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif" letterSpacing="3">{initials}</text>
    </svg>
  );
}
