/*
 * bgm.js — BGM（Web Audio APIでその場生成する和風ループ）
 * ------------------------------------------------------------------
 * 音源ファイルは使いません。オシレーターで「ヨナ抜き長音階(C D E G A)」の
 * 明るいお囃子風ループを鳴らします（名古屋の祭りっぽさ狙い）。
 *
 * 曲を変えたいときは melody / bass 配列と tempo を編集すればOK。
 * ・melody : 8分音符グリッド。音名(例 'E5') か null(休符)
 * ・bass   : 4分音符グリッド（melodyの半分の長さ）
 *
 * ブラウザ仕様上、AudioContext はユーザー操作後(Enter)に開始します。
 */

const BGM = {
  ctx: null,
  master: null,
  playing: false,
  muted: false,

  tempo: 138,          // BPM（大きいほど速い）
  lookahead: 0.1,      // 先読み秒数
  scheduleMs: 25,      // スケジューラ実行間隔(ms)
  step: 0,
  nextNoteTime: 0,
  timer: null,

  // --- 音量バランス（0〜1） ---
  vol: { master: 0.22, melody: 0.18, bass: 0.22, kick: 0.45, hat: 0.06 },

  // --- メロディ（8分音符×32 = 4小節ループ / ヨナ抜き長音階） ---
  melody: [
    'E5', null, 'G5', null, 'A5', null, 'G5', null,
    'E5', null, 'D5', null, 'C5', null, 'D5', null,
    'E5', null, 'E5', null, 'G5', null, 'A5', null,
    'G5', 'E5', 'D5', null, 'C5', null, null, null,
  ],

  // --- ベース（4分音符×16） ---
  bass: [
    'C3', 'C3', 'C3', 'C3',
    'A2', 'A2', 'A2', 'A2',
    'D3', 'D3', 'D3', 'D3',
    'G2', 'G2', 'G2', 'G2',
  ],

  // 音名→周波数（A4=440基準の平均律）
  _freq(name) {
    const semi = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
    const m = /^([A-G]#?)(\d)$/.exec(name);
    if (!m) return 0;
    const midi = (parseInt(m[2], 10) + 1) * 12 + semi[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  _stepDur() { return 60 / this.tempo / 2; }, // 8分音符の長さ(秒)

  /** ゲーム開始時などに呼ぶ。無ければAudioContextを生成して再生開始 */
  start() {
    if (!('AudioContext' in window || 'webkitAudioContext' in window)) return;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.vol.master;
      this.master.connect(this.ctx.destination);
      this._noiseBuf = this._makeNoise();
    }
    this.ctx.resume();
    if (this.playing) return; // 二重起動防止
    this.playing = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this._scheduler(), this.scheduleMs);
  },

  stop() {
    this.playing = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  },

  /** BGMのON/OFF切り替え（Mキー用） */
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol.master, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  },

  // --- スケジューラ（先読みして正確なタイミングで音を並べる） ---
  _scheduler() {
    if (!this.playing) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.lookahead) {
      this._playStep(this.step, this.nextNoteTime);
      this.nextNoteTime += this._stepDur();
      this.step = (this.step + 1) % this.melody.length;
    }
  },

  _playStep(step, time) {
    const stepDur = this._stepDur();

    // メロディ（矩形波でチップチューン感）
    const mel = this.melody[step];
    if (mel) this._tone(this._freq(mel), time, stepDur * 1.6, 'square', this.vol.melody);

    // ベース（4分ごと＝2ステップに1回）
    if (step % 2 === 0) {
      const b = this.bass[(step / 2) % this.bass.length];
      if (b) this._tone(this._freq(b), time, stepDur * 1.8, 'triangle', this.vol.bass);
    }

    // パーカッション：4分でキック、裏拍でハイハット
    if (step % 4 === 0) this._kick(time);
    if (step % 2 === 1) this._hat(time);
  },

  /** 音程のある音（エンベロープ付き） */
  _tone(freq, time, dur, type, gain) {
    if (!freq) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.01);      // アタック
    g.gain.exponentialRampToValueAtTime(0.001, time + dur); // ディケイ
    o.connect(g).connect(this.master);
    o.start(time);
    o.stop(time + dur + 0.02);
  },

  /** キックドラム（周波数を下げるスイープ） */
  _kick(time) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(50, time + 0.12);
    g.gain.setValueAtTime(this.vol.kick, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    o.connect(g).connect(this.master);
    o.start(time);
    o.stop(time + 0.18);
  },

  /** ハイハット（ホワイトノイズを短く） */
  _hat(time) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(this.vol.hat, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    src.connect(hp).connect(g).connect(this.master);
    src.start(time);
    src.stop(time + 0.06);
  },

  /** ノイズ用バッファ（ハイハット用に1回だけ生成） */
  _makeNoise() {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  },
};
