/** Stable, school-style course code from a title and id, e.g. "Linear Algebra" → "LIN 214". */
export function courseCode(title: string, id: string): string {
  const STOP = new Set(["a", "an", "the", "to", "of", "and", "for", "in", "on", "intro", "introduction"]);
  const words = title.toLowerCase().match(/[a-z]+/g) ?? [];
  const word = words.find((w) => !STOP.has(w) && w.length >= 3) ?? words[0] ?? "crs";
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `${word.slice(0, 3).toUpperCase()} ${100 + (h % 400)}`;
}

/** Black or white text, whichever reads better on the given hex colour (WCAG relative luminance). */
export function readableOn(hex: string): "#ffffff" | "#14161b" {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  // Contrast vs white = 1.05/(L+.05); vs near-black ≈ (L+.05)/.06
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.06 ? "#ffffff" : "#14161b";
}

export function initials(nameOrEmail: string): string {
  const base = nameOrEmail.split("@")[0];
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}
