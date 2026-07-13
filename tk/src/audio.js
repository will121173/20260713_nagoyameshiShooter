/*
 * audio.js — サウンド（Web Speech API 読み上げ）
 * ------------------------------------------------------------------
 * 音声ファイルを使わず speechSynthesis で日本語ボイスを鳴らします。
 * 連発で詰まらないよう、直前の発話をキャンセルしてから喋らせています。
 */

const Audio = {
  enabled: true,
  jaVoice: null,
  lastSpeakAt: 0,
  minInterval: 90, // ms。これ未満の連続発話は間引く

  init() {
    if (!('speechSynthesis' in window)) {
      this.enabled = false;
      return;
    }
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      this.jaVoice = voices.find((v) => v.lang && v.lang.startsWith('ja')) || null;
    };
    pickVoice();
    // 一部ブラウザは非同期でvoiceが読み込まれる
    window.speechSynthesis.onvoiceschanged = pickVoice;
  },

  /**
   * セリフを読み上げる
   * @param {string} text
   * @param {object} opts { rate, pitch, force } force=trueで間引き無視
   */
  speak(text, opts = {}) {
    if (!this.enabled || !text) return;
    const now = performance.now();
    if (!opts.force && now - this.lastSpeakAt < this.minInterval) return;
    this.lastSpeakAt = now;

    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      if (this.jaVoice) u.voice = this.jaVoice;
      u.rate = opts.rate ?? 1.4;   // 少し早口の方がテンポが良い
      u.pitch = opts.pitch ?? 1.1;
      // 直前の発話を止めて重ならないようにする
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {
      // 読み上げ失敗はゲーム進行に影響させない
    }
  },

  /** 配列からランダムに1つ選んで読み上げる */
  speakRandom(list, opts) {
    if (!list || !list.length) return;
    this.speak(list[Math.floor(Math.random() * list.length)], opts);
  },
};
