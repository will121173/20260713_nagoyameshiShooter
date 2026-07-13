import Phaser from 'phaser';
import {
  BULLET_KILL_MARGIN,
  BULLET_MAX_SPIN_DEG,
  BULLET_RADIUS,
  BULLET_TEXTURE_SIZE,
  DEPTH_BULLET,
  GAME_HEIGHT,
  GAME_WIDTH,
} from '../config';

/** 判定円(半径6px)をテクスチャ中央に合わせるためのオフセット */
const BODY_OFFSET = BULLET_TEXTURE_SIZE / 2 - BULLET_RADIUS;

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    this.setDepth(DEPTH_BULLET);
  }

  /**
   * プールから取り出された弾を発射する
   * @param x 発射位置x
   * @param y 発射位置y
   * @param angleRad 進行方向(ラジアン)
   * @param speed 弾速(px/秒)
   * @param textureKey 弾の見た目(絵文字テクスチャのキー)
   */
  fire(x: number, y: number, angleRad: number, speed: number, textureKey: string): void {
    if (this.texture.key !== textureKey) {
      this.setTexture(textureKey);
    }
    this.enableBody(true, x, y, true, true);
    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.setCircle(BULLET_RADIUS, BODY_OFFSET, BODY_OFFSET);
    }
    this.setVelocity(Math.cos(angleRad) * speed, Math.sin(angleRad) * speed);
    // 食べ物が宙を舞う感じを出すためランダムに回転させる
    this.setAngularVelocity(Phaser.Math.FloatBetween(-BULLET_MAX_SPIN_DEG, BULLET_MAX_SPIN_DEG));
  }

  /** 弾を無効化してプールへ返す */
  despawn(): void {
    this.disableBody(true, true);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const outOfBounds =
      this.x < -BULLET_KILL_MARGIN ||
      this.x > GAME_WIDTH + BULLET_KILL_MARGIN ||
      this.y < -BULLET_KILL_MARGIN ||
      this.y > GAME_HEIGHT + BULLET_KILL_MARGIN;
    if (outOfBounds) {
      this.despawn();
    }
  }
}
