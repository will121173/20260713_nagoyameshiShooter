export type VoiceKind = "start" | "hit" | "miss" | "over";

export type VoiceLines = Record<VoiceKind, string[]>;

export type SpeakOptions = {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
};

export type JokeVoiceOptions = {
  /** JSON の URL。デフォルト `/voice/lines.json` */
  url?: string;
  /** JSON 未読込時の初期セリフ */
  defaults?: VoiceLines;
  /** TTS 共通設定 */
  speak?: SpeakOptions;
  /** kind ごとの pitch 上書き */
  pitchByKind?: Partial<Record<VoiceKind, number>>;
};
