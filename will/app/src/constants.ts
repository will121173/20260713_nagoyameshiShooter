export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 640;

export const GAME_DURATION_SEC = 60;
export const INITIAL_LIVES = 3;
export const HIT_SCORE = 100;

export const PLAYER_SPEED = 280;
export const PLAYER_WIDTH = 36;
export const PLAYER_HEIGHT = 28;
export const PLAYER_Y = CANVAS_HEIGHT - 56;

export const BULLET_SPEED = 420;
export const BULLET_COOLDOWN = 0.22;
export const BULLET_SIZE = 22;

export const ENEMY_SPAWN_INTERVAL = 1.1;
export const ENEMY_SPEED_MIN = 70;
export const ENEMY_SPEED_MAX = 140;
export const ENEMY_SIZE = 36;

export const COLORS = {
  bgTop: "#2a1510",
  bgBottom: "#c45c26",
  accent: "#e8b84a",
  hud: "#fff8f0",
  danger: "#d64545",
  player: "#e8b84a",
} as const;

export const UI = {
  title: "名古屋めしシューティング",
  subtitle: "味噌カツ弾でよそもんを撃ち落とせ",
  start: "START（Space）",
  hudScore: "SCORE",
  hudTime: "TIME",
  hudLife: "LIFE",
  gameover: "腹減った… GAME OVER",
  retry: "もう一杯（R）",
} as const;

export const FX_DURATION = 1.2;
export const FX_MAX_WIDTH = CANVAS_WIDTH - 48;
export const FX_LINE_HEIGHT = 32;
export const FX_FONT =
  'bold 24px "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';

export type SfxKind = "shot" | "hit" | "miss" | "over";

export const BULLETS = [
  { id: "misokatsu", emoji: "🍖", label: "味噌カツ", score: HIT_SCORE },
] as const;

export const ENEMIES = [
  { id: "sushi", emoji: "🍣", label: "寿司" },
  { id: "burger", emoji: "🍔", label: "ハンバーガー" },
  { id: "pizza", emoji: "🍕", label: "ピザ" },
] as const;

export type BulletDef = (typeof BULLETS)[number];
export type EnemyDef = (typeof ENEMIES)[number];
