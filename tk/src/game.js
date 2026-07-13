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
    this.hp = CONFIG.maxHp;
    this.spawnTimer = 0;
    this.spawnInterval = 900;  // ms。徐々に短くして難易度上昇
    this.elapsed = 0;
    this.bossSpawned = false;
    this.cutin = null; // ボス登場カットイン中は { key, startAt } が入る
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
    BGM.start(); // Enter（ユーザー操作）でBGM開始
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

    // ボス登場カットイン中はゲームを一時停止して演出を見せる
    if (this.cutin) {
      this._updateStars(); // 背景だけ動かす
      if (now - this.cutin.startAt >= CONFIG.cutinMs) {
        // 演出終了 → ボス本体を登場させる
        const def = ENEMIES[this.cutin.key];
        this.enemies.push(new Enemy(def, CONFIG.width / 2));
        this.cutin = null;
      }
      return; // 演出中は他の更新をスキップ
    }

    this._updateStars();
    this._handleSpawn(now, dt);

    // 自機（P2など ai:true のプレイヤーは自動操縦の合成入力を使う）
    for (const p of this.players) {
      const input = p.def.ai ? this._aiInput(p) : Input;
      p.update(input);
      const fired = p.tryFire(now, input);
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

    // 終了判定（HPが尽きたらゲームオーバー）
    if (this.hp <= 0) {
      this.hp = 0;
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

  /*
   * P2などの自動操縦AI。
   * 優先度: ①敵弾を回避 → ②近くの武器アイテムを回収 → ③最寄りの敵に照準
   * Playerが読む input(isDown) と同じ形の合成入力を返すので、
   * Player側のロジックを変えずに人間↔COMを切り替えられる。
   */
  _aiInput(p) {
    const k = p.def.keys;
    const pressed = {};
    const press = (key) => { if (key) pressed[key] = true; };

    const homeY = CONFIG.height * 0.72; // 基本の待機高さ（画面下部）
    let targetX = p.x;

    // ① 一番近い敵弾（危険）を探す
    let threat = null, threatDist = Infinity;
    for (const b of this.enemyBullets) {
      const dist = Math.hypot(b.x - p.x, b.y - p.y);
      if (dist < threatDist && dist < 95) { threat = b; threatDist = dist; }
    }

    if (threat) {
      // 弾から水平に逃げる
      targetX = p.x + (threat.x < p.x ? 45 : -45);
    } else {
      // ② 手近な武器アイテムがあれば回収に向かう
      let drop = null, dd = Infinity;
      for (const d of this.drops) {
        const dist = Math.abs(d.x - p.x) + Math.abs(d.y - p.y);
        if (dist < dd) { dd = dist; drop = d; }
      }
      if (drop && Math.abs(drop.y - p.y) < 240) {
        targetX = drop.x;
      } else {
        // ③ 自分より上にいる最寄りの敵に照準を合わせる
        let enemy = null, ed = Infinity;
        for (const e of this.enemies) {
          if (e.y > p.y) continue;
          const dist = Math.hypot(e.x - p.x, e.y - p.y);
          if (dist < ed) { ed = dist; enemy = e; }
        }
        if (enemy) targetX = enemy.x;
      }
    }

    // 水平移動（少し不感帯を設けてプルプル震えを防ぐ）
    if (targetX < p.x - 6) press(k.left);
    else if (targetX > p.x + 6) press(k.right);
    // 垂直移動（待機高さを維持）
    if (p.y < homeY - 12) press(k.down);
    else if (p.y > homeY + 12) press(k.up);

    press(k.fire); // 常に発射

    return { isDown: (key) => !!pressed[key] };
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
    // まずカットイン演出を開始。ボス本体は演出終了後（update内）で登場する
    this.cutin = { key: 'cochin', startAt: performance.now() };
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
        if (Util.hit(b, p)) { b.dead = true; this._onPlayerHit(p, now, CONFIG.damageBullet); }
      }
    }

    // 敵本体 vs 自機（体当たり）
    for (const e of this.enemies) {
      for (const p of this.players) {
        if (!p.alive || p.isInvincible(now)) continue;
        if (Util.hit(e, p)) this._onPlayerHit(p, now, CONFIG.damageBody);
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
    // 敵を倒すとHP回復（倒し続ければなかなか死なない）
    this.hp = Math.min(CONFIG.maxHp, this.hp + (e.def.heal || 0));
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

  _onPlayerHit(player, now, damage) {
    player.invincibleUntil = now + CONFIG.invincibleMs;
    this.hp -= damage;                 // 共有HPを減らす
    Audio.speakRandom(VOICES.damage);
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

    // ボス登場カットイン（最前面）
    if (this.cutin) this._drawCutin(ctx, now);

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

    // HPゲージ
    const barX = 10, barY = 32, barW = 160, barH = 14;
    const ratio = Util.clamp(this.hp / CONFIG.maxHp, 0, 1);
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    // HP残量で色を変える（緑→黄→赤）
    ctx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ffc107' : '#f44336';
    ctx.fillRect(barX, barY, barW * ratio, barH);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`HP ${Math.max(0, Math.ceil(this.hp))}/${CONFIG.maxHp}`, barX + barW + 8, barY + 1);
    ctx.font = '16px sans-serif';

    // 各プレイヤーの現在武器
    ctx.textAlign = 'right';
    this.players.forEach((p, i) => {
      ctx.fillStyle = p.color;
      const tag = p.def.ai ? `${p.id}(COM)` : p.id;
      ctx.fillText(`${tag}:${p.weapon.icon}${p.weapon.name}`, CONFIG.width - 10, 8 + i * 22);
    });
    // BGM状態（Mキーで切替）
    ctx.fillStyle = '#aaa';
    ctx.font = '11px sans-serif';
    ctx.fillText(BGM.muted ? '♪OFF (M)' : '♪ON (M)', CONFIG.width - 10, 8 + this.players.length * 22);
  }

  /*
   * ボス登場カットイン演出。
   * 時間経過で「スライドイン → ホールド → スライドアウト」する。
   * ENEMIES[key] のデータ（icon/name/catchphrase）を使うので、
   * 他のボスにも catchphrase を足せば同じ演出を流用できる。
   */
  _drawCutin(ctx, now) {
    const def = ENEMIES[this.cutin.key];
    const t = now - this.cutin.startAt;
    const D = CONFIG.cutinMs;
    const W = CONFIG.width, cy = CONFIG.height / 2;

    // スライド量: 開始で左から入り、終了で右へ抜ける（-1〜0〜+1）
    const IN = 450, OUT = 450;
    let slide = 0;
    if (t < IN) slide = -(1 - t / IN);
    else if (t > D - OUT) slide = (t - (D - OUT)) / OUT;
    const dx = slide * W;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 画面全体を暗転
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, CONFIG.height);

    // 中央の赤い帯（演出用レターボックス）
    const bandH = 210;
    ctx.fillStyle = 'rgba(140,0,0,0.88)';
    ctx.fillRect(0, cy - bandH / 2, W, bandH);
    ctx.fillStyle = '#ffcc33';
    ctx.fillRect(0, cy - bandH / 2, W, 4);
    ctx.fillRect(0, cy + bandH / 2 - 4, W, 4);

    // WARNING 点滅
    if (Math.floor(now / 200) % 2 === 0) {
      ctx.fillStyle = '#ffdd44';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('⚠ WARNING ⚠', W / 2, cy - bandH / 2 - 26);
    }

    // ボスキャラを大きく（左からスライド）
    ctx.font = '120px sans-serif';
    ctx.fillText(def.icon, W / 2 + dx, cy - 25);

    // 名前を大きく（右からスライド）
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(def.name, W / 2 - dx, cy + 58);

    // キャッチフレーズ
    if (def.catchphrase) {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = '16px sans-serif';
      ctx.fillText(def.catchphrase, W / 2 - dx, cy + 88);
    }
    ctx.restore();
  }

  _drawTitle(ctx) {
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('名古屋飯シューティング', CONFIG.width / 2, CONFIG.height / 2 - 80);
    ctx.font = '16px sans-serif';
    ctx.fillText('P1: 矢印キー + Space', CONFIG.width / 2, CONFIG.height / 2 - 20);
    ctx.fillText('P2: COM（自動操縦）', CONFIG.width / 2, CONFIG.height / 2 + 6);
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

  // Enterでスタート／リトライ、MでBGMのON/OFF
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (game.state === 'title' || game.state === 'gameover' || game.state === 'clear') {
        game.start();
      }
    }
    if (e.key === 'm' || e.key === 'M') BGM.toggleMute();
  });

  game.loop();
});
