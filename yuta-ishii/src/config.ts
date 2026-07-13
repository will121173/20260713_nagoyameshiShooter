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

/** 自機ショットの絵文字(名古屋コーチンの卵) */
export const PLAYER_SHOT_EMOJI = '🥚';
export const PLAYER_SHOT_TEXTURE_SIZE = 16;
export const PLAYER_SHOT_RADIUS = 5;
export const PLAYER_SHOT_POOL_SIZE = 100;
export const PLAYER_SHOT_INTERVAL_MS = 120;
export const PLAYER_SHOT_SPEED = 600;
/** 2連ショットの左右間隔(px) */
export const PLAYER_SHOT_OFFSET_X = 8;
/** ショットの発射方向(真上) */
export const PLAYER_SHOT_ANGLE_RAD = -Math.PI / 2;
export const PLAYER_SHOT_DAMAGE = 1;

/** ボスの絵文字(名古屋城) */
export const BOSS_EMOJI = '🏯';
export const BOSS_TEXTURE_SIZE = 120;
export const BOSS_X = GAME_WIDTH / 2;
export const BOSS_Y = 100;
export const BOSS_MAX_HP = 300;
/** ボスの当たり判定半径(px)。見た目より少し小さめにする */
export const BOSS_BODY_RADIUS = 45;
/** ボスの左右往復の振れ幅(px) */
export const BOSS_MOVE_AMPLITUDE = 140;
/** ボスの左右往復1周期の長さ(ms) */
export const BOSS_MOVE_PERIOD_MS = 6000;
export const BOSS_HIT_FLASH_MS = 50;
export const BOSS_HIT_FLASH_COLOR = 0xffffff;

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

export const LIVES_START = 3;
export const SCORE_PER_HIT = 10;
export const SCORE_CLEAR_BONUS = 10000;

export const PATTERN_ROTATE_MS = 8000;
export const INVINCIBLE_MS = 1000;
export const HIT_FLASH_MS = 150;
export const HIT_FLASH_COLOR = [255, 0, 0] as const;
export const SHAKE_MS = 150;
/** カメラシェイクの強さ(画面サイズ比) */
export const SHAKE_INTENSITY = 0.008;

export const SPARK_RADIUS = 3;
export const SPARK_COLOR = 0xffffff;
export const PARTICLE_LIFESPAN_MS = 450;
export const PARTICLE_SPEED_MIN = 80;
export const PARTICLE_SPEED_MAX = 280;
export const PARTICLE_SCALE_START = 1;
export const PARTICLE_PLAYER_HIT_COUNT = 24;
export const PARTICLE_BOSS_HIT_COUNT = 4;
export const PARTICLE_BOSS_HIT_SCALE_START = 0.8;
/** ボス被弾スパークの色(卵の黄身) */
export const PARTICLE_BOSS_HIT_TINT = 0xffdd55;
export const PARTICLE_CLEAR_COUNT = 80;
export const PARTICLE_CLEAR_TINTS = [0xffffff, 0xffcc44, 0xff8844] as const;
export const PARTICLE_CLEAR_LIFESPAN_MS = 1200;
export const PARTICLE_CLEAR_SPEED_MAX = 420;
export const PARTICLE_CLEAR_SCALE_START = 1.5;
/** クリア演出の紙吹雪を落とす重力(px/s^2) */
export const PARTICLE_CLEAR_GRAVITY_Y = 300;

export const HP_BAR_WIDTH = 320;
export const HP_BAR_HEIGHT = 10;
export const HP_BAR_Y = 32;
export const HP_BAR_BG_COLOR = 0x333333;
export const HP_BAR_COLOR = 0xff5555;

export const DEPTH_BOSS = 1;
export const DEPTH_BULLET = 2;
export const DEPTH_PLAYER = 3;
export const DEPTH_HITBOX = 4;
export const DEPTH_EFFECT = 5;
export const DEPTH_HUD = 10;

export const HUD_MARGIN = 8;
export const FPS_UPDATE_INTERVAL_MS = 250;
