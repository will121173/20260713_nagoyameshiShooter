import { DEFAULT_VOICE_LINES } from "./defaults";
import type { VoiceKind, VoiceLines } from "./types";

const KINDS: VoiceKind[] = ["start", "hit", "miss", "over"];

export function cloneLines(src: VoiceLines): VoiceLines {
  return {
    start: [...src.start],
    hit: [...src.hit],
    miss: [...src.miss],
    over: [...src.over],
  };
}

export function normalizeLines(
  partial: Partial<Record<string, unknown>>,
  fallback: VoiceLines,
): VoiceLines {
  const next = cloneLines(fallback);
  for (const kind of KINDS) {
    const value = partial[kind];
    if (!Array.isArray(value)) continue;
    const lines = value.filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );
    if (lines.length > 0) next[kind] = lines;
  }
  return next;
}

/** セリフ表の保持・差し替え・抽選 */
export class VoiceLineBank {
  private current: VoiceLines;
  private readonly fallback: VoiceLines;

  constructor(defaults: VoiceLines = DEFAULT_VOICE_LINES) {
    this.fallback = cloneLines(defaults);
    this.current = cloneLines(defaults);
  }

  getLines(): VoiceLines {
    return cloneLines(this.current);
  }

  setLines(partial: Partial<VoiceLines>): VoiceLines {
    this.current = normalizeLines(
      { ...this.current, ...partial },
      this.fallback,
    );
    return this.getLines();
  }

  async loadFromUrl(url: string): Promise<VoiceLines> {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return this.getLines();
      const data = (await res.json()) as Partial<Record<string, unknown>>;
      this.current = normalizeLines(data, this.fallback);
    } catch {
      /* keep current */
    }
    return this.getLines();
  }

  pick(kind: VoiceKind): string {
    const lines = this.current[kind];
    if (!lines.length) return this.fallback[kind][0];
    return lines[Math.floor(Math.random() * lines.length)];
  }
}
