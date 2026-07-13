import { DEFAULT_VOICE_LINES } from "./defaults";
import { VoiceLineBank } from "./lines";
import { speakText, warmUpTts } from "./speak";
import type {
  JokeVoiceOptions,
  VoiceKind,
  VoiceLines,
} from "./types";

export type {
  JokeVoiceOptions,
  SpeakOptions,
  VoiceKind,
  VoiceLines,
} from "./types";
export { DEFAULT_VOICE_LINES } from "./defaults";

/**
 * ネタボイス部品。
 * セリフ管理（JSON / setLines）と TTS 再生をまとめて呼び出す。
 */
export type JokeVoice = {
  /** public の JSON を読み込んで差し替え */
  load: (url?: string) => Promise<VoiceLines>;
  /** 一部 kind だけ差し替え */
  setLines: (partial: Partial<VoiceLines>) => VoiceLines;
  getLines: () => VoiceLines;
  /** 抽選して読み上げ。画面表示用に文言を返す */
  speak: (kind: VoiceKind) => string;
  /** 自動再生制限回避用に voices を温める */
  warmUp: () => void;
};

export function createJokeVoice(options: JokeVoiceOptions = {}): JokeVoice {
  const url = options.url ?? "/voice/lines.json";
  const bank = new VoiceLineBank(options.defaults ?? DEFAULT_VOICE_LINES);
  const tts = {
    lang: options.speak?.lang,
    rate: options.speak?.rate,
    pitch: options.speak?.pitch,
    volume: options.speak?.volume,
    pitchByKind: options.pitchByKind,
  };

  return {
    load: (overrideUrl) => bank.loadFromUrl(overrideUrl ?? url),
    setLines: (partial) => bank.setLines(partial),
    getLines: () => bank.getLines(),
    speak: (kind) => {
      const text = bank.pick(kind);
      speakText(text, kind, tts);
      return text;
    },
    warmUp: () => warmUpTts(),
  };
}
