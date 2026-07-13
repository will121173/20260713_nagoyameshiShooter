export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 720;

/** 自機の絵文字(名古屋コーチン) */
export const PLAYER_EMOJI = '🐓';
export const PLAYER_TEXTURE_SIZE = 30;
/** 仕様: 当たり判定は自機グラフィックの約35%の円 */
export const PLAYER_HITBOX_RADIUS = 5;
export const HITBOX_COLOR = 0xffffff;
export const PLAYER_SPEED = 320;
export const PLAYER_SLOW_FACTOR = 0.4;
/** 低速中に本体を薄くして白い判定円を見やすくする */
export const PLAYER_SLOW_BODY_ALPHA = 0.4;
export const PLAYER_START_X = GAME_WIDTH / 2;
export const PLAYER_START_Y = GAME_HEIGHT - 100;
export const PLAYER_BLINK_INTERVAL_MS = 100;
export const PLAYER_BLINK_ALPHA = 0.25;

/** ボスの絵文字(名古屋城) */
export const BOSS_EMOJI = '🏯';
export const BOSS_TEXTURE_SIZE = 120;
export const BOSS_X = GAME_WIDTH / 2;
export const BOSS_Y = 100;

export const BULLET_RADIUS = 6;
/** 弾の見た目サイズ(px)。食べ物として読めるよう判定円(半径6px)より大きめにする */
export const BULLET_TEXTURE_SIZE = 26;
export const BULLET_POOL_SIZE = 1000;
/** 画面端からこの距離まで離れた弾をプールへ返却する */
export const BULLET_KILL_MARGIN = 32;
/** パターンJSONで bulletEmoji 未指定のときの弾の絵文字 */
export const DEFAULT_BULLET_EMOJI = '🍗';
/** 弾の最大角速度(度/秒)。食べ物が宙を舞う感じを出す */
export const BULLET_MAX_SPIN_DEG = 240;

/** 絵文字テクスチャ描画時のフォントサイズ比(グリフの見切れ防止の余白ぶん) */
export const EMOJI_FONT_RATIO = 0.85;

export const PATTERN_ROTATE_MS = 8000;
export const INVINCIBLE_MS = 1000;
export const HIT_FLASH_MS = 150;
export const HIT_FLASH_COLOR = [255, 0, 0] as const;

export const DEPTH_BOSS = 1;
export const DEPTH_BULLET = 2;
export const DEPTH_PLAYER = 3;
export const DEPTH_HITBOX = 4;
export const DEPTH_HUD = 10;

export const HUD_MARGIN = 8;
export const FPS_UPDATE_INTERVAL_MS = 250;
