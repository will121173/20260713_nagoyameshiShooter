import Phaser from 'phaser';
import { BULLET_POOL_SIZE, BULLET_TEXTURE_SIZE, DEFAULT_BULLET_EMOJI } from '../config';
import { ensureEmojiTexture } from '../utils/emojiTexture';
import { Bullet } from './Bullet';

export class BulletPool extends Phaser.Physics.Arcade.Group {
  constructor(scene: Phaser.Scene) {
    super(scene.physics.world, scene, {
      classType: Bullet,
      maxSize: BULLET_POOL_SIZE,
      runChildUpdate: false,
    });
    const defaultTextureKey = ensureEmojiTexture(scene, DEFAULT_BULLET_EMOJI, BULLET_TEXTURE_SIZE);
    // プレイ中の生成コストとGCを避けるため、起動時に全弾を確保しておく
    this.createMultiple({
      key: defaultTextureKey,
      quantity: BULLET_POOL_SIZE,
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
   * @param textureKey 弾の見た目(絵文字テクスチャのキー)
   */
  spawn(x: number, y: number, angleRad: number, speed: number, textureKey: string): void {
    const bullet = this.get() as Bullet | null;
    if (!bullet) {
      return;
    }
    bullet.fire(x, y, angleRad, speed, textureKey);
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
