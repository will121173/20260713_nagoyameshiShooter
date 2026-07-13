import Phaser from 'phaser';
import {
  DEPTH_EFFECT,
  PARTICLE_BOSS_HIT_COUNT,
  PARTICLE_BOSS_HIT_SCALE_START,
  PARTICLE_BOSS_HIT_TINT,
  PARTICLE_CLEAR_COUNT,
  PARTICLE_CLEAR_GRAVITY_Y,
  PARTICLE_CLEAR_LIFESPAN_MS,
  PARTICLE_CLEAR_SCALE_START,
  PARTICLE_CLEAR_SPEED_MAX,
  PARTICLE_CLEAR_TINTS,
  PARTICLE_LIFESPAN_MS,
  PARTICLE_PLAYER_HIT_COUNT,
  PARTICLE_SCALE_START,
  PARTICLE_SPEED_MAX,
  PARTICLE_SPEED_MIN,
  SPARK_COLOR,
  SPARK_RADIUS,
} from '../config';

const SPARK_TEXTURE_KEY = 'spark';

/**
 * パーティクル用の小さな円テクスチャを登録する
 * @param scene テクスチャを登録するシーン
 */
const ensureSparkTexture = (scene: Phaser.Scene): void => {
  if (scene.textures.exists(SPARK_TEXTURE_KEY)) {
    return;
  }
  const size = SPARK_RADIUS * 2;
  const graphics = scene.make.graphics({}, false);
  graphics.fillStyle(SPARK_COLOR, 1);
  graphics.fillCircle(SPARK_RADIUS, SPARK_RADIUS, SPARK_RADIUS);
  graphics.generateTexture(SPARK_TEXTURE_KEY, size, size);
  graphics.destroy();
};

export class Effects {
  private readonly playerHitEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly bossHitEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly clearEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    ensureSparkTexture(scene);
    this.playerHitEmitter = scene.add
      .particles(0, 0, SPARK_TEXTURE_KEY, {
        speed: { min: PARTICLE_SPEED_MIN, max: PARTICLE_SPEED_MAX },
        lifespan: PARTICLE_LIFESPAN_MS,
        scale: { start: PARTICLE_SCALE_START, end: 0 },
        emitting: false,
      })
      .setDepth(DEPTH_EFFECT);
    this.bossHitEmitter = scene.add
      .particles(0, 0, SPARK_TEXTURE_KEY, {
        speed: { min: PARTICLE_SPEED_MIN, max: PARTICLE_SPEED_MAX },
        lifespan: PARTICLE_LIFESPAN_MS,
        scale: { start: PARTICLE_BOSS_HIT_SCALE_START, end: 0 },
        tint: PARTICLE_BOSS_HIT_TINT,
        emitting: false,
      })
      .setDepth(DEPTH_EFFECT);
    this.clearEmitter = scene.add
      .particles(0, 0, SPARK_TEXTURE_KEY, {
        speed: { min: PARTICLE_SPEED_MIN, max: PARTICLE_CLEAR_SPEED_MAX },
        lifespan: PARTICLE_CLEAR_LIFESPAN_MS,
        scale: { start: PARTICLE_CLEAR_SCALE_START, end: 0 },
        tint: [...PARTICLE_CLEAR_TINTS],
        gravityY: PARTICLE_CLEAR_GRAVITY_Y,
        emitting: false,
      })
      .setDepth(DEPTH_EFFECT);
  }

  /**
   * 自機被弾の爆散
   * @param x 発生位置x
   * @param y 発生位置y
   */
  playerHit(x: number, y: number): void {
    this.playerHitEmitter.explode(PARTICLE_PLAYER_HIT_COUNT, x, y);
  }

  /**
   * ボス被弾のスパーク
   * @param x 発生位置x
   * @param y 発生位置y
   */
  bossHit(x: number, y: number): void {
    this.bossHitEmitter.explode(PARTICLE_BOSS_HIT_COUNT, x, y);
  }

  /**
   * ボス撃破の紙吹雪
   * @param x 発生位置x
   * @param y 発生位置y
   */
  clearBurst(x: number, y: number): void {
    this.clearEmitter.explode(PARTICLE_CLEAR_COUNT, x, y);
  }
}
