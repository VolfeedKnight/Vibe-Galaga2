import { WORLD, STORAGE_KEY, enemyDefs, powerupDefs } from "./config.js";
import { createAudioController } from "./audio.js";

const audio = createAudioController();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const livesEl = document.getElementById("lives");
const stageEl = document.getElementById("stage");
const waveEl = document.getElementById("wave");
const comboEl = document.getElementById("combo");
const powerEl = document.getElementById("power");
const overlay = document.getElementById("overlay");
const stateLabel = document.getElementById("stateLabel");
const stateTitle = document.getElementById("stateTitle");
const stateText = document.getElementById("stateText");
const startButton = document.getElementById("startButton");
const touchButtons = [...document.querySelectorAll(".touch-btn")];

const keys = new Set();
const bullets = [];
const enemyBullets = [];
const enemies = [];
const particles = [];
const powerups = [];
const stars = [];
const nebulae = [];
const planets = [];
const activeTouches = {
  left: false,
  right: false,
  shoot: false,
};

const player = {
  x: WORLD.width / 2,
  y: WORLD.height - 96,
  width: 54,
  height: 62,
  speed: 510,
  lives: 3,
  invincible: 0,
  shotCooldown: 0,
  roll: 0,
};

let state = "ready";
let score = 0;
let bestScore = readBestScore();
let stage = 1;
let wave = 1;
let lastTime = 0;
let formationDirection = 1;
let formationDrop = 0;
let waveClearTimer = 0;
let bannerText = "";
let bannerTimer = 0;
let bannerColor = "#f8fafc";
let screenShake = 0;
let hitFlash = 0;
let comboChain = 0;
let comboTimer = 0;
let comboMultiplier = 1;
let scoreBoostTimer = 0;
let rapidTimer = 0;
let spreadTimer = 0;
let shieldTimer = 0;
let powerName = "None";

function ensureAudio() {
  return audio.ensure();
}

function playEffect(kind) {
  audio.playEffect(kind);
}

function updateMusic(dt) {
  audio.updateMusic(dt, state === "running");
}

function readBestScore() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? Number(value) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveBestScore() {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(bestScore));
  } catch {
    // No-op.
  }
}

function createStars() {
  stars.length = 0;
  for (let i = 0; i < 120; i += 1) {
    stars.push({
      x: Math.random() * WORLD.width,
      y: Math.random() * WORLD.height,
      size: Math.random() * 2.2 + 0.4,
      speed: Math.random() * 40 + 18,
      alpha: Math.random() * 0.55 + 0.25,
    });
  }
}

function createBackdrop() {
  nebulae.length = 0;
  planets.length = 0;

  const nebulaPalette = [
    "rgba(40, 215, 255, 0.14)",
    "rgba(94, 230, 168, 0.12)",
    "rgba(251, 113, 133, 0.12)",
    "rgba(247, 201, 72, 0.09)",
  ];

  for (let i = 0; i < 7; i += 1) {
    nebulae.push({
      x: Math.random() * WORLD.width,
      y: Math.random() * WORLD.height * 0.78,
      radiusX: 90 + Math.random() * 140,
      radiusY: 55 + Math.random() * 110,
      color: nebulaPalette[i % nebulaPalette.length],
      drift: 0.25 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
    });
  }

  for (let i = 0; i < 3; i += 1) {
    planets.push({
      x: 120 + i * 250 + Math.random() * 70,
      y: 120 + i * 105 + Math.random() * 45,
      radius: 28 + i * 14 + Math.random() * 10,
      base: i === 0 ? "#2f4d8f" : i === 1 ? "#5c2f7a" : "#8c4f2d",
      glow:
        i === 0
          ? "rgba(40, 215, 255, 0.35)"
          : i === 1
            ? "rgba(251, 113, 133, 0.28)"
            : "rgba(247, 201, 72, 0.24)",
      ring: i === 2,
    });
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getStageForWave(currentWave) {
  if (currentWave <= 4) {
    return 1;
  }

  if (currentWave <= 8) {
    return 2;
  }

  return 3;
}

function getStageName(currentStage) {
  return `Stage ${currentStage}`;
}

function getStageProfile(currentWave) {
  const currentStage = getStageForWave(currentWave);

  if (currentStage === 1) {
    return {
      stage: currentStage,
      bannerColor: "#28d7ff",
      columnsBase: 6,
      columnsGrowth: 0.55,
      maxColumns: 9,
      rowsBase: 3,
      rowsGrowth: 0.4,
      maxRows: 4,
      rowTypes: ["scout", "fighter", "splitter", "fighter"],
      speedBonus: 0,
      diveChance: 1,
      diveSpeedBonus: 0,
      diveFallBonus: 0,
      fireRateBonus: 1,
      bossEscortBonus: 0,
      bossFireBonus: 0,
    };
  }

  if (currentStage === 2) {
    return {
      stage: currentStage,
      bannerColor: "#f7c948",
      columnsBase: 7,
      columnsGrowth: 0.6,
      maxColumns: 10,
      rowsBase: 3,
      rowsGrowth: 0.45,
      maxRows: 5,
      rowTypes: ["fighter", "splitter", "sniper", "tank", "fighter"],
      speedBonus: 4,
      diveChance: 1.15,
      diveSpeedBonus: 0.08,
      diveFallBonus: 0.08,
      fireRateBonus: 1.08,
      bossEscortBonus: 1,
      bossFireBonus: 20,
    };
  }

  return {
    stage: currentStage,
    bannerColor: "#fb7185",
    columnsBase: 7,
    columnsGrowth: 0.7,
    maxColumns: 10,
    rowsBase: 4,
    rowsGrowth: 0.5,
    maxRows: 5,
    rowTypes: ["tank", "sniper", "splitter", "fighter", "tank"],
    speedBonus: 8,
    diveChance: 1.35,
    diveSpeedBonus: 0.16,
    diveFallBonus: 0.14,
    fireRateBonus: 1.18,
    bossEscortBonus: 2,
    bossFireBonus: 40,
  };
}

function rectsOverlap(a, b) {
  return (
    a.x - a.width / 2 < b.x + b.width / 2 &&
    a.x + a.width / 2 > b.x - b.width / 2 &&
    a.y - a.height / 2 < b.y + b.height / 2 &&
    a.y + a.height / 2 > b.y - b.height / 2
  );
}

function updateHud() {
  scoreEl.textContent = score.toString();
  bestScoreEl.textContent = bestScore.toString();
  livesEl.textContent = player.lives.toString();
  stageEl.textContent = stage.toString();
  waveEl.textContent = wave.toString();
  comboEl.textContent = `x${comboMultiplier}`;
  powerEl.textContent = powerName;
}

function setBestScore(value) {
  if (value <= bestScore) {
    return;
  }

  bestScore = value;
  saveBestScore();
}

function setBanner(text, color = "#f8fafc", duration = 1.2) {
  bannerText = text;
  bannerColor = color;
  bannerTimer = duration;
}

function resetPlayer() {
  player.x = WORLD.width / 2;
  player.y = WORLD.height - 96;
  player.lives = 3;
  player.invincible = 1.4;
  player.shotCooldown = 0;
  player.roll = 0;
}

function resetTimers() {
  comboChain = 0;
  comboTimer = 0;
  comboMultiplier = 1;
  scoreBoostTimer = 0;
  rapidTimer = 0;
  spreadTimer = 0;
  shieldTimer = 0;
  powerName = "None";
}

function clearEntities() {
  bullets.length = 0;
  enemyBullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  powerups.length = 0;
}

function resetGame() {
  score = 0;
  stage = 1;
  wave = 1;
  waveClearTimer = 0;
  formationDirection = 1;
  formationDrop = 0;
  bannerTimer = 0;
  screenShake = 0;
  hitFlash = 0;
  clearEntities();
  resetTimers();
  resetPlayer();
  activeTouches.left = false;
  activeTouches.right = false;
  activeTouches.shoot = false;
  spawnWave();
  updateHud();
}

function startGame() {
  resetGame();
  state = "running";
  hideOverlay();
  lastTime = performance.now();
  setBanner("Mission start", "#5ee6a8", 1.0);
  try {
    ensureAudio().resume();
  } catch {
    // Audio is optional; the game still starts without it.
  }
}

function hideOverlay() {
  overlay.classList.add("is-hidden");
}

function setOverlay(label, title, text, buttonText = "Start") {
  stateLabel.textContent = label;
  stateTitle.textContent = title;
  stateText.textContent = text;
  startButton.textContent = buttonText;
  overlay.classList.remove("is-hidden");
}

function spawnExplosion(x, y, color, count = 18, spread = 170) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * spread + 50;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 4 + 2,
      life: Math.random() * 0.5 + 0.35,
      maxLife: 0.9,
      color,
    });
  }
}

function addScore(points) {
  const multiplier = comboMultiplier * (scoreBoostTimer > 0 ? 2 : 1);
  score += Math.round(points * multiplier);
  if (score > bestScore) {
    setBestScore(score);
  }
  updateHud();
}

function registerKill(baseScore) {
  comboChain += 1;
  comboTimer = 2.2;
  comboMultiplier = Math.min(5, 1 + Math.floor((comboChain - 1) / 4));
  addScore(baseScore);
  updateHud();
}

function resetCombo() {
  comboChain = 0;
  comboTimer = 0;
  comboMultiplier = 1;
}

function activePowerLabel() {
  if (shieldTimer > 0) {
    return `Shield ${shieldTimer.toFixed(1)}s`;
  }
  if (spreadTimer > 0) {
    return `Spread ${spreadTimer.toFixed(1)}s`;
  }
  if (rapidTimer > 0) {
    return `Rapid ${rapidTimer.toFixed(1)}s`;
  }
  if (scoreBoostTimer > 0) {
    return `Score x2 ${scoreBoostTimer.toFixed(1)}s`;
  }
  return "None";
}

function spawnPlayerBullets() {
  const rapidScale = rapidTimer > 0 ? 0.55 : 1;
  if (player.shotCooldown > 0) {
    return;
  }

  const baseSpeed = 760;
  const y = player.y - player.height * 0.48;

  if (spreadTimer > 0) {
    bullets.push(
      { x: player.x - 18, y, width: 6, height: 22, speed: baseSpeed, vx: -160 },
      { x: player.x, y, width: 6, height: 24, speed: baseSpeed, vx: 0 },
      { x: player.x + 18, y, width: 6, height: 22, speed: baseSpeed, vx: 160 },
    );
    playEffect("shoot");
    player.shotCooldown = 0.18 * rapidScale;
    return;
  }

  bullets.push({
    x: player.x,
    y,
    width: 6,
    height: 24,
    speed: baseSpeed,
    vx: 0,
  });
  playEffect("shoot");
  player.shotCooldown = 0.16 * rapidScale;
}

function applyPowerup(type) {
  if (type === "bomb") {
    const count = enemies.length + enemyBullets.length;
    spawnExplosion(player.x, player.y - 60, "#c084fc", 32, 220);
    enemies.length = 0;
    enemyBullets.length = 0;
    bullets.length = 0;
    addScore(100 + count * 10);
    setBanner("Smart bomb", "#c084fc", 1.0);
    playEffect("bomb");
    return;
  }

  const def = powerupDefs[type];
  if (!def) {
    return;
  }

  switch (type) {
    case "shield":
      shieldTimer = def.duration;
      break;
    case "rapid":
      rapidTimer = def.duration;
      break;
    case "spread":
      spreadTimer = def.duration;
      break;
    case "score":
      scoreBoostTimer = def.duration;
      break;
    default:
      break;
  }

  powerName = activePowerLabel();
  setBanner(def.label, def.color, 1.0);
  playEffect("powerup");
  updateHud();
}

function dropPowerup(enemy) {
  const roll = Math.random();
  const choices = enemy.type === "boss"
    ? ["shield", "rapid", "spread", "score", "bomb"]
    : enemy.type === "tank"
      ? ["shield", "score", "spread", "rapid"]
      : enemy.type === "sniper"
        ? ["rapid", "spread", "score"]
        : ["rapid", "spread", "score", "shield", "bomb"];

  let type = choices[Math.floor(Math.random() * choices.length)];
  if (roll > 0.22 && enemy.type !== "boss") {
    return;
  }

  if (enemy.type === "boss" && Math.random() < 0.5) {
    type = "bomb";
  }

  powerups.push({
    x: enemy.x,
    y: enemy.y,
    width: 28,
    height: 28,
    vy: 120 + wave * 8,
    type,
    pulse: Math.random() * Math.PI * 2,
  });
}

function makeEnemy(type, x, y, column = 0, row = 0) {
  const def = enemyDefs[type];
  return {
    type,
    x,
    y,
    baseX: x,
    baseY: y,
    width: def.width,
    height: def.height,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    score: def.score,
    fireChance: def.fireChance,
    color: def.color,
    column,
    row,
    phase: Math.random() * Math.PI * 2,
    dive: null,
    fireCooldown: Math.random() * 1.5 + 0.4,
    specialTimer: Math.random() * 1.4,
  };
}

function spawnFormationWave() {
  const profile = getStageProfile(wave);
  const columns = Math.min(profile.maxColumns, profile.columnsBase + Math.floor(wave * profile.columnsGrowth));
  const rows = Math.min(profile.maxRows, profile.rowsBase + Math.floor(wave * profile.rowsGrowth));
  const gapX = profile.stage === 3 ? 66 : 70;
  const gapY = profile.stage === 3 ? 56 : 60;
  const startX = (WORLD.width - (columns - 1) * gapX) / 2;
  const startY = 92;
  const rowTypes = profile.rowTypes;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const type = rowTypes[(row + Math.floor(wave / 2)) % rowTypes.length];
      const enemy = makeEnemy(type, startX + col * gapX, startY + row * gapY, col, row);
      enemy.speed += wave * 3 + profile.speedBonus;
      enemies.push(enemy);
    }
  }
}

function spawnBossWave() {
  enemies.push(makeEnemy("boss", WORLD.width / 2, 120, 0, 0));
  const profile = getStageProfile(wave);
  const escorts = 4 + Math.floor(wave / 4) + profile.bossEscortBonus;
  for (let i = 0; i < escorts; i += 1) {
    enemies.push(makeEnemy("fighter", 180 + i * 120, 230 + (i % 2) * 40, i, 1));
  }
}

function spawnWave() {
  const previousStage = stage;
  stage = getStageForWave(wave);
  const profile = getStageProfile(wave);
  enemies.length = 0;
  enemyBullets.length = 0;
  powerups.length = 0;
  waveClearTimer = 0;
  formationDirection = 1;
  formationDrop = 0;

  if (wave % 4 === 0) {
    spawnBossWave();
    setBanner(
      stage !== previousStage ? `${getStageName(stage)} - Boss wave ${wave}` : `Boss wave ${wave}`,
      profile.bannerColor,
      1.4,
    );
    playEffect("boss");
    return;
  }

  spawnFormationWave();
  setBanner(
    stage !== previousStage ? `${getStageName(stage)} - Wave ${wave}` : `Wave ${wave}`,
    profile.bannerColor,
    1.1,
  );
  if (stage !== previousStage) {
    playEffect("powerup");
  }
}

function destroyEnemy(enemy, hitX, hitY, grantPoints = true) {
  const bonus = enemy.type === "boss" ? 260 : enemy.type === "tank" ? 40 : 24;
  spawnExplosion(hitX, hitY, enemy.color, enemy.type === "boss" ? 40 : 18, enemy.type === "boss" ? 240 : 160);
  if (grantPoints) {
    registerKill(enemy.score);
    addScore(bonus);
    dropPowerup(enemy);
  }
  screenShake = Math.max(screenShake, enemy.type === "boss" ? 14 : 5);
  hitFlash = Math.max(hitFlash, enemy.type === "boss" ? 0.28 : 0.14);
  playEffect("explosion");

  if (grantPoints && enemy.type === "splitter" && enemy.type !== "boss") {
    enemies.push(makeEnemy("scout", enemy.x - 18, enemy.y + 10, enemy.column, enemy.row));
    enemies.push(makeEnemy("scout", enemy.x + 18, enemy.y + 10, enemy.column, enemy.row));
  }
}

function damagePlayer() {
  if (shieldTimer > 0 || player.invincible > 0) {
    spawnExplosion(player.x, player.y, "#28d7ff", 12, 120);
    playEffect("hit");
    return;
  }

  player.lives -= 1;
  resetCombo();
  screenShake = Math.max(screenShake, 10);
  hitFlash = Math.max(hitFlash, 0.22);
  player.invincible = 1.5;
  spawnExplosion(player.x, player.y, "#fb7185", 28, 180);
  playEffect("hit");
  updateHud();

  if (player.lives <= 0) {
    gameOver();
  }
}

function gameOver() {
  state = "gameover";
  setBestScore(score);
  updateHud();
  setOverlay(
    "Game Over",
    "Run ended",
    `Final score: ${score}. Best score: ${bestScore}. Press Enter or Restart to try again.`,
    "Restart",
  );
}

function pauseGame() {
  if (state !== "running") {
    return;
  }

  state = "paused";
  setOverlay("Paused", "Paused", "Press P, Enter, or Resume to continue.", "Resume");
}

function resumeGame() {
  if (state !== "paused") {
    return;
  }

  state = "running";
  hideOverlay();
  lastTime = performance.now();
}

function togglePause() {
  if (state === "running") {
    pauseGame();
  } else if (state === "paused") {
    resumeGame();
  }
}

function useControlState() {
  return {
    left: keys.has("ArrowLeft") || keys.has("KeyA") || activeTouches.left,
    right: keys.has("ArrowRight") || keys.has("KeyD") || activeTouches.right,
    shoot: keys.has("Space") || activeTouches.shoot,
  };
}

function updatePlayer(dt) {
  const controls = useControlState();
  let movement = 0;

  if (controls.left) {
    movement -= 1;
  }
  if (controls.right) {
    movement += 1;
  }

  player.x += movement * player.speed * dt;
  player.x = clamp(player.x, 36, WORLD.width - 36);
  player.shotCooldown = Math.max(0, player.shotCooldown - dt);
  player.invincible = Math.max(0, player.invincible - dt);
  player.roll += (movement * 0.08 - player.roll) * Math.min(1, dt * 10);

  if (controls.shoot) {
    spawnPlayerBullets();
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.y -= bullet.speed * dt;
    bullet.x += (bullet.vx || 0) * dt;
    bullet.x = clamp(bullet.x, -40, WORLD.width + 40);
    if (bullet.y < -60) {
      bullets.splice(i, 1);
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
    const bullet = enemyBullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (bullet.y > WORLD.height + 60 || bullet.x < -60 || bullet.x > WORLD.width + 60) {
      enemyBullets.splice(i, 1);
    }
  }
}

function fireEnemyBullet(enemy, mode = "aimed") {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = Math.hypot(dx, dy) || 1;
  const profile = getStageProfile(wave);
  const speed = enemy.type === "boss"
    ? 360 + profile.bossFireBonus
    : 240 + wave * 12 + profile.stage * 10;
  const spread = mode === "spread" ? 120 : 0;

  const shootBullet = (offsetX, offsetY, vx, vy) => {
    enemyBullets.push({
      x: enemy.x + offsetX,
      y: enemy.y + offsetY,
      width: 8,
      height: 18,
      vx,
      vy,
    });
  };

  if (mode === "spread") {
    shootBullet(0, enemy.height * 0.4, -spread * 0.25, speed);
    shootBullet(0, enemy.height * 0.4, 0, speed + 20);
    shootBullet(0, enemy.height * 0.4, spread * 0.25, speed);
    return;
  }

  shootBullet(
    0,
    enemy.height * 0.4,
    (dx / distance) * speed * 0.36,
    (dy / distance) * speed,
  );
}

function updateEnemy(enemy, dt) {
  const profile = getStageProfile(wave);
  enemy.phase += dt * (enemy.type === "sniper" ? 3.2 : 2.2);
  enemy.fireCooldown -= dt;
  enemy.specialTimer -= dt;

  if (enemy.type === "boss") {
    enemy.x += Math.sin(enemy.phase * 0.7) * 78 * dt;
    enemy.x = clamp(enemy.x, 140, WORLD.width - 140);
    enemy.y = 126 + Math.sin(enemy.phase * 0.45) * 12;

    if (enemy.fireCooldown <= 0) {
      fireEnemyBullet(enemy, "spread");
      fireEnemyBullet(enemy, "aimed");
      playEffect("boss");
      enemy.fireCooldown = Math.max(0.45, 1.4 - wave * 0.05 - profile.stage * 0.05);
    }
    return;
  }

  if (!enemy.dive && enemy.type !== "tank" && enemy.type !== "sniper" && Math.random() < 0.0018 * profile.diveChance * wave * dt) {
    enemy.dive = {
      angle: Math.random() * Math.PI * 2,
      turn: Math.random() > 0.5 ? 1 : -1,
    };
  }

  if (enemy.dive) {
    enemy.dive.angle += dt * enemy.dive.turn * 2.6;
    enemy.x += Math.sin(enemy.dive.angle) * (118 + wave * (6 + profile.diveSpeedBonus * 100)) * dt;
    enemy.y += (146 + wave * (16 + profile.diveFallBonus * 100)) * dt;
    if (enemy.y > WORLD.height + 60) {
      enemy.y = 82;
      enemy.x = clamp(enemy.x, 72, WORLD.width - 72);
      enemy.dive = null;
    }
  } else {
    const drift = enemy.type === "sniper" ? 0.55 : enemy.type === "tank" ? 0.4 : 1;
    const waveSpeed = enemy.speed + wave * 4 + profile.speedBonus;
    enemy.x += formationDirection * waveSpeed * drift * dt;
    enemy.y = enemy.baseY + formationDrop + Math.sin(enemy.phase) * (enemy.type === "sniper" ? 5 : 7);
    enemy.baseY += (enemy.type === "scout" ? 0.5 : 0.8) * (wave + profile.stage) * dt;
  }

  if (enemy.fireCooldown <= 0) {
    if (enemy.type === "sniper") {
      fireEnemyBullet(enemy, "aimed");
      enemy.fireCooldown = Math.max(0.85, 2.0 - wave * 0.04 - profile.stage * 0.05);
    } else if (enemy.type === "tank") {
      fireEnemyBullet(enemy, "spread");
      enemy.fireCooldown = Math.max(1.35, 2.6 - wave * 0.05 - profile.stage * 0.06);
    } else if (enemy.type === "splitter") {
      fireEnemyBullet(enemy, "aimed");
      enemy.fireCooldown = Math.max(0.9, 1.9 - wave * 0.04 - profile.stage * 0.04);
    } else {
      fireEnemyBullet(enemy, "aimed");
      enemy.fireCooldown = Math.max(0.9, 2.2 - wave * 0.06 - profile.stage * 0.04);
    }
  }
}

function updateEnemies(dt) {
  if (enemies.length === 0) {
    waveClearTimer += dt;
    if (waveClearTimer >= 1.25) {
      wave += 1;
      spawnWave();
      updateHud();
      waveClearTimer = 0;
    }
    return;
  }

  const leftEdge = Math.min(...enemies.map((enemy) => enemy.x - enemy.width / 2));
  const rightEdge = Math.max(...enemies.map((enemy) => enemy.x + enemy.width / 2));

  if (leftEdge < 26 && formationDirection < 0) {
    formationDirection = 1;
    formationDrop = 20;
  } else if (rightEdge > WORLD.width - 26 && formationDirection > 0) {
    formationDirection = -1;
    formationDrop = 20;
  }

  formationDrop = Math.max(0, formationDrop - 42 * dt);

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    updateEnemy(enemy, dt);

    if (enemy.y > player.y - 32) {
      damagePlayer();
      enemies.splice(i, 1);
      continue;
    }

    if (enemy.x < -80 || enemy.x > WORLD.width + 80) {
      enemy.x = clamp(enemy.x, 80, WORLD.width - 80);
      enemy.dive = null;
    }
  }
}

function updatePowerups(dt) {
  for (let i = powerups.length - 1; i >= 0; i -= 1) {
    const item = powerups[i];
    item.pulse += dt * 6;
    item.y += item.vy * dt;
    if (rectsOverlap(item, player)) {
      applyPowerup(item.type);
      powerups.splice(i, 1);
      continue;
    }
    if (item.y > WORLD.height + 40) {
      powerups.splice(i, 1);
    }
  }
}

function updateTimers(dt) {
  comboTimer = Math.max(0, comboTimer - dt);
  if (comboTimer === 0 && comboChain > 0) {
    resetCombo();
  }

  scoreBoostTimer = Math.max(0, scoreBoostTimer - dt);
  rapidTimer = Math.max(0, rapidTimer - dt);
  spreadTimer = Math.max(0, spreadTimer - dt);
  shieldTimer = Math.max(0, shieldTimer - dt);
  bannerTimer = Math.max(0, bannerTimer - dt);
  hitFlash = Math.max(0, hitFlash - dt);
  screenShake = Math.max(0, screenShake - dt * 16);
  powerName = activePowerLabel();
}

function updateCollisions() {
  for (let b = bullets.length - 1; b >= 0; b -= 1) {
    const bullet = bullets[b];

    for (let e = enemies.length - 1; e >= 0; e -= 1) {
      const enemy = enemies[e];
      if (!rectsOverlap(bullet, enemy)) {
        continue;
      }

      bullet.dead = true;
      enemy.hp -= 1;
      spawnExplosion(bullet.x, bullet.y, "#f8fafc", 5, 50);
      if (enemy.hp <= 0) {
        destroyEnemy(enemy, bullet.x, bullet.y);
        enemies.splice(e, 1);
      } else {
        spawnExplosion(bullet.x, bullet.y, enemy.color, 10, 80);
        playEffect("hit");
      }
      break;
    }

    if (bullet.dead) {
      bullets.splice(b, 1);
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
    if (rectsOverlap(enemyBullets[i], player)) {
      enemyBullets.splice(i, 1);
      damagePlayer();
    }
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (rectsOverlap(enemy, player)) {
      destroyEnemy(enemy, enemy.x, enemy.y, false);
      enemies.splice(i, 1);
      damagePlayer();
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 35 * dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function updateStars(dt) {
  for (const star of stars) {
    star.y += star.speed * dt;
    if (star.y > WORLD.height) {
      star.x = Math.random() * WORLD.width;
      star.y = -8;
    }
  }
}

function update(dt) {
  updateStars(dt);
  updateMusic(dt);

  if (state !== "running") {
    updateParticles(dt);
    return;
  }

  updatePlayer(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updatePowerups(dt);
  updateCollisions();
  updateTimers(dt);
  updateParticles(dt);
  updateHud();

  if (score > bestScore) {
    setBestScore(score);
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  gradient.addColorStop(0, "#02050d");
  gradient.addColorStop(0.35, "#07101d");
  gradient.addColorStop(0.68, "#06121d");
  gradient.addColorStop(1, "#020307");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.save();
  for (const nebula of nebulae) {
    const offsetX = Math.sin(performance.now() * 0.0002 * nebula.drift + nebula.phase) * 12;
    const offsetY = Math.cos(performance.now() * 0.00017 * nebula.drift + nebula.phase) * 10;
    const x = nebula.x + offsetX;
    const y = nebula.y + offsetY;
    const glow = ctx.createRadialGradient(x, y, 8, x, y, nebula.radiusX);
    glow.addColorStop(0, nebula.color);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(x, y, nebula.radiusX, nebula.radiusY, Math.sin(nebula.phase) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  for (const planet of planets) {
    ctx.save();
    ctx.translate(planet.x, planet.y);
    const body = ctx.createRadialGradient(-planet.radius * 0.35, -planet.radius * 0.35, 6, 0, 0, planet.radius);
    body.addColorStop(0, "#f8fafc");
    body.addColorStop(0.12, planet.base);
    body.addColorStop(0.72, "#0d1624");
    body.addColorStop(1, "#05070d");
    ctx.shadowColor = planet.glow;
    ctx.shadowBlur = 26;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, planet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(-planet.radius * 0.25, -planet.radius * 0.28, planet.radius * 0.38, planet.radius * 0.18, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (planet.ring) {
      ctx.strokeStyle = "rgba(248, 250, 252, 0.18)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.ellipse(0, 0, planet.radius * 1.5, planet.radius * 0.7, -0.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(248, 250, 252, 0.12)";
    ctx.beginPath();
    ctx.arc(-planet.radius * 0.18, planet.radius * 0.12, planet.radius * 0.12, 0, Math.PI * 2);
    ctx.arc(planet.radius * 0.22, -planet.radius * 0.08, planet.radius * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  ctx.save();
  for (const star of stars) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = star.size > 1.5 ? "#d7f8ff" : "#ffffff";
    ctx.fillRect(star.x, star.y, star.size, star.size);
    if (star.size > 1.6) {
      ctx.fillStyle = "rgba(40, 215, 255, 0.35)";
      ctx.fillRect(star.x - 0.6, star.y + star.size / 2 - 0.6, star.size + 1.2, 0.9);
      ctx.fillRect(star.x + star.size / 2 - 0.6, star.y - 0.6, 0.9, star.size + 1.2);
    }
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(40, 215, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let y = 90; y < WORLD.height; y += 90) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y);
    ctx.stroke();
  }
  for (let x = 110; x < WORLD.width; x += 110) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.height);
    ctx.stroke();
  }
  ctx.restore();

  const horizon = ctx.createLinearGradient(0, WORLD.height - 220, 0, WORLD.height);
  horizon.addColorStop(0, "rgba(40, 215, 255, 0)");
  horizon.addColorStop(1, "rgba(40, 215, 255, 0.08)");
  ctx.fillStyle = horizon;
  ctx.fillRect(0, WORLD.height - 220, WORLD.width, 220);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#28d7ff";
  for (let i = 0; i < 10; i += 1) {
    const y = 180 + i * 72;
    ctx.fillRect(0, y, WORLD.width, 1);
  }
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
  }

  ctx.rotate(player.roll);

  if (player.invincible > 0 && Math.floor(player.invincible * 12) % 2 === 0) {
    ctx.globalAlpha = 0.38;
  }

  const hull = ctx.createLinearGradient(0, -player.height / 2, 0, player.height / 2);
  hull.addColorStop(0, "#d7fff0");
  hull.addColorStop(0.18, "#5ff0b3");
  hull.addColorStop(0.62, "#1ea974");
  hull.addColorStop(1, "#0b5039");
  ctx.shadowColor = "rgba(94, 230, 168, 0.55)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(0, -player.height / 2);
  ctx.lineTo(player.width / 2, player.height / 4);
  ctx.lineTo(20, player.height / 2 - 6);
  ctx.lineTo(8, player.height / 2 - 18);
  ctx.lineTo(0, player.height / 2 - 26);
  ctx.lineTo(-8, player.height / 2 - 18);
  ctx.lineTo(-20, player.height / 2 - 6);
  ctx.lineTo(-player.width / 2, player.height / 4);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(248, 250, 252, 0.22)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const cockpit = ctx.createRadialGradient(0, -10, 3, 0, -10, 14);
  cockpit.addColorStop(0, "#ffffff");
  cockpit.addColorStop(0.28, "#5ee6ff");
  cockpit.addColorStop(1, "#1b4b88");
  ctx.fillStyle = cockpit;
  ctx.beginPath();
  ctx.ellipse(0, -9, 8, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#28d7ff";
  ctx.beginPath();
  ctx.moveTo(0, -21);
  ctx.lineTo(12, 8);
  ctx.lineTo(-12, 8);
  ctx.closePath();
  ctx.fill();

  const wing = ctx.createLinearGradient(-player.width / 2, 0, player.width / 2, 0);
  wing.addColorStop(0, "#0f2f42");
  wing.addColorStop(0.5, "#f7c948");
  wing.addColorStop(1, "#0f2f42");
  ctx.fillStyle = wing;
  ctx.fillRect(-18, 18, 10, 20);
  ctx.fillRect(8, 18, 10, 20);

  ctx.fillStyle = "rgba(248, 250, 252, 0.75)";
  ctx.fillRect(-14, 24, 4, 8);
  ctx.fillRect(10, 24, 4, 8);

  ctx.fillStyle = "rgba(40, 215, 255, 0.45)";
  ctx.fillRect(-4, 15, 8, 4);

  if (activeTouches.shoot || keys.has("Space")) {
    ctx.fillStyle = "rgba(247, 201, 72, 0.85)";
    ctx.beginPath();
    ctx.moveTo(0, player.height / 2 + 2);
    ctx.lineTo(8, player.height / 2 + 18);
    ctx.lineTo(-8, player.height / 2 + 18);
    ctx.closePath();
    ctx.fill();
  }

  if (shieldTimer > 0) {
    ctx.strokeStyle = "rgba(40, 215, 255, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 42 + Math.sin(performance.now() / 180) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake * 0.25, (Math.random() - 0.5) * screenShake * 0.25);
  }

  const pulse = 0.55 + Math.sin(enemy.phase * 2.0) * 0.12;
  ctx.globalAlpha = pulse;

  if (enemy.type === "boss") {
    ctx.shadowColor = "rgba(251, 113, 133, 0.4)";
    ctx.shadowBlur = 24;
    const grad = ctx.createLinearGradient(-enemy.width / 2, 0, enemy.width / 2, 0);
    grad.addColorStop(0, "#8f1f42");
    grad.addColorStop(0.32, "#fb7185");
    grad.addColorStop(0.5, "#ffffff");
    grad.addColorStop(0.68, "#28d7ff");
    grad.addColorStop(1, "#164e63");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -enemy.height / 2);
    ctx.lineTo(enemy.width / 2, -14);
    ctx.lineTo(enemy.width / 2 - 18, enemy.height / 5);
    ctx.lineTo(34, enemy.height / 2);
    ctx.lineTo(-34, enemy.height / 2);
    ctx.lineTo(-enemy.width / 2 + 18, enemy.height / 5);
    ctx.lineTo(-enemy.width / 2, -14);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(6, 12, 24, 0.9)";
    ctx.fillRect(-42, -8, 84, 18);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(-34, -3, 68 * (enemy.hp / enemy.maxHp), 8);
    ctx.fillStyle = "rgba(248, 250, 252, 0.18)";
    ctx.fillRect(-18, 16, 36, 6);
    ctx.fillStyle = "#08101c";
    ctx.fillRect(-10, -22, 20, 10);
    ctx.fillStyle = "#28d7ff";
    ctx.fillRect(-4, -18, 8, 6);
  } else {
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = 12;
    const body = ctx.createLinearGradient(0, -enemy.height / 2, 0, enemy.height / 2);
    body.addColorStop(0, "#ffffff");
    body.addColorStop(0.18, enemy.color);
    body.addColorStop(1, "#0f172a");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -enemy.height / 2);
    ctx.lineTo(enemy.width / 2, -2);
    ctx.lineTo(enemy.width / 3, enemy.height / 2);
    ctx.lineTo(0, enemy.height / 3);
    ctx.lineTo(-enemy.width / 3, enemy.height / 2);
    ctx.lineTo(-enemy.width / 2, -2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(248, 250, 252, 0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillRect(-6, -5, 12, 7);
    ctx.fillStyle = "rgba(8, 15, 29, 0.92)";
    ctx.fillRect(-3, -2, 6, 3);

    ctx.fillStyle = "rgba(248, 250, 252, 0.2)";
    ctx.fillRect(-enemy.width / 2 + 5, enemy.height / 2 - 2, enemy.width - 10, 4);

    if (enemy.hp > 1) {
      ctx.fillStyle = "rgba(17, 24, 39, 0.9)";
      ctx.fillRect(-enemy.width / 2, enemy.height / 2 + 7, enemy.width, 5);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        -enemy.width / 2,
        enemy.height / 2 + 7,
        enemy.width * (enemy.hp / enemy.maxHp),
        5,
      );
    }
  }

  ctx.restore();
}

function drawBullets() {
  ctx.save();
  for (const bullet of bullets) {
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
    ctx.fillStyle = "#28d7ff";
    ctx.fillRect(bullet.x - 2, bullet.y - bullet.height / 2, 4, bullet.height);
  }

  for (const bullet of enemyBullets) {
    ctx.fillStyle = "#fb7185";
    ctx.beginPath();
    ctx.ellipse(bullet.x, bullet.y, bullet.width / 2, bullet.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPowerups() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const item of powerups) {
    const def = powerupDefs[item.type];
    const glow = 0.6 + Math.sin(item.pulse) * 0.18;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.globalAlpha = glow;
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2;
    ctx.strokeRect(-10, -10, 20, 20);
    ctx.fillStyle = "#050914";
    ctx.font = "700 10px system-ui, sans-serif";
    ctx.fillText(def.label[0], 0, 1);
    ctx.restore();
  }
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.restore();
}

function drawBanner() {
  if (bannerTimer <= 0 || !bannerText) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = clamp(bannerTimer / 1.2, 0, 1);
  ctx.fillStyle = bannerColor;
  ctx.font = "800 28px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(bannerText, WORLD.width / 2, 88);
  ctx.restore();
}

function drawOverlayMask() {
  if (state !== "paused") {
    return;
  }

  ctx.fillStyle = "rgba(5, 8, 16, 0.55)";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "800 52px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Paused", WORLD.width / 2, WORLD.height / 2);
}

function draw() {
  ctx.save();
  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
  }

  drawBackground();
  drawPowerups();
  drawBullets();
  for (const enemy of enemies) {
    drawEnemy(enemy);
  }
  drawPlayer();
  drawParticles();
  drawBanner();
  drawOverlayMask();

  if (hitFlash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${hitFlash * 0.35})`;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }

  ctx.restore();
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function handleKeyDown(event) {
  if (["ArrowLeft", "ArrowRight", "Space", "ArrowUp", "ArrowDown"].includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === "KeyP" && event.repeat) {
    return;
  }

  keys.add(event.code);

  if (event.code === "Enter" && state !== "running") {
    if (state === "paused") {
      resumeGame();
    } else {
      startGame();
    }
  }

  if (event.code === "KeyP") {
    togglePause();
  }

  if (event.code === "KeyR" && state !== "running") {
    startGame();
  }
}

function handleKeyUp(event) {
  keys.delete(event.code);
}

function handleButtonClick(event) {
  const action = event.currentTarget.dataset.action;
  try {
    ensureAudio().resume();
  } catch {
    // Ignore audio setup failures on restricted browsers.
  }

  if (action === "left" || action === "right" || action === "shoot") {
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    activeTouches[action] = true;
    updateTouchButtons();
    if (action === "shoot") {
      spawnPlayerBullets();
    }
    return;
  }

  if (action === "pause") {
    togglePause();
    return;
  }

  if (action === "restart") {
    startGame();
  }
}

function handleButtonRelease(event) {
  const action = event.currentTarget.dataset.action;
  if (action === "left" || action === "right" || action === "shoot") {
    activeTouches[action] = false;
    updateTouchButtons();
  }
}

function updateTouchButtons() {
  for (const button of touchButtons) {
    const action = button.dataset.action;
    if (action === "left" || action === "right" || action === "shoot") {
      button.classList.toggle("active", activeTouches[action]);
    }
  }
}

function bindTouchControls() {
  for (const button of touchButtons) {
    button.addEventListener("pointerdown", handleButtonClick);
    button.addEventListener("pointerup", handleButtonRelease);
    button.addEventListener("pointercancel", handleButtonRelease);
    button.addEventListener("pointerleave", handleButtonRelease);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  }
}

function updateEnemyDeathsNearPlayer() {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (enemy.y > WORLD.height + 80) {
      enemies.splice(i, 1);
      continue;
    }
  }
}

function initializeState() {
  createStars();
  createBackdrop();
  bestScoreEl.textContent = bestScore.toString();
  clearEntities();
  resetTimers();
  resetPlayer();
  activeTouches.left = false;
  activeTouches.right = false;
  activeTouches.shoot = false;
  updateHud();
  setOverlay(
    "Ready",
    "Mini Galaga",
    "Move with arrows or A/D. Shoot with Space. Mobile controls are below.",
    "Start",
  );
  updateTouchButtons();
}

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener(
  "pointerdown",
  () => {
    try {
      ensureAudio().resume();
    } catch {
      // Ignore audio setup failures on restricted browsers.
    }
  },
  { passive: true },
);
startButton.addEventListener("click", () => {
  if (state === "paused") {
    resumeGame();
    return;
  }
  startGame();
});

bindTouchControls();
initializeState();
requestAnimationFrame(loop);
