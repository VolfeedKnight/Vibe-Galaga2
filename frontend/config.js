(() => {
const WORLD = {
  width: 840,
  height: 920,
};

const STORAGE_KEY = "mini-galaga-best-score-v2";
const SCORE_API_URL = "http://127.0.0.1:8001";

const enemyDefs = {
  scout: {
    hp: 1,
    width: 36,
    height: 30,
    speed: 72,
    score: 30,
    fireChance: 0.000,
    color: "#28d7ff",
  },
  fighter: {
    hp: 2,
    width: 42,
    height: 36,
    speed: 58,
    score: 60,
    fireChance: 0.002,
    color: "#5ee6a8",
  },
  tank: {
    hp: 4,
    width: 50,
    height: 42,
    speed: 38,
    score: 110,
    fireChance: 0.004,
    color: "#f7c948",
  },
  sniper: {
    hp: 2,
    width: 40,
    height: 34,
    speed: 50,
    score: 90,
    fireChance: 0.006,
    color: "#fb7185",
  },
  splitter: {
    hp: 2,
    width: 44,
    height: 34,
    speed: 64,
    score: 75,
    fireChance: 0.003,
    color: "#c084fc",
  },
  boss: {
    hp: 90,
    width: 134,
    height: 92,
    speed: 34,
    score: 1000,
    fireChance: 0.015,
    color: "#ffffff",
  },
};

const powerupDefs = {
  shield: { label: "Shield", duration: 7.5, color: "#28d7ff" },
  rapid: { label: "Rapid", duration: 9.0, color: "#5ee6a8" },
  spread: { label: "Spread", duration: 8.5, color: "#f7c948" },
  score: { label: "Score x2", duration: 10.0, color: "#fb7185" },
  bomb: { label: "Bomb", duration: 0, color: "#c084fc" },
};

window.MiniGalagaConfig = {
  WORLD,
  STORAGE_KEY,
  SCORE_API_URL,
  enemyDefs,
  powerupDefs,
};
})();
