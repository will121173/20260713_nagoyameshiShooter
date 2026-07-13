export const AIM_MODES = ['aimed', 'fixed', 'random'] as const;

/** 狙い方式。aimed=自機狙い / fixed=固定角 / random=範囲内ランダム */
export type AimMode = (typeof AIM_MODES)[number];

/** 弾幕パターン定義(src/danmaku/patterns/*.json の形式) */
export type PatternDef = {
  /** パターン名(HUD表示用) */
  name: string;
  /** 狙い方式 */
  aim: AimMode;
  /** 発射間隔(ms) */
  intervalMs: number;
  /** 弾速(px/秒)。speedMax 指定時はランダム弾速の下限になる */
  speed: number;
  /** ランダム弾速の上限(px/秒)。省略時は speed 固定 */
  speedMax?: number;
  /** 1回の発射で撃つ弾数 */
  count: number;
  /** 弾の広がり(度)。360以上でリング配置、それ未満は中央揃えの扇 */
  spreadDeg: number;
  /** 基準角(度、90=真下)。aim=aimed のときは無視される */
  baseAngleDeg?: number;
  /** 発射のたびに基準角へ加算する回転量(度) */
  rotatePerShotDeg?: number;
  /** 弾の見た目の絵文字。省略時は config.ts の DEFAULT_BULLET_EMOJI */
  bulletEmoji?: string;
};

const isAimMode = (value: unknown): value is AimMode =>
  typeof value === 'string' && (AIM_MODES as readonly string[]).includes(value);

/**
 * 必須の数値フィールドを取り出す
 * @param record パターンJSONのオブジェクト
 * @param key フィールド名
 * @returns フィールドの数値
 */
const numberField = (record: Record<string, unknown>, key: string): number => {
  const value = record[key];
  if (typeof value !== 'number') {
    throw new Error(`pattern.${key} は数値で指定すること`);
  }
  return value;
};

/**
 * 省略可能な数値フィールドを取り出す
 * @param record パターンJSONのオブジェクト
 * @param key フィールド名
 * @returns フィールドの数値。未指定なら undefined
 */
const optionalNumberField = (record: Record<string, unknown>, key: string): number | undefined =>
  record[key] === undefined ? undefined : numberField(record, key);

/**
 * 省略可能な文字列フィールドを取り出す
 * @param record パターンJSONのオブジェクト
 * @param key フィールド名
 * @returns フィールドの文字列。未指定なら undefined
 */
const optionalStringField = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`pattern.${key} は文字列で指定すること`);
  }
  return value;
};

/**
 * JSONから読み込んだ値を PatternDef として検証する
 * (パターン調整時のJSON編集ミスを起動時のエラーで気付けるようにするため)
 * @param raw JSONモジュールから読み込んだ値
 * @returns 検証済みのパターン定義
 */
export const parsePatternDef = (raw: unknown): PatternDef => {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('pattern はオブジェクトで指定すること');
  }
  const record = raw as Record<string, unknown>;
  if (typeof record.name !== 'string') {
    throw new Error('pattern.name は文字列で指定すること');
  }
  if (!isAimMode(record.aim)) {
    throw new Error(`pattern.aim は ${AIM_MODES.join(' / ')} のいずれかで指定すること`);
  }
  return {
    name: record.name,
    aim: record.aim,
    intervalMs: numberField(record, 'intervalMs'),
    speed: numberField(record, 'speed'),
    speedMax: optionalNumberField(record, 'speedMax'),
    count: numberField(record, 'count'),
    spreadDeg: numberField(record, 'spreadDeg'),
    baseAngleDeg: optionalNumberField(record, 'baseAngleDeg'),
    rotatePerShotDeg: optionalNumberField(record, 'rotatePerShotDeg'),
    bulletEmoji: optionalStringField(record, 'bulletEmoji'),
  };
};
