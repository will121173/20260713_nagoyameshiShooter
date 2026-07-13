import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { GameScene } from './scenes/GameScene';

declare global {
  interface Window {
    /** 負荷計測・デバッグでコンソールから触るための参照 */
    game?: Phaser.Game;
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
  },
  scene: [GameScene],
});

window.game = game;
