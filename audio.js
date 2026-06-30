export function createAudioController() {
  let ctx = null;
  let master = null;
  let musicStepTimer = 0;
  let musicStep = 0;

  function ensure() {
    if (ctx) {
      return ctx;
    }

    const context = new (window.AudioContext || window.webkitAudioContext)();
    const gain = context.createGain();
    gain.gain.value = 0.12;
    gain.connect(context.destination);

    ctx = context;
    master = gain;
    return ctx;
  }

  function playTone(frequency, duration, type = "square", gain = 0.1, detune = 0) {
    if (!ctx || ctx.state === "suspended") {
      return;
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(amp);
    amp.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  function playEffect(kind) {
    ensure();
    if (!ctx || ctx.state === "suspended") {
      return;
    }

    switch (kind) {
      case "shoot":
        playTone(740, 0.08, "square", 0.05);
        break;
      case "hit":
        playTone(180, 0.14, "sawtooth", 0.08);
        break;
      case "explosion":
        playTone(110, 0.2, "triangle", 0.1);
        break;
      case "powerup":
        playTone(520, 0.14, "sine", 0.08);
        playTone(780, 0.1, "sine", 0.06, 12);
        break;
      case "bomb":
        playTone(90, 0.28, "sawtooth", 0.12);
        playTone(45, 0.4, "triangle", 0.08);
        break;
      case "boss":
        playTone(95, 0.22, "square", 0.1);
        playTone(150, 0.18, "square", 0.06);
        break;
      default:
        break;
    }
  }

  function updateMusic(dt, running) {
    if (!ctx || ctx.state === "suspended" || !running) {
      return;
    }

    musicStepTimer -= dt;
    if (musicStepTimer > 0) {
      return;
    }

    const melody = [392, 440, 523, 494, 440, 392, 330, 349];
    const bass = [98, 110, 131, 123, 110, 98, 82, 92];
    const note = melody[musicStep % melody.length];
    const root = bass[musicStep % bass.length];

    playTone(note, 0.11, "square", 0.032);
    playTone(root, 0.18, "triangle", 0.02);

    musicStep = (musicStep + 1) % melody.length;
    musicStepTimer = 0.34;
  }

  return {
    ensure,
    playEffect,
    updateMusic,
  };
}
