import Phaser from 'phaser';
import type { BulletPool } from '../bullets/BulletPool';
import { BULLET_TEXTURE_SIZE, DEFAULT_BULLET_EMOJI } from '../config';
import { emojiTextureKey } from '../utils/emojiTexture';
import type { PatternDef } from './types';

/** 発射源・狙い先の座標 */
export type FirePoint = {
  /** x座標(px) */
  x: number;
  /** y座標(px) */
  y: number;
};

const DEFAULT_BASE_ANGLE_DEG = 90;
const FULL_CIRCLE_DEG = 360;

export class PatternRunner {
  private pattern: PatternDef | null = null;
  private elapsedMs = 0;
  private shotIndex = 0;

  constructor(private readonly pool: BulletPool) {}

  /**
   * パターンを切り替え、発射タイミングと回転をリセットする
   * @param pattern 適用するパターン定義
   */
  setPattern(pattern: PatternDef): void {
    this.pattern = pattern;
    this.elapsedMs = 0;
    this.shotIndex = 0;
  }

  /**
   * 経過時間ぶんの発射を行う
   * @param deltaMs 前フレームからの経過時間(ms)
   * @param origin 発射源(ボス中心)
   * @param target 狙い先(自機中心)
   */
  update(deltaMs: number, origin: FirePoint, target: FirePoint): void {
    const pattern = this.pattern;
    if (!pattern) {
      return;
    }
    this.elapsedMs += deltaMs;
    // フレーム落ち時も発射数が実時間に追従するよう、間隔ぶんずつ消化する
    while (this.elapsedMs >= pattern.intervalMs) {
      this.elapsedMs -= pattern.intervalMs;
      this.fireOnce(pattern, origin, target);
      this.shotIndex += 1;
    }
  }

  /**
   * 1回ぶんの発射(count発)を行う
   * @param pattern 現在のパターン定義
   * @param origin 発射源
   * @param target 狙い先
   */
  private fireOnce(pattern: PatternDef, origin: FirePoint, target: FirePoint): void {
    const baseDeg =
      pattern.aim === 'aimed'
        ? Phaser.Math.RadToDeg(Math.atan2(target.y - origin.y, target.x - origin.x))
        : (pattern.baseAngleDeg ?? DEFAULT_BASE_ANGLE_DEG);
    const centerDeg = baseDeg + (pattern.rotatePerShotDeg ?? 0) * this.shotIndex;
    const textureKey = emojiTextureKey(
      pattern.bulletEmoji ?? DEFAULT_BULLET_EMOJI,
      BULLET_TEXTURE_SIZE,
    );
    for (let i = 0; i < pattern.count; i += 1) {
      const angleDeg = this.bulletAngleDeg(pattern, centerDeg, i);
      const speed =
        pattern.speedMax !== undefined
          ? Phaser.Math.FloatBetween(pattern.speed, pattern.speedMax)
          : pattern.speed;
      this.pool.spawn(origin.x, origin.y, Phaser.Math.DegToRad(angleDeg), speed, textureKey);
    }
  }

  /**
   * i番目の弾の角度を決める
   * @param pattern 現在のパターン定義
   * @param centerDeg 回転適用後の基準角(度)
   * @param index 弾のインデックス(0始まり)
   * @returns 弾の進行方向(度)
   */
  private bulletAngleDeg(pattern: PatternDef, centerDeg: number, index: number): number {
    if (pattern.aim === 'random') {
      return centerDeg + Phaser.Math.FloatBetween(-pattern.spreadDeg / 2, pattern.spreadDeg / 2);
    }
    if (pattern.count <= 1) {
      return centerDeg;
    }
    // リングは端の弾が重ならないよう等間隔、扇は両端を含めて中央揃えに配置する
    if (pattern.spreadDeg >= FULL_CIRCLE_DEG) {
      return centerDeg + (pattern.spreadDeg / pattern.count) * index;
    }
    return centerDeg - pattern.spreadDeg / 2 + (pattern.spreadDeg / (pattern.count - 1)) * index;
  }
}
