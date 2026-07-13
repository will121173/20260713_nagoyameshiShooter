/*
 * engine.js — エンティティとゲーム物理（描画・移動・当たり判定）
 * ------------------------------------------------------------------
 * Player / Bullet / Enemy / Drop / Explosion のクラスを定義します。
 * 「動きの追加」はここ、「データの追加」はconfig.jsという役割分担です。
 */

// ---- 汎用ユーティリティ ----
const Util = {
  rand: (min, max) => min + Math.random() * (max - min),
  // AABB（矩形）当たり判定。各entityは x,y を中心、size を一辺とする
  hit(a, b) {
    const ah = (a.size ?? a.radius * 2) / 2;
    const bh = (b.size ?? b.radius * 2) / 2;
    return (
      Math.abs(a.x - b.x) < ah + bh &&
      Math.abs(a.y - b.y) < ah + bh
    );
  },
  clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
};

// ---- 自機 ----
class Player {
  constructor(def) {
    this.def = def;
    this.id = def.id;
    this.x = def.start.x;
    this.y = def.start.y;
    this.size = PLAYER_SIZE;
    this.color = def.color;
    this.weaponKey = INITIAL_WEAPON;
    this.lastFireAt = 0;
    this.alive = true;
    this.invincibleUntil = 0; // 被弾後の無敵時間(ms)
  }

  get weapon() { return WEAPONS[this.weaponKey]; }

  update(input) {
    if (!this.alive) return;
    const k = this.def.keys;
    let dx = 0, dy = 0;
    if (input.isDown(k.left)) dx -= 1;
    if (input.isDown(k.right)) dx += 1;
    if (input.isDown(k.up)) dy -= 1;
    if (input.isDown(k.down)) dy += 1;
    // 斜め移動が速くならないよう正規化
    if (dx && dy) { dx *= 0.707; dy *= 0.707; }
    this.x = Util.clamp(this.x + dx * PLAYER_SPEED, this.size / 2, CONFIG.width - this.size / 2);
    this.y = Util.clamp(this.y + dy * PLAYER_SPEED, this.size / 2, CONFIG.height - this.size / 2);
  }

  /** 発射可能ならBullet配列を返す。撃てなければ null */
  tryFire(now, input) {
    if (!this.alive) return null;
    if (!input.isDown(this.def.keys.fire)) return null;
    const w = this.weapon;
    if (now - this.lastFireAt < w.cooldown) return null;
    this.lastFireAt = now;

    const bullets = w.fire(this).map((spec) => new Bullet({
      x: this.x + (spec.offsetX || 0),
      y: this.y - this.size / 2,
      owner: this,
      ...spec,
    }));
    return { bullets, weapon: w };
  }

  isInvincible(now) { return now < this.invincibleUntil; }

  draw(ctx, now) {
    if (!this.alive) return;
    // 無敵中は点滅
    if (this.isInvincible(now) && Math.floor(now / 100) % 2 === 0) return;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    // 上向きの三角形（自機っぽく）
    ctx.moveTo(this.x, this.y - this.size / 2);
    ctx.lineTo(this.x - this.size / 2, this.y + this.size / 2);
    ctx.lineTo(this.x + this.size / 2, this.y + this.size / 2);
    ctx.closePath();
    ctx.fill();
    // 武器アイコンを小さく重ねる
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.weapon.icon, this.x, this.y + 4);
  }
}

// ---- 弾（自機・敵共通） ----
class Bullet {
  constructor(spec) {
    this.x = spec.x;
    this.y = spec.y;
    this.dx = spec.dx;
    this.dy = spec.dy;
    this.speed = spec.speed;
    this.damage = spec.damage ?? 1;
    this.radius = spec.radius ?? 4;
    this.color = spec.color ?? '#fff';
    this.icon = spec.icon || null;
    this.owner = spec.owner || null; // 自機弾。nullなら敵弾
    this.pierce = !!spec.pierce;      // 貫通
    this.boomerang = !!spec.boomerang;// 戻ってくる
    this.explode = spec.explode || 0; // 着弾時の爆発半径(0なら無し)
    this.dead = false;
    this.age = 0;
    this.hitSet = new Set(); // 貫通弾が同じ敵に多重ヒットしないよう記録
  }

  update() {
    this.age++;
    // ブーメラン：一定時間で方向反転して戻る
    if (this.boomerang && this.age === 40) this.dy *= -1;
    if (this.boomerang && this.age > 120) this.dead = true;

    this.x += this.dx * this.speed;
    this.y += this.dy * this.speed;

    // 画面外で消滅（ブーメランは戻る途中なので下方向のみ消す）
    if (this.y < -20 || this.y > CONFIG.height + 20 ||
        this.x < -20 || this.x > CONFIG.width + 20) {
      if (!this.boomerang) this.dead = true;
    }
  }

  draw(ctx) {
    if (this.icon) {
      ctx.font = `${this.radius * 2.4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.icon, this.x, this.y);
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---- 敵 ----
class Enemy {
  constructor(def, x) {
    this.def = def;
    this.key = def.key;
    this.icon = def.icon;
    this.size = def.size;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.score = def.score;
    this.speed = def.speed;
    this.boss = !!def.boss;
    this.x = x;
    this.y = -def.size;
    this.age = 0;
    this.dead = false;
    this.lastShotAt = 0;
    // 動きパターン用の内部状態
    this._dir = Math.random() < 0.5 ? -1 : 1;   // zigzag/dash用
    this._phase = Math.random() * Math.PI * 2;  // hover/boss用
    this._hoverY = Util.rand(120, 260);         // hoverの停止高さ
  }

  /** 移動パターン。config.jsのmoveキーで分岐 */
  update(now, players, spawnEnemyBullet) {
    this.age++;
    switch (this.def.move) {
      case 'straight':
        this.y += this.speed;
        break;
      case 'zigzag':
        this.y += this.speed;
        this.x += Math.sin(this.age * 0.08) * 2.5;
        break;
      case 'dash':
        // 斜め突撃。壁で反射
        this.y += this.speed * 0.7;
        this.x += this._dir * this.speed;
        if (this.x < this.size / 2 || this.x > CONFIG.width - this.size / 2) this._dir *= -1;
        break;
      case 'hover':
        // 指定高さまで降りてホバリングし、射撃
        if (this.y < this._hoverY) this.y += this.speed;
        else this.x += Math.sin(this.age * 0.03) * 1.5;
        break;
      case 'boss':
        // 中央上部に居座って左右に揺れる
        if (this.y < 110) this.y += this.speed;
        else this.x = CONFIG.width / 2 + Math.sin(this.age * 0.02) * (CONFIG.width / 2 - this.size / 2 - 10);
        break;
    }
    this.x = Util.clamp(this.x, this.size / 2, CONFIG.width - this.size / 2);

    // 射撃（自機方向へ）
    if (this.def.canShoot && spawnEnemyBullet) {
      const interval = this.boss ? 700 : 1400;
      if (now - this.lastShotAt > interval && this.y > 0) {
        this.lastShotAt = now;
        this._shoot(players, spawnEnemyBullet);
      }
    }

    if (this.y > CONFIG.height + this.size) this.dead = true; // 画面下に抜けた
  }

  _shoot(players, spawnEnemyBullet) {
    // 生存中の一番近い自機を狙う
    const targets = players.filter((p) => p.alive);
    if (!targets.length) return;
    const target = targets[Math.floor(Math.random() * targets.length)];
    const angle = Math.atan2(target.y - this.y, target.x - this.x);

    if (this.boss) {
      // ボスは扇状弾幕
      for (let a = -0.4; a <= 0.4; a += 0.2) {
        spawnEnemyBullet(this.x, this.y, angle + a);
      }
    } else {
      spawnEnemyBullet(this.x, this.y, angle);
    }
  }

  /** ダメージを受ける。倒れたら true */
  takeDamage(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) { this.dead = true; return true; }
    return false;
  }

  draw(ctx) {
    ctx.font = `${this.size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.icon, this.x, this.y);
    // ボスはHPバー表示
    if (this.boss) {
      const w = 120, h = 6, x = this.x - w / 2, y = this.y - this.size / 2 - 12;
      ctx.fillStyle = '#552';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#f44';
      ctx.fillRect(x, y, w * (this.hp / this.maxHp), h);
    }
  }
}

// ---- 武器ドロップアイテム ----
class Drop {
  constructor(weaponKey, x, y) {
    this.weaponKey = weaponKey;
    this.weapon = WEAPONS[weaponKey];
    this.x = x;
    this.y = y;
    this.size = 26;
    this.dead = false;
  }

  update() {
    this.y += 1.6; // ゆっくり落下
    if (this.y > CONFIG.height + this.size) this.dead = true;
  }

  draw(ctx) {
    // 光る枠付きでアイコン表示
    ctx.strokeStyle = this.weapon.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.weapon.icon, this.x, this.y);
  }
}

// ---- 爆発エフェクト ----
class Explosion {
  constructor(x, y, maxRadius = 24) {
    this.x = x;
    this.y = y;
    this.radius = 4;
    this.maxRadius = maxRadius;
    this.dead = false;
    this.damageRadius = maxRadius; // 天ぷら爆弾の範囲ダメージ用
    this.hasDamaged = false;       // 範囲ダメージは1回だけ
  }

  update() {
    this.radius += (this.maxRadius - this.radius) * 0.3 + 1;
    if (this.radius >= this.maxRadius - 1) this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#ffcc33';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
