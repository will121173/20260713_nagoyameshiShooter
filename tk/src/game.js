/*
 * game.js — ゲーム本体（状態管理・ループ・spawn・当たり判定の統括）
 * ------------------------------------------------------------------
 * config.js のデータと engine.js のエンティティを組み合わせて
 * 実際のゲームを動かします。修正時の入口はだいたいこのファイルです。
 */

// ---- 入力管理 ----
const Input = {
  down: {},
  init() {
    window.addEventListener('keydown', (e) => {
      this.down[e.key] = true;
      // ゲームで使うキーはスクロール等を抑止
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => { this.down[e.key] = false; });
  },
  isDown(key) { return !!this.down[key]; },
};

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = CONFIG.width;
    canvas.height = CONFIG.height;

    this.reset();
    this._initStars();
  }

  reset() {
    this.players = PLAYERS.map((def) => new Player(def));
    this.bullets = [];       // 自機弾
    this.enemyBullets = [];  // 敵弾
    this.enemies = [];
    this.drops = [];
    this.explosions = [];
    this.score = 0;
    this.lives = CONFIG.startLives;
    this.spawnTimer = 0;
    this.spawnInterval = 900;  // ms。徐々に短くして難易度上昇
    this.elapsed = 0;
    this.bossSpawned = false;
    this.state = 'title'; // 'title' | 'playing' | 'gameover' | 'clear'
    this.lastTime = performance.now();
  }

  _initStars() {
    this.stars = Array.from({ length: CONFIG.starCount }, () => ({
      x: Math.random() * CONFIG.width,
      y: Math.random() * CONFIG.height,
      s: Util.rand(1, 3),
    }));
  }

  start() {
    this.reset();
    this.state = 'playing';
    Audio.speak('ゲームスタート！', { force: true });
  }

  // ---- メインループ ----
  loop() {
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    if (this.state === 'playing') this.update(now, dt);
    this.render(now);
    requestAnimationFrame(() => this.loop());
  }

  // ---- 更新 ----
  update(now, dt) {
    this.elapsed += dt;
    this._updateStars();
    this._handleSpawn(now, dt);

    // 自機
    for (const p of this.players) {
      p.update(Input);
      const fired = p.tryFire(now, Input);
      if (fired) {
        this.bullets.push(...fired.bullets);
        if (fired.weapon.voice) Audio.speak(fired.weapon.voice);
      }
    }

    // 弾・敵・アイテム・爆発の更新
    const spawnEnemyBullet = (x, y, angle) => {
      this.enemyBullets.push(new Bullet({
        x, y, dx: Math.cos(angle), dy: Math.sin(angle),
        speed: 4.5, radius: 5, color: '#ff5555',
      }));
    };
    this.bullets.forEach((b) => b.update());
    this.enemyBullets.forEach((b) => b.update());
    this.enemies.forEach((e) => e.update(now, this.players, spawnEnemyBullet));
    this.drops.forEach((d) => d.update());
    this.explosions.forEach((ex) => ex.update());

    this._collide(now);

    // 死んだものを除去
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.enemyBullets = this.enemyBullets.filter((b) => !b.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.drops = this.drops.filter((d) => !d.dead);
    this.explosions = this.explosions.filter((ex) => !ex.dead);

    // 終了判定
    if (this.lives <= 0) {
      this.state = 'gameover';
      Audio.speak('ゲームオーバー', { force: true });
    }
  }

  _updateStars() {
    for (const s of this.stars) {
      s.y += CONFIG.starSpeed * (s.s / 2);
      if (s.y > CONFIG.height) { s.y = 0; s.x = Math.random() * CONFIG.width; }
    }
  }

  _handleSpawn(now, dt) {
    // ボス撃破済みならクリア
    if (this.bossSpawned && this.enemies.length === 0 &&
        !this.enemies.some((e) => e.boss)) {
      // ボスが消えたか確認（撃破 or 未出現の両方を弾くため下で判定）
    }

    this.spawnTimer += dt;

    // 一定時間経過でボス出現（まだ出していなければ）
    if (!this.bossSpawned && this.elapsed > 45000) {
      this._spawnBoss();
      return;
    }

    if (this.bossSpawned) return; // ボス戦中は雑魚spawn停止

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this._spawnRandomEnemy();
      // 徐々に湧きを速く（最短400ms）
      this.spawnInterval = Math.max(400, this.spawnInterval - 15);
    }
  }

  _spawnRandomEnemy() {
    const key = NORMAL_ENEMY_KEYS[Math.floor(Math.random() * NORMAL_ENEMY_KEYS.length)];
    const def = ENEMIES[key];
    const x = Util.rand(def.size, CONFIG.width - def.size);
    this.enemies.push(new Enemy(def, x));
  }

  _spawnBoss() {
    this.bossSpawned = true;
    this.enemies.push(new Enemy(ENEMIES.cochin, CONFIG.width / 2));
    Audio.speak('ボスとうじょう！名古屋コーチンキング！', { force: true });
  }

  // ---- 当たり判定 ----
  _collide(now) {
    // 自機弾 vs 敵
    for (const b of this.bullets) {
      for (const e of this.enemies) {
        if (e.dead || b.dead) continue;
        if (b.pierce && b.hitSet.has(e)) continue;
        if (!Util.hit(b, e)) continue;

        const killed = e.takeDamage(b.damage);
        if (b.explode) {
          // 爆発発生＋範囲ダメージ
          this._spawnExplosion(b.x, b.y, b.explode);
        }
        if (b.pierce) b.hitSet.add(e);
        else b.dead = true;

        if (killed) this._onEnemyKilled(e);
      }
    }

    // 爆発の範囲ダメージ
    for (const ex of this.explosions) {
      if (ex.hasDamaged) continue;
      ex.hasDamaged = true;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - ex.x, e.y - ex.y);
        if (d < ex.damageRadius + e.size / 2) {
          if (e.takeDamage(1)) this._onEnemyKilled(e);
        }
      }
    }

    // 敵弾 vs 自機
    for (const b of this.enemyBullets) {
      for (const p of this.players) {
        if (!p.alive || p.isInvincible(now) || b.dead) continue;
        if (Util.hit(b, p)) { b.dead = true; this._onPlayerHit(p, now); }
      }
    }

    // 敵本体 vs 自機（体当たり）
    for (const e of this.enemies) {
      for (const p of this.players) {
        if (!p.alive || p.isInvincible(now)) continue;
        if (Util.hit(e, p)) this._onPlayerHit(p, now);
      }
    }

    // アイテム vs 自機（武器切り替え）
    for (const d of this.drops) {
      for (const p of this.players) {
        if (!p.alive || d.dead) continue;
        if (Util.hit(d, p)) {
          d.dead = true;
          p.weaponKey = d.weaponKey;
          Audio.speak(`${d.weapon.name}ゲット！`);
        }
      }
    }
  }

  _spawnExplosion(x, y, radius) {
    this.explosions.push(new Explosion(x, y, radius));
  }

  _onEnemyKilled(e) {
    this.score += e.score;
    this._spawnExplosion(e.x, e.y, e.boss ? 90 : 30);
    Audio.speakRandom(e.boss ? VOICES.bossDown : VOICES.defeat);

    // 武器ドロップ
    if (e.def.dropWeapon && Math.random() < e.def.dropRate) {
      this.drops.push(new Drop(e.def.dropWeapon, e.x, e.y));
    }

    if (e.boss) {
      this.state = 'clear';
    }
  }

  _onPlayerHit(player, now) {
    player.invincibleUntil = now + 1500; // 1.5秒無敵
    this.lives -= 1;
    Audio.speakRandom(VOICES.damage);
    // 残機0で自機を非表示にする等はlives管理で対応（ここでは共有ライフ制）
  }

  // ---- 描画 ----
  render(now) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    this._drawStars(ctx);

    if (this.state === 'title') return this._drawTitle(ctx);

    // エンティティ描画
    this.drops.forEach((d) => d.draw(ctx));
    this.enemies.forEach((e) => e.draw(ctx));
    this.bullets.forEach((b) => b.draw(ctx));
    this.enemyBullets.forEach((b) => b.draw(ctx));
    this.explosions.forEach((ex) => ex.draw(ctx));
    this.players.forEach((p) => p.draw(ctx, now));

    this._drawHUD(ctx);

    if (this.state === 'gameover') this._drawCenter(ctx, 'GAME OVER', 'Enterでリトライ');
    if (this.state === 'clear') this._drawCenter(ctx, 'STAGE CLEAR!', 'Enterでリトライ');
  }

  _drawStars(ctx) {
    ctx.fillStyle = '#ffffff';
    for (const s of this.stars) {
      ctx.globalAlpha = s.s / 3;
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;
  }

  _drawHUD(ctx) {
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`SCORE ${this.score}`, 10, 8);
    ctx.fillText(`LIVES ${'❤️'.repeat(Math.max(0, this.lives))}`, 10, 30);

    // 各プレイヤーの現在武器
    ctx.textAlign = 'right';
    this.players.forEach((p, i) => {
      ctx.fillStyle = p.color;
      ctx.fillText(`${p.id}:${p.weapon.icon}${p.weapon.name}`, CONFIG.width - 10, 8 + i * 22);
    });
  }

  _drawTitle(ctx) {
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('名古屋飯シューティング', CONFIG.width / 2, CONFIG.height / 2 - 80);
    ctx.font = '16px sans-serif';
    ctx.fillText('P1: 矢印キー + Space', CONFIG.width / 2, CONFIG.height / 2 - 20);
    ctx.fillText('P2: WASD + Shift', CONFIG.width / 2, CONFIG.height / 2 + 6);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffcc33';
    ctx.fillText('Enter でスタート', CONFIG.width / 2, CONFIG.height / 2 + 60);
  }

  _drawCenter(ctx, title, sub) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(title, CONFIG.width / 2, CONFIG.height / 2 - 20);
    ctx.font = '18px sans-serif';
    ctx.fillText(`SCORE ${this.score}`, CONFIG.width / 2, CONFIG.height / 2 + 20);
    ctx.fillText(sub, CONFIG.width / 2, CONFIG.height / 2 + 50);
  }
}

// ---- 起動 ----
window.addEventListener('DOMContentLoaded', () => {
  Audio.init();
  Input.init();
  const game = new Game(document.getElementById('game'));

  // Enterでスタート／リトライ
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (game.state === 'title' || game.state === 'gameover' || game.state === 'clear') {
        game.start();
      }
    }
  });

  game.loop();
});
