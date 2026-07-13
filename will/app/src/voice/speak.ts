import type { SpeakOptions, VoiceKind } from "./types";

export type TtsConfig = SpeakOptions & {
  pitchByKind?: Partial<Record<VoiceKind, number>>;
};

/** speechSynthesis の薄いラッパ（失敗しても例外を外に出さない） */
export function speakText(
  text: string,
  kind: VoiceKind,
  config: TtsConfig = {},
): void {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = config.lang ?? "ja-JP";
    u.rate = config.rate ?? 1.15;
    const pitch =
      config.pitchByKind?.[kind] ??
      config.pitch ??
      (kind === "miss" || kind === "over" ? 0.85 : 1.2);
    u.pitch = pitch;
    u.volume = config.volume ?? 1;
    const voices = window.speechSynthesis.getVoices();
    const ja = voices.find((v) => v.lang.startsWith("ja"));
    if (ja) u.voice = ja;
    window.speechSynthesis.speak(u);
  } catch {
    /* TTS unavailable */
  }
}

/** 初回ジェスチャ後に voices を温める */
export function warmUpTts(): void {
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
  } catch {
    /* ignore */
  }
}
