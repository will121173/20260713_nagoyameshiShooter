import Phaser from 'phaser';
import { ensureEmojiTexture } from '../utils/emojiTexture';
import { Bullet } from './Bullet';

/** プールの生成設定(敵弾・自機ショットで使い分ける) */
export type BulletPoolOptions = {
  /** デフォルトテクスチャにする絵文字 */
  emoji: string;
  /** テクスチャの一辺(px) */
  textureSize: number;
  /** 当たり判定の円半径(px) */
  bodyRadius: number;
  /** プールの最大弾数 */
  poolSize: number;
};

export class BulletPool extends Phaser.Physics.Arcade.Group {
  private readonly defaultTextureKey: string;
  private readonly bodyRadius: number;

  constructor(scene: Phaser.Scene, options: BulletPoolOptions) {
    super(scene.physics.world, scene, {
      classType: Bullet,
      maxSize: options.poolSize,
      runChildUpdate: false,
    });
    this.defaultTextureKey = ensureEmojiTexture(scene, options.emoji, options.textureSize);
    this.bodyRadius = options.bodyRadius;
    // プレイ中の生成コストとGCを避けるため、起動時に全弾を確保しておく
    this.createMultiple({
      key: this.defaultTextureKey,
      quantity: options.poolSize,
      active: false,
      visible: false,
    });
    for (const child of this.getChildren()) {
      (child as Bullet).despawn();
    }
  }

  /**
   * プールから弾を取り出して発射する(プール枯渇時は発射をスキップ)
   * @param x 発射位置x
   * @param y 発射位置y
   * @param angleRad 進行方向(ラジアン)
   * @param speed 弾速(px/秒)
   * @param textureKey 弾の見た目。省略時はプールのデフォルト絵文字
   */
  spawn(
    x: number,
    y: number,
    angleRad: number,
    speed: number,
    textureKey: string = this.defaultTextureKey,
  ): void {
    const bullet = this.get() as Bullet | null;
    if (!bullet) {
      return;
    }
    bullet.fire(x, y, angleRad, speed, textureKey, this.bodyRadius);
  }

  /** アクティブな弾をすべてプールへ返す(被弾時の全弾消し用) */
  despawnAll(): void {
    for (const child of this.getMatching('active', true)) {
      (child as Bullet).despawn();
    }
  }

  /** 現在アクティブな弾数(FpsMonitor表示用) */
  activeCount(): number {
    return this.countActive(true);
  }
}
