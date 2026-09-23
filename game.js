(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Setup & constants
  // ---------------------------------------------------------------------------

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const SCALE = 3;           // size of one sprite "pixel" in canvas pixels
  const STEP = 1 / 60;       // fixed simulation timestep (seconds)

  const HUD_TOP = 64;
  const GROUND_Y = H - 56;
  const UFO_Y = 76;
  const FORMATION_TOP = 120;
  const COLS = 11;
  const ROWS = 5;
  const CELL_W = 48;
  const ROW_H = 42;
  const EDGE_MARGIN = 12;
  const ALIEN_DX = 8;
  const ALIEN_DROP = 18;

  const PLAYER_SPEED = 220;
  const PLAYER_BULLET_SPEED = 520;
  const ALIEN_BULLET_SPEED = 230;
  const UFO_SPEED = 110;
  const EXTRA_LIFE_SCORE = 1500;
  const HI_SCORE_KEY = 'galaxia.hiScore';

  const COLORS = {
    squid: '#ff6bff',
    crab: '#5ff',
    octopus: '#6f6',
    player: '#6f6',
    shield: '#6f6',
    ufo: '#ff4040',
    bullet: '#fff',
    alienBullet: '#fff',
    text: '#fff',
    dim: '#8a8a8a',
    accent: '#6f6',
  };

  // ---------------------------------------------------------------------------
  // Sprites (bitmaps rendered once to offscreen canvases)
  // ---------------------------------------------------------------------------

  const BITMAPS = {
    squid: [
      [
        '...##...',
        '..####..',
        '.######.',
        '##.##.##',
        '########',
        '..#..#..',
        '.#.##.#.',
        '#.#..#.#',
      ],
      [
        '...##...',
        '..####..',
        '.######.',
        '##.##.##',
        '########',
        '.#.##.#.',
        '#......#',
        '.#....#.',
      ],
    ],
    crab: [
      [
        '..#.....#..',
        '...#...#...',
        '..#######..',
        '.##.###.##.',
        '###########',
        '#.#######.#',
        '#.#.....#.#',
        '...##.##...',
      ],
      [
        '..#.....#..',
        '#..#...#..#',
        '#.#######.#',
        '###.###.###',
        '###########',
        '.#########.',
        '..#.....#..',
        '.#.......#.',
      ],
    ],
    octopus: [
      [
        '....####....',
        '.##########.',
        '############',
        '###..##..###',
        '############',
        '...##..##...',
        '..##.##.##..',
        '##........##',
      ],
      [
        '....####....',
        '.##########.',
        '############',
        '###..##..###',
        '############',
        '..###..###..',
        '.##..##..##.',
        '..##....##..',
      ],
    ],
    player: [
      '......#......',
      '.....###.....',
      '.....###.....',
      '.###########.',
      '#############',
      '#############',
      '#############',
      '#############',
    ],
    playerBoom: [
      [
        '......#......',
        '..#.......#..',
        '...#.#.#.#...',
        '#..........#.',
        '...#####.#...',
        '.###########.',
        '#############',
        '#############',
      ],
      [
        '#.....#....#.',
        '...#......#..',
        '.....#.#.....',
        '..#.......#..',
        '....###..#...',
        '..#########..',
        '.###########.',
        '#############',
      ],
    ],
    ufo: [
      '.....######.....',
      '...##########...',
      '..############..',
      '.##.##.##.##.##.',
      '################',
      '..###..##..###..',
      '...#........#...',
    ],
    alienBoom: [
      '.#..#...#..#.',
      '..#..#.#..#..',
      '...#.....#...',
      '##.........##',
      '...#.....#...',
      '..#..#.#..#..',
      '.#..#...#..#.',
    ],
    shotBoom: [
      '#...#...',
      '..#...#.',
      '.######.',
      '########',
      '.######.',
      '..#..#..',
      '#...#..#',
    ],
    alienShots: [
      [
        ['.#.', '#..', '.#.', '..#', '.#.', '#..', '.#.'],
        ['.#.', '..#', '.#.', '#..', '.#.', '..#', '.#.'],
      ],
      [
        ['.#.', '.#.', '.#.', '.#.', '.#.', '###', '.#.'],
        ['.#.', '###', '.#.', '.#.', '.#.', '.#.', '.#.'],
      ],
      [
        ['.#.', '.#.', '.##', '.#.', '##.', '.#.', '.#.'],
        ['.#.', '.#.', '##.', '.#.', '.##', '.#.', '.#.'],
      ],
    ],
  };

  function makeSprite(rows, color, scale = SCALE) {
    const c = document.createElement('canvas');
    c.width = rows[0].length * scale;
    c.height = rows.length * scale;
    const g = c.getContext('2d');
    g.fillStyle = color;
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '#') g.fillRect(x * scale, y * scale, scale, scale);
      }
    });
    return c;
  }

  const SPRITES = {
    squid: BITMAPS.squid.map((f) => makeSprite(f, COLORS.squid)),
    crab: BITMAPS.crab.map((f) => makeSprite(f, COLORS.crab)),
    octopus: BITMAPS.octopus.map((f) => makeSprite(f, COLORS.octopus)),
    player: makeSprite(BITMAPS.player, COLORS.player),
    playerSmall: makeSprite(BITMAPS.player, COLORS.player, 2),
    playerBoom: BITMAPS.playerBoom.map((f) => makeSprite(f, COLORS.player)),
    ufo: makeSprite(BITMAPS.ufo, COLORS.ufo),
    alienBoom: makeSprite(BITMAPS.alienBoom, '#fff'),
    shotBoomWhite: makeSprite(BITMAPS.shotBoom, '#fff', 2),
    shotBoomRed: makeSprite(BITMAPS.shotBoom, COLORS.ufo, 2),
    alienShots: BITMAPS.alienShots.map((kind) => kind.map((f) => makeSprite(f, COLORS.alienBullet))),
  };

  const ALIEN_TYPES = {
    squid: { points: 30, w: SPRITES.squid[0].width, h: SPRITES.squid[0].height },
    crab: { points: 20, w: SPRITES.crab[0].width, h: SPRITES.crab[0].height },
    octopus: { points: 10, w: SPRITES.octopus[0].width, h: SPRITES.octopus[0].height },
  };
  const ROW_TYPES = ['squid', 'crab', 'crab', 'octopus', 'octopus'];

  // Classic mystery-ship score table, indexed by the number of shots fired.
  const UFO_POINTS = [100, 50, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 100];

  // ---------------------------------------------------------------------------
  // Keyboard input
  // ---------------------------------------------------------------------------

  const GAME_KEYS = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Space', 'Enter', 'Escape', 'KeyA', 'KeyD', 'KeyP', 'KeyM',
  ]);

  const input = {
    held: new Set(),     // keys currently held down
    pressed: new Set(),  // keys pressed since the last simulation tick (edge-triggered)

    isDown(...codes) {
      return codes.some((c) => this.held.has(c));
    },
    wasPressed(...codes) {
      return codes.some((c) => this.pressed.has(c));
    },
    endTick() {
      this.pressed.clear();
    },
    reset() {
      this.held.clear();
      this.pressed.clear();
    },
  };

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!e.repeat) input.pressed.add(e.code);
    input.held.add(e.code);
    audio.unlock();
  });

  window.addEventListener('keyup', (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    input.held.delete(e.code);
  });

  // Losing focus means we never see the keyup events, so drop all held keys
  // and pause rather than letting the ship drift off on its own.
  window.addEventListener('blur', () => {
    input.reset();
    if (state === 'playing') state = 'paused';
  });

  canvas.addEventListener('pointerdown', () => {
    canvas.focus();
    audio.unlock();
  });

  // ---------------------------------------------------------------------------
  // Audio (tiny WebAudio synth; starts after the first key press)
  // ---------------------------------------------------------------------------

  const audio = {
    ctx: null,
    muted: false,
    marchNote: 0,
    noiseBuffer: null,

    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try {
          this.ctx = new AC();
        } catch (err) {
          return;
        }
        const len = this.ctx.sampleRate;
        this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    tone(freq, dur, { type = 'square', vol = 0.08, to = null } = {}) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    },

    noise(dur, vol = 0.15) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      src.buffer = this.noiseBuffer;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(gain).connect(this.ctx.destination);
      src.start(t);
      src.stop(t + dur);
    },

    shoot() { this.tone(1400, 0.12, { to: 300, vol: 0.04 }); },
    alienHit() {
      this.noise(0.15, 0.12);
      this.tone(500, 0.12, { type: 'sawtooth', to: 60, vol: 0.05 });
    },
    playerHit() { this.noise(0.9, 0.25); },
    ufoHit() { this.tone(1200, 0.5, { type: 'sawtooth', to: 100, vol: 0.06 }); },
    ufoHum() { this.tone(620, 0.09, { type: 'sawtooth', to: 480, vol: 0.025 }); },
    extraLife() {
      [660, 880, 1320].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, { vol: 0.05 }), i * 90));
    },
    march() {
      const notes = [98, 87, 78, 73];
      this.tone(notes[this.marchNote++ % notes.length], 0.09, { vol: 0.14 });
    },
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const rand = (min, max) => min + Math.random() * (max - min);
  const overlaps = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function loadHiScore() {
    try {
      return parseInt(localStorage.getItem(HI_SCORE_KEY), 10) || 0;
    } catch (err) {
      return 0;
    }
  }

  function saveHiScore(value) {
    try {
      localStorage.setItem(HI_SCORE_KEY, String(value));
    } catch (err) {
      // Storage unavailable (private mode etc.) — high score just won't persist.
    }
  }

  // ---------------------------------------------------------------------------
  // Shields: destructible grids of 3x3 cells
  // ---------------------------------------------------------------------------

  class Shield {
    constructor(cx, y) {
      this.cols = 22;
      this.rows = 16;
      this.w = this.cols * SCALE;
      this.h = this.rows * SCALE;
      this.x = Math.round(cx - this.w / 2);
      this.y = y;
      this.cells = new Uint8Array(this.cols * this.rows);
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const cut = 4 - r; // bevelled top corners
          const topCorner = r < 4 && (c < cut || c > this.cols - 1 - cut);
          const arch = (r === 11 && c >= 7 && c <= 14) || (r >= 12 && c >= 6 && c <= 15);
          this.cells[r * this.cols + c] = topCorner || arch ? 0 : 1;
        }
      }
    }

    cellRange(rect) {
      return {
        c0: Math.max(0, Math.floor((rect.x - this.x) / SCALE)),
        c1: Math.min(this.cols - 1, Math.floor((rect.x + rect.w - 1 - this.x) / SCALE)),
        r0: Math.max(0, Math.floor((rect.y - this.y) / SCALE)),
        r1: Math.min(this.rows - 1, Math.floor((rect.y + rect.h - 1 - this.y) / SCALE)),
      };
    }

    // Returns the first solid cell touched by rect, scanning from the side the
    // projectile is travelling from, or null if nothing was hit.
    hitTest(rect, fromBelow) {
      if (!overlaps(rect, this)) return null;
      const { c0, c1, r0, r1 } = this.cellRange(rect);
      const step = fromBelow ? -1 : 1;
      for (let r = fromBelow ? r1 : r0; fromBelow ? r >= r0 : r <= r1; r += step) {
        for (let c = c0; c <= c1; c++) {
          if (this.cells[r * this.cols + c]) return { c, r };
        }
      }
      return null;
    }

    blast(c, r, radius) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const cc = c + dx;
          const rr = r + dy;
          if (cc < 0 || rr < 0 || cc >= this.cols || rr >= this.rows) continue;
          const d2 = dx * dx + dy * dy;
          if (d2 <= radius * radius && (d2 <= 1 || Math.random() < 0.65)) {
            this.cells[rr * this.cols + cc] = 0;
          }
        }
      }
    }

    erase(rect) {
      if (!overlaps(rect, this)) return;
      const { c0, c1, r0, r1 } = this.cellRange(rect);
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) this.cells[r * this.cols + c] = 0;
      }
    }

    draw(g) {
      g.fillStyle = COLORS.shield;
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.cells[r * this.cols + c]) {
            g.fillRect(this.x + c * SCALE, this.y + r * SCALE, SCALE, SCALE);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Game state
  // ---------------------------------------------------------------------------

  let state = 'title'; // title | playing | paused | dying | levelClear | gameover
  let stateTimer = 0;
  let clock = 0;

  let score = 0;
  let hiScore = loadHiScore();
  let lives = 3;
  let level = 1;
  let extraLifeAwarded = false;
  let shotsFired = 0;

  let player;
  let playerBullet;
  let alienBullets;
  let aliens;
  let formation;
  let shields;
  let ufo;
  let ufoTimer;
  let alienFireTimer;
  let effects;
  let gameOverByInvasion = false;

  function newGame() {
    score = 0;
    lives = 3;
    level = 1;
    extraLifeAwarded = false;
    gameOverByInvasion = false;
    startLevel();
  }

  function startLevel() {
    aliens = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        aliens.push({ row, col, type: ROW_TYPES[row], alive: true });
      }
    }
    formation = {
      x: (W - COLS * CELL_W) / 2,
      y: FORMATION_TOP + Math.min(level - 1, 6) * ALIEN_DROP,
      dir: 1,
      frame: 0,
      timer: 0.6,
    };
    shields = [1, 2, 3, 4].map((i) => new Shield((W * i) / 5, GROUND_Y - 160));
    shotsFired = 0;
    ufo = null;
    ufoTimer = rand(15, 25);
    effects = [];
    resetPlayer();
    state = 'playing';
    stateTimer = 0;
  }

  function resetPlayer() {
    const w = SPRITES.player.width;
    const h = SPRITES.player.height;
    player = { x: (W - w) / 2, y: GROUND_Y - h - 16, w, h };
    playerBullet = null;
    alienBullets = [];
    alienFireTimer = 1.2;
  }

  function aliveAliens() {
    return aliens.filter((a) => a.alive);
  }

  function alienRect(a) {
    const t = ALIEN_TYPES[a.type];
    return {
      x: formation.x + a.col * CELL_W + (CELL_W - t.w) / 2,
      y: formation.y + a.row * ROW_H,
      w: t.w,
      h: t.h,
    };
  }

  function addScore(points) {
    score += points;
    if (!extraLifeAwarded && score >= EXTRA_LIFE_SCORE) {
      extraLifeAwarded = true;
      lives++;
      audio.extraLife();
    }
    if (score > hiScore) hiScore = score;
  }

  function addEffect(sprite, x, y, duration, extra = {}) {
    effects.push({ sprite, x, y, timer: duration, ...extra });
  }

  function killPlayer(invasion = false) {
    gameOverByInvasion = invasion;
    if (invasion) lives = 1; // this death ends the game
    state = 'dying';
    stateTimer = 1.6;
    playerBullet = null;
    audio.playerHit();
  }

  function endGame() {
    state = 'gameover';
    stateTimer = 0;
    saveHiScore(hiScore);
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  function stepInterval(alive) {
    const levelFactor = Math.max(0.55, 1 - 0.07 * (level - 1));
    return Math.max(STEP, (0.04 + 0.72 * (alive / (ROWS * COLS))) * levelFactor);
  }

  function update(dt) {
    clock += dt;

    if (input.wasPressed('KeyM')) audio.muted = !audio.muted;

    switch (state) {
      case 'title':
        if (input.wasPressed('Enter', 'Space')) newGame();
        break;

      case 'gameover':
        stateTimer += dt;
        if (stateTimer > 1 && input.wasPressed('Enter')) newGame();
        break;

      case 'paused':
        if (input.wasPressed('KeyP', 'Escape', 'Enter')) state = 'playing';
        break;

      case 'playing':
        if (input.wasPressed('KeyP', 'Escape')) {
          state = 'paused';
          break;
        }
        updatePlayer(dt);
        updateFormation(dt);
        updateAlienFire(dt);
        updateUfo(dt);
        updateBullets(dt);
        updateEffects(dt);
        if (state === 'playing' && aliveAliens().length === 0) {
          state = 'levelClear';
          stateTimer = 2;
        }
        break;

      case 'dying':
        updateEffects(dt);
        stateTimer -= dt;
        if (stateTimer <= 0) {
          lives--;
          if (lives <= 0) {
            endGame();
          } else {
            resetPlayer();
            state = 'playing';
          }
        }
        break;

      case 'levelClear':
        updateEffects(dt);
        stateTimer -= dt;
        if (stateTimer <= 0) {
          level++;
          startLevel();
        }
        break;
    }
  }

  function updatePlayer(dt) {
    let dir = 0;
    if (input.isDown('ArrowLeft', 'KeyA')) dir -= 1;
    if (input.isDown('ArrowRight', 'KeyD')) dir += 1;
    player.x += dir * PLAYER_SPEED * dt;
    player.x = Math.max(EDGE_MARGIN, Math.min(W - EDGE_MARGIN - player.w, player.x));

    // Classic rules: only one player shot on screen at a time. Holding fire
    // re-fires as soon as the previous shot is gone.
    if (!playerBullet && input.isDown('Space', 'ArrowUp')) {
      playerBullet = { x: player.x + player.w / 2 - 1.5, y: player.y - 12, w: 3, h: 12 };
      shotsFired++;
      audio.shoot();
    }
  }

  function updateFormation(dt) {
    const alive = aliveAliens();
    if (alive.length === 0) return;

    formation.timer -= dt;
    if (formation.timer > 0) return;
    formation.timer = stepInterval(alive.length);

    let minX = Infinity;
    let maxX = -Infinity;
    for (const a of alive) {
      const r = alienRect(a);
      minX = Math.min(minX, r.x);
      maxX = Math.max(maxX, r.x + r.w);
    }

    const dx = ALIEN_DX * formation.dir;
    if (maxX + dx > W - EDGE_MARGIN || minX + dx < EDGE_MARGIN) {
      formation.y += ALIEN_DROP;
      formation.dir *= -1;
    } else {
      formation.x += dx;
    }
    formation.frame ^= 1;
    audio.march();

    for (const a of alive) {
      const r = alienRect(a);
      for (const s of shields) s.erase(r);
      if (r.y + r.h >= player.y) {
        killPlayer(true);
        return;
      }
    }
  }

  function updateAlienFire(dt) {
    alienFireTimer -= dt;
    const maxShots = Math.min(3 + Math.floor((level - 1) / 2), 6);
    if (alienFireTimer > 0 || alienBullets.length >= maxShots) return;

    const levelFactor = Math.max(0.4, 1 - 0.08 * (level - 1));
    alienFireTimer = rand(0.35, 1.1) * levelFactor;

    // Only the lowest alien in each column can shoot.
    const bottom = new Map();
    for (const a of aliens) {
      if (!a.alive) continue;
      const cur = bottom.get(a.col);
      if (!cur || a.row > cur.row) bottom.set(a.col, a);
    }
    const shooters = [...bottom.values()];
    if (shooters.length === 0) return;

    let shooter;
    if (Math.random() < 0.4) {
      // Aim: pick the shooter closest to the player horizontally.
      const px = player.x + player.w / 2;
      shooter = shooters.reduce((best, a) => {
        const r = alienRect(a);
        const d = Math.abs(r.x + r.w / 2 - px);
        return !best || d < best.d ? { a, d } : best;
      }, null).a;
    } else {
      shooter = shooters[Math.floor(Math.random() * shooters.length)];
    }

    const r = alienRect(shooter);
    const kind = Math.floor(Math.random() * SPRITES.alienShots.length);
    const sprite = SPRITES.alienShots[kind][0];
    alienBullets.push({
      x: r.x + r.w / 2 - sprite.width / 2,
      y: r.y + r.h,
      w: sprite.width,
      h: sprite.height,
      vy: ALIEN_BULLET_SPEED * (1 + 0.06 * Math.min(level - 1, 8)),
      kind,
      anim: 0,
    });
  }

  function updateUfo(dt) {
    if (ufo) {
      ufo.x += ufo.dir * UFO_SPEED * dt;
      ufo.hum -= dt;
      if (ufo.hum <= 0) {
        ufo.hum = 0.18;
        audio.ufoHum();
      }
      if (ufo.x > W || ufo.x + ufo.w < 0) ufo = null;
      return;
    }
    ufoTimer -= dt;
    if (ufoTimer <= 0 && aliveAliens().length >= 8) {
      const dir = shotsFired % 2 === 0 ? 1 : -1;
      const w = SPRITES.ufo.width;
      ufo = { x: dir > 0 ? -w : W, y: UFO_Y, w, h: SPRITES.ufo.height, dir, hum: 0 };
      ufoTimer = rand(18, 28);
    }
  }

  function updateBullets(dt) {
    // Player shot
    if (playerBullet) {
      const b = playerBullet;
      b.y -= PLAYER_BULLET_SPEED * dt;
      if (b.y <= HUD_TOP) {
        addEffect(SPRITES.shotBoomRed, b.x - 7, HUD_TOP, 0.25);
        playerBullet = null;
      } else if (hitShields(b, true)) {
        playerBullet = null;
      } else if (ufo && overlaps(b, ufo)) {
        const points = UFO_POINTS[shotsFired % UFO_POINTS.length];
        addScore(points);
        addEffect(null, ufo.x + ufo.w / 2, ufo.y + ufo.h / 2, 1.2, { text: String(points), color: COLORS.ufo });
        audio.ufoHit();
        ufo = null;
        playerBullet = null;
      } else {
        for (const a of aliens) {
          if (!a.alive) continue;
          const r = alienRect(a);
          if (overlaps(b, r)) {
            a.alive = false;
            addScore(ALIEN_TYPES[a.type].points);
            addEffect(SPRITES.alienBoom, r.x + r.w / 2 - SPRITES.alienBoom.width / 2, r.y, 0.25);
            audio.alienHit();
            playerBullet = null;
            break;
          }
        }
      }
    }

    // Alien shots
    for (let i = alienBullets.length - 1; i >= 0; i--) {
      const b = alienBullets[i];
      b.y += b.vy * dt;
      b.anim += dt;
      const hitbox = { x: b.x + 2, y: b.y, w: b.w - 4, h: b.h };
      let remove = false;

      if (b.y + b.h >= GROUND_Y) {
        addEffect(SPRITES.shotBoomWhite, b.x + b.w / 2 - 8, GROUND_Y - 14, 0.25);
        remove = true;
      } else if (hitShields(hitbox, false)) {
        remove = true;
      } else if (playerBullet && overlaps(hitbox, playerBullet)) {
        addEffect(SPRITES.shotBoomWhite, b.x + b.w / 2 - 8, b.y + b.h / 2, 0.2);
        playerBullet = null;
        remove = true;
      } else if (state === 'playing' && overlaps(hitbox, player)) {
        remove = true;
        killPlayer();
      }

      if (remove) alienBullets.splice(i, 1);
    }
  }

  function hitShields(rect, fromBelow) {
    for (const s of shields) {
      const hit = s.hitTest(rect, fromBelow);
      if (hit) {
        s.blast(hit.c, hit.r, fromBelow ? 2 : 3);
        return true;
      }
    }
    return false;
  }

  function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i--) {
      effects[i].timer -= dt;
      if (effects[i].text) effects[i].y -= 12 * dt;
      if (effects[i].timer <= 0) effects.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function text(str, x, y, { size = 22, color = COLORS.text, align = 'left' } = {}) {
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  const pad = (n) => String(n).padStart(5, '0');

  function drawHud() {
    text('SCORE', 24, 20, { color: COLORS.dim, size: 18 });
    text(pad(score), 24, 44);
    text('HI-SCORE', W / 2, 20, { color: COLORS.dim, size: 18, align: 'center' });
    text(pad(hiScore), W / 2, 44, { align: 'center' });
    text('LEVEL', W - 24, 20, { color: COLORS.dim, size: 18, align: 'right' });
    text(String(level), W - 24, 44, { align: 'right' });

    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(0, GROUND_Y, W, 3);

    text(String(Math.max(lives, 0)), 24, GROUND_Y + 28);
    const icon = SPRITES.playerSmall;
    for (let i = 0; i < Math.min(lives - 1, 6); i++) {
      ctx.drawImage(icon, 52 + i * (icon.width + 10), GROUND_Y + 28 - icon.height / 2);
    }
    if (audio.muted) text('MUTED', W - 24, GROUND_Y + 28, { color: COLORS.dim, size: 16, align: 'right' });
  }

  function drawPlayfield() {
    for (const s of shields) s.draw(ctx);

    for (const a of aliens) {
      if (!a.alive) continue;
      const r = alienRect(a);
      ctx.drawImage(SPRITES[a.type][formation.frame], Math.round(r.x), Math.round(r.y));
    }

    if (ufo) ctx.drawImage(SPRITES.ufo, Math.round(ufo.x), ufo.y);

    if (state === 'dying') {
      const frame = Math.floor(clock * 10) % 2;
      ctx.drawImage(SPRITES.playerBoom[frame], Math.round(player.x), player.y);
    } else if (state !== 'gameover') {
      ctx.drawImage(SPRITES.player, Math.round(player.x), player.y);
    }

    if (playerBullet) {
      ctx.fillStyle = COLORS.bullet;
      ctx.fillRect(Math.round(playerBullet.x), Math.round(playerBullet.y), playerBullet.w, playerBullet.h);
    }

    for (const b of alienBullets) {
      const frame = Math.floor(b.anim * 12) % 2;
      ctx.drawImage(SPRITES.alienShots[b.kind][frame], Math.round(b.x), Math.round(b.y));
    }

    for (const e of effects) {
      if (e.text) text(e.text, e.x, e.y, { color: e.color, align: 'center' });
      else ctx.drawImage(e.sprite, Math.round(e.x), Math.round(e.y));
    }
  }

  function overlay(alpha = 0.6) {
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, HUD_TOP, W, GROUND_Y - HUD_TOP);
  }

  const blink = () => Math.floor(clock * 2) % 2 === 0;

  function drawTitle() {
    text('GALAXIA', W / 2, 170, { size: 64, color: COLORS.accent, align: 'center' });
    text('SPACE INVADERS', W / 2, 225, { size: 24, align: 'center' });

    text('*SCORE ADVANCE TABLE*', W / 2, 320, { size: 20, color: COLORS.dim, align: 'center' });
    const rows = [
      [SPRITES.ufo, '= ? MYSTERY'],
      [SPRITES.squid[0], '= 30 POINTS'],
      [SPRITES.crab[0], '= 20 POINTS'],
      [SPRITES.octopus[0], '= 10 POINTS'],
    ];
    rows.forEach(([sprite, label], i) => {
      const y = 370 + i * 48;
      ctx.drawImage(sprite, W / 2 - 110 - sprite.width / 2, y - sprite.height / 2);
      text(label, W / 2 - 60, y, { size: 22 });
    });

    if (blink()) text('PRESS ENTER TO START', W / 2, 600, { size: 24, color: COLORS.accent, align: 'center' });
    text('ARROWS / A D  MOVE     SPACE  FIRE', W / 2, 650, { size: 16, color: COLORS.dim, align: 'center' });
    text('P  PAUSE     M  MUTE', W / 2, 676, { size: 16, color: COLORS.dim, align: 'center' });
  }

  function render() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    drawHud();

    if (state === 'title') {
      drawTitle();
      return;
    }

    drawPlayfield();

    if (state === 'paused') {
      overlay();
      text('PAUSED', W / 2, H / 2 - 20, { size: 44, align: 'center' });
      text('PRESS P TO RESUME', W / 2, H / 2 + 30, { size: 20, color: COLORS.dim, align: 'center' });
    } else if (state === 'levelClear') {
      text(`LEVEL ${level} CLEARED`, W / 2, H / 2 - 20, { size: 36, color: COLORS.accent, align: 'center' });
      text('GET READY', W / 2, H / 2 + 26, { size: 20, align: 'center' });
    } else if (state === 'gameover') {
      overlay(0.7);
      text('GAME OVER', W / 2, H / 2 - 40, { size: 52, color: COLORS.ufo, align: 'center' });
      if (gameOverByInvasion) text('THE INVADERS HAVE LANDED', W / 2, H / 2 + 10, { size: 20, align: 'center' });
      if (stateTimer > 1 && blink()) {
        text('PRESS ENTER TO PLAY AGAIN', W / 2, H / 2 + 60, { size: 22, color: COLORS.accent, align: 'center' });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Main loop (fixed timestep simulation, render once per animation frame)
  // ---------------------------------------------------------------------------

  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    accumulator += Math.min(0.25, (now - last) / 1000);
    last = now;
    while (accumulator >= STEP) {
      update(STEP);
      input.endTick();
      accumulator -= STEP;
    }
    render();
    requestAnimationFrame(frame);
  }

  canvas.focus();
  requestAnimationFrame(frame);
})();
