import type { SfxKind } from "./constants";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Web Audio の自動再生制限を解除（ユーザー操作内で呼ぶ） */
export async function unlockAudio(): Promise<void> {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === "suspended") {
    try {
      await audio.resume();
    } catch {
      /* ignore autoplay failures */
    }
  }
}

function beep(
  freqStart: number,
  freqEnd: number,
  duration: number,
  type: OscillatorType = "square",
  gain = 0.08,
): void {
  const audio = getCtx();
  if (!audio || audio.state !== "running") return;

  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, now);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(freqEnd, 1),
    now + duration,
  );
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function chord(
  freqs: number[],
  duration: number,
  type: OscillatorType = "triangle",
  gain = 0.05,
): void {
  for (const f of freqs) {
    beep(f, f * 0.92, duration, type, gain);
  }
}

export function playSfx(kind: SfxKind): void {
  switch (kind) {
    case "shot":
      beep(520, 880, 0.07, "square", 0.06);
      break;
    case "hit":
      chord([523, 659, 784], 0.14, "triangle", 0.055);
      break;
    case "miss":
      beep(280, 90, 0.22, "sawtooth", 0.07);
      break;
    case "over":
      chord([392, 311, 247], 0.45, "triangle", 0.06);
      break;
  }
}
