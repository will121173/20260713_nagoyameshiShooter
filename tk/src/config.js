/*
 * config.js — ゲーム全体の設定データ
 * ------------------------------------------------------------------
 * 敵・武器・ボイス・基本パラメータをすべてここに集約しています。
 * 「敵を増やす」「武器を調整する」「セリフを変える」といった修正は
 * 基本的にこのファイルだけをいじれば済むように設計しています。
 * （挙動のロジックは engine.js / game.js 側に置いています）
 */

const CONFIG = {
  // 画面・基本設定
  width: 480,
  height: 720,
  startLives: 3,

  // 背景スクロール速度（星背景）
  starSpeed: 2,
  starCount: 80,
};

/*
 * 武器定義
 * ------------------------------------------------------------------
 * key            : 武器を識別するID（敵のdropWeaponやアイテムと対応）
 * name           : UI表示・発射ボイス用の名前
 * icon           : UIや弾に使う絵文字
 * color          : 弾の色
 * cooldown       : 連射間隔(ms)。小さいほど速い
 * voice          : 発射時に読み上げるセリフ（空なら発射ボイスなし）
 * fire(player)   : 発射する弾(Bullet相当の設定)の配列を返す関数
 *
 * fireが返すオブジェクト:
 *   { dx, dy, speed, damage, radius, color, icon, pierce?, boomerang?, explode? }
 *   dx,dy は進行方向の単位ベクトル（上方向が dy:-1）
 */
const WEAPONS = {
  // 初期武器：豆腐弾（白い普通の直線弾）
  tofu: {
    key: 'tofu',
    name: '豆腐弾',
    icon: '⬜',
    color: '#ffffff',
    cooldown: 220,
    voice: '',
    fire() {
      return [{ dx: 0, dy: -1, speed: 9, damage: 1, radius: 5, color: '#ffffff' }];
    },
  },

  // 味噌カツ → 味噌弾：太い扇状3WAY
  miso: {
    key: 'miso',
    name: '味噌弾',
    icon: '🟫',
    color: '#8a5a2b',
    cooldown: 300,
    voice: 'みそかつー！',
    fire() {
      const spread = [-0.28, 0, 0.28]; // ラジアンっぽい角度オフセット
      return spread.map((a) => ({
        dx: Math.sin(a),
        dy: -Math.cos(a),
        speed: 8,
        damage: 1,
        radius: 8,
        color: '#8a5a2b',
      }));
    },
  },

  // きしめん → 麺ワイドショット：横に広い薄い射線
  kishimen: {
    key: 'kishimen',
    name: '麺ワイド',
    icon: '🍜',
    color: '#f5e9c8',
    cooldown: 260,
    voice: 'きしめーん！',
    fire() {
      // 横に5本並べて発射（見た目が横に広い）
      const offsets = [-40, -20, 0, 20, 40];
      return offsets.map((ox) => ({
        dx: 0,
        dy: -1,
        speed: 10,
        damage: 1,
        radius: 3,
        color: '#f5e9c8',
        offsetX: ox,
      }));
    },
  },

  // 手羽先 → ブーメラン手羽：発射後戻ってくる貫通弾
  tebasaki: {
    key: 'tebasaki',
    name: 'ブーメラン手羽',
    icon: '🍗',
    color: '#c9772f',
    cooldown: 420,
    voice: 'てばさきー！',
    fire() {
      return [{
        dx: 0, dy: -1, speed: 11, damage: 1, radius: 9,
        color: '#c9772f', icon: '🍗', pierce: true, boomerang: true,
      }];
    },
  },

  // 天むす → 天ぷら爆弾：着弾で範囲爆発
  tenmusu: {
    key: 'tenmusu',
    name: '天ぷら爆弾',
    icon: '🍙',
    color: '#e8c07a',
    cooldown: 500,
    voice: 'てんむすー！',
    fire() {
      return [{
        dx: 0, dy: -1, speed: 7, damage: 1, radius: 10,
        color: '#e8c07a', icon: '🍙', explode: 60, // explode: 爆発半径
      }];
    },
  },
};

const INITIAL_WEAPON = 'tofu';

/*
 * 敵定義
 * ------------------------------------------------------------------
 * key         : 敵ID
 * name        : 名前（ボイス等に利用可）
 * icon        : 見た目の絵文字
 * size        : 当たり判定の一辺(px)
 * hp          : 耐久
 * score       : 撃破時スコア
 * speed       : 基本移動速度
 * dropWeapon  : 撃破時にドロップする武器key
 * dropRate    : ドロップ確率(0〜1)
 * move        : 'straight'|'zigzag'|'dash'|'hover'|'boss' 動きパターン(engine.jsで解釈)
 * canShoot    : 自機方向に弾を撃つか
 * boss        : ボスフラグ（任意）
 */
const ENEMIES = {
  misokatsu: {
    key: 'misokatsu', name: '味噌カツくん', icon: '🍖',
    size: 34, hp: 2, score: 100, speed: 2,
    dropWeapon: 'miso', dropRate: 0.5, move: 'straight', canShoot: false,
  },
  kishimen: {
    key: 'kishimen', name: 'きしめん忍者', icon: '🍥',
    size: 30, hp: 2, score: 120, speed: 2.2,
    dropWeapon: 'kishimen', dropRate: 0.5, move: 'zigzag', canShoot: false,
  },
  tebasaki: {
    key: 'tebasaki', name: '手羽先ライダー', icon: '🍗',
    size: 32, hp: 2, score: 150, speed: 3.2,
    dropWeapon: 'tebasaki', dropRate: 0.5, move: 'dash', canShoot: false,
  },
  tenmusu: {
    key: 'tenmusu', name: '天むすボンバー', icon: '🍙',
    size: 34, hp: 3, score: 180, speed: 1.8,
    dropWeapon: 'tenmusu', dropRate: 0.6, move: 'hover', canShoot: true,
  },
  // ボス：名古屋コーチンキング
  cochin: {
    key: 'cochin', name: '名古屋コーチンキング', icon: '🐔',
    size: 96, hp: 40, score: 2000, speed: 1.2,
    dropWeapon: null, dropRate: 0, move: 'boss', canShoot: true, boss: true,
  },
};

// 通常spawnに使う敵（ボスは別枠で出す）
const NORMAL_ENEMY_KEYS = ['misokatsu', 'kishimen', 'tebasaki', 'tenmusu'];

/*
 * ボイス定義（Web Speech APIで読み上げるセリフ）
 * fire   : 発射時（武器側のvoiceを優先し、無ければここは使わない）
 * defeat : 敵撃破時にランダム再生
 * damage : 自機被弾時
 */
const VOICES = {
  defeat: ['やられたー！', 'ごちそうさまでした！', 'うますぎ！', 'あーもったいない！'],
  damage: ['いたっ！', 'あちゃー！'],
  bossDown: ['名古屋うますぎ！', 'コーチン、ぐぬぬ…'],
};

// 自機（プレイヤー）設定
const PLAYERS = [
  {
    id: 'P1', color: '#4fc3f7', icon: '🔵',
    keys: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', fire: ' ' },
    start: { x: CONFIG.width * 0.35, y: CONFIG.height - 80 },
  },
  {
    id: 'P2', color: '#ff8a65', icon: '🔴',
    keys: { up: 'w', down: 's', left: 'a', right: 'd', fire: 'Shift' },
    start: { x: CONFIG.width * 0.65, y: CONFIG.height - 80 },
  },
];

const PLAYER_SPEED = 4.5;
const PLAYER_SIZE = 28;
