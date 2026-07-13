import Phaser from 'phaser';
import { DEPTH_HUD, FPS_UPDATE_INTERVAL_MS, GAME_WIDTH, HUD_MARGIN } from '../config';

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '16px',
  color: '#66ff66',
};

export class FpsMonitor {
  private readonly text: Phaser.GameObjects.Text;
  private elapsedMs = 0;

  constructor(scene: Phaser.Scene) {
    this.text = scene.add
      .text(GAME_WIDTH - HUD_MARGIN, HUD_MARGIN, '', TEXT_STYLE)
      .setOrigin(1, 0)
      .setDepth(DEPTH_HUD);
  }

  /**
   * 表示を更新する(Textの再描画コストを抑えるため一定間隔に間引く)
   * @param deltaMs 前フレームからの経過時間(ms)
   * @param fps 現在のfps
   * @param activeBullets アクティブな弾数
   */
  update(deltaMs: number, fps: number, activeBullets: number): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs < FPS_UPDATE_INTERVAL_MS) {
      return;
    }
    this.elapsedMs = 0;
    this.text.setText(`FPS ${fps.toFixed(1)}  弾 ${activeBullets}`);
  }
}
