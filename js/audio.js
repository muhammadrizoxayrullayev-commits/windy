// Web Audio API High-Impact Zero-Latency Mechanical Switch Audio Engine for Windy

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.soundProfile = 'thock'; // 'thock' | 'clicky' | 'cream' | 'bubble' | 'typewriter' | 'off'
    this.volume = 1.0; // 0.5 | 1.0 | 1.5
    this.isMuted = false;
    this.buffers = {};
    this.initialized = false;
  }

  init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    // Studio Dynamics Limiter / Compressor tuned for warm, velvety, fatigue-free audio
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(3, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.004, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.05, this.ctx.currentTime);
    this.compressor.connect(this.ctx.destination);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.masterGain.connect(this.compressor);

    this.prebakeBuffers();
    this.initialized = true;
  }

  setProfile(profile) {
    this.soundProfile = profile;
    this.init();
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(2.0, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  getVolume() {
    return this.volume;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  prebakeBuffers() {
    const sr = this.ctx.sampleRate || 44100;

    // Helper to generate multiple variations
    const makeVariations = (count, generator) => {
      const list = [];
      for (let v = 0; v < count; v++) {
        list.push(generator(v));
      }
      return list;
    };

    // =========================================================================
    // 1. THOCK (Lubed Linear Switch - Soft, Deep, Creamy & Velvety ASMR)
    // =========================================================================
    this.buffers['thock'] = makeVariations(3, (variation) => {
      const len = Math.floor(sr * 0.056);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      const pitchMod = 1 + (variation - 1) * 0.035;

      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const progress = i / len;

        // Smooth 2.2ms attack curve - removes sharp click, creates velvety landing
        const attack = Math.min(1, i / (sr * 0.0022));

        // Layer 1: Warm switch housing tactile pop (smooth sweep 520Hz -> 210Hz)
        const popFreq = (520 * Math.exp(-progress * 10) + 210) * pitchMod;
        const pop = Math.sin(2 * Math.PI * popFreq * t) * Math.exp(-progress * 14) * 0.72;

        // Layer 2: Deep desk & brass plate bottom-out resonance (140Hz -> 65Hz)
        const bassFreq = (140 * Math.exp(-progress * 6) + 65) * pitchMod;
        const bass = Math.sin(2 * Math.PI * bassFreq * t) * Math.exp(-progress * 9) * 0.52;

        // Layer 3: Warm mid acoustic body (300Hz)
        const body = Math.sin(2 * Math.PI * 300 * pitchMod * t) * Math.exp(-progress * 12) * 0.32;

        // Layer 4: Silky lubricant glide texture (smooth, zero harsh hiss)
        const lubeFriction = (Math.random() * 2 - 1) * Math.exp(-progress * 26) * 0.05;

        data[i] = (pop + bass + body + lubeFriction) * attack * 0.75;
      }
      return buf;
    });

    // Spacebar Thock (Smooth, deep, stabilizer-dampened acoustic thud)
    this.buffers['thock_space'] = makeVariations(2, (variation) => {
      const len = Math.floor(sr * 0.078);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      const pitchMod = 1 + (variation * 0.03);

      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const progress = i / len;
        const attack = Math.min(1, i / (sr * 0.003));

        const body = Math.sin(2 * Math.PI * (380 * Math.exp(-progress * 8) + 160) * pitchMod * t) * Math.exp(-progress * 10) * 0.78;
        const bass = Math.sin(2 * Math.PI * (115 * Math.exp(-progress * 5) + 55) * pitchMod * t) * Math.exp(-progress * 7) * 0.65;
        const damp = (Math.random() * 2 - 1) * Math.exp(-progress * 22) * 0.06;

        data[i] = (body + bass + damp) * attack * 0.75;
      }
      return buf;
    });

    // =========================================================================
    // 2. CLICKY (Crisp Tactile Snap - Mellowed Highs, Zero Ear Piercing)
    // =========================================================================
    this.buffers['clicky'] = makeVariations(3, (variation) => {
      const len = Math.floor(sr * 0.048);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      const pitchMod = 1 + (variation - 1) * 0.04;

      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const progress = i / len;
        const attack = Math.min(1, i / (sr * 0.0018));

        const click1 = Math.sin(2 * Math.PI * 2200 * pitchMod * t) * Math.exp(-progress * 24) * 0.75;
        const click2 = (i > len * 0.08) ? Math.sin(2 * Math.PI * 1600 * pitchMod * t) * Math.exp(-(progress - 0.08) * 20) * 0.6 : 0;
        const snapNoise = (Math.random() * 2 - 1) * Math.exp(-progress * 22) * 0.15;
        const body = Math.sin(2 * Math.PI * 720 * pitchMod * t) * Math.exp(-progress * 12) * 0.45;

        data[i] = (click1 + click2 + snapNoise + body) * attack * 0.72;
      }
      return buf;
    });

    this.buffers['clicky_space'] = makeVariations(2, (variation) => {
      const len = Math.floor(sr * 0.07);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);

      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const progress = i / len;
        const attack = Math.min(1, i / (sr * 0.002));
        const click = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-progress * 18) * 0.7;
        const body = Math.sin(2 * Math.PI * 520 * t) * Math.exp(-progress * 9) * 0.7;
        const bass = Math.sin(2 * Math.PI * 160 * t) * Math.exp(-progress * 6) * 0.55;
        data[i] = (click + body + bass) * attack * 0.75;
      }
      return buf;
    });

    // =========================================================================
    // 3. CREAM (NovelKeys Cream Lubed - Silky, Ultra-Soft Buttery Pop)
    // =========================================================================
    this.buffers['cream'] = makeVariations(3, (variation) => {
      const len = Math.floor(sr * 0.052);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      const pitchMod = 1 + (variation - 1) * 0.03;

      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const progress = i / len;
        const attack = Math.min(1, i / (sr * 0.002));

        const pop = Math.sin(2 * Math.PI * (440 * Math.exp(-progress * 9) + 240) * pitchMod * t) * Math.exp(-progress * 13) * 0.75;
        const warm = Math.sin(2 * Math.PI * 180 * pitchMod * t) * Math.exp(-progress * 8) * 0.5;
        const glide = (Math.random() * 2 - 1) * Math.exp(-progress * 24) * 0.05;

        data[i] = (pop + warm + glide) * attack * 0.7;
      }
      return buf;
    });

    this.buffers['cream_space'] = makeVariations(2, (variation) => {
      const len = Math.floor(sr * 0.07);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);

      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const progress = i / len;
        const attack = Math.min(1, i / (sr * 0.0025));

        const body = Math.sin(2 * Math.PI * (310 * Math.exp(-progress * 7) + 140) * t) * Math.exp(-progress * 9) * 0.75;
        const sub = Math.sin(2 * Math.PI * 105 * t) * Math.exp(-progress * 6) * 0.6;
        data[i] = (body + sub) * attack * 0.72;
      }
      return buf;
    });

    // =========================================================================
    // 4. BUBBLE / MARBLES (Ceramic Keycaps / Playful Waterdrop Pop)
    // =========================================================================
    this.buffers['bubble'] = makeVariations(3, (variation) => {
      const len = Math.floor(sr * 0.052);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      const startFreq = (360 + variation * 50);

      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const progress = i / len;
        const attack = Math.min(1, i / (sr * 0.002));
        const sweepFreq = startFreq + progress * 650 * Math.exp(-progress * 5);
        const pop = Math.sin(2 * Math.PI * sweepFreq * t) * Math.exp(-progress * 7) * 0.85;
        data[i] = pop * attack * 0.75;
      }
      return buf;
    });

    this.buffers['bubble_space'] = makeVariations(2, (variation) => {
      const len = Math.floor(sr * 0.072);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);

      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const progress = i / len;
        const attack = Math.min(1, i / (sr * 0.0025));
        const pop = Math.sin(2 * Math.PI * (280 + progress * 480) * t) * Math.exp(-progress * 6) * 0.85;
        const body = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-progress * 6) * 0.55;
        data[i] = (pop + body) * attack * 0.75;
      }
      return buf;
    });

    // =========================================================================
    // 5. TYPEWRITER (Vintage Mellow Platen Thud)
    // =========================================================================
    this.buffers['typewriter'] = makeVariations(3, (variation) => {
      const len = Math.floor(sr * 0.065);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      const pitchMod = 1 + (variation - 1) * 0.04;

      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const progress = i / len;
        const attack = Math.min(1, i / (sr * 0.002));

        const platenThud = Math.sin(2 * Math.PI * 220 * pitchMod * t) * Math.exp(-progress * 9) * 0.75;
        const metalRing = Math.sin(2 * Math.PI * 1950 * pitchMod * t) * Math.exp(-progress * 15) * 0.3;
        const snap = (Math.random() * 2 - 1) * Math.exp(-progress * 26) * 0.15;

        data[i] = (platenThud + metalRing + snap) * attack * 0.75;
      }
      return buf;
    });

    this.buffers['typewriter_space'] = makeVariations(2, (variation) => {
      const len = Math.floor(sr * 0.085);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);

      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const progress = i / len;
        const attack = Math.min(1, i / (sr * 0.0025));
        const carriageThud = Math.sin(2 * Math.PI * 150 * t) * Math.exp(-progress * 6) * 0.85;
        const bellPing = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-progress * 13) * 0.25;
        data[i] = (carriageThud + bellPing) * attack * 0.75;
      }
      return buf;
    });

    // =========================================================================
    // 6. ERROR SOUND (Muted soft felt/wood tap — distinct feedback, zero headache)
    // =========================================================================
    this.buffers['error'] = makeVariations(2, (variation) => {
      const len = Math.floor(sr * 0.062);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      const pitchMod = 1 + (variation === 1 ? 0.04 : 0);

      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const progress = i / len;

        // Smooth 3ms attack
        const attack = Math.min(1, i / (sr * 0.003));

        // Soft muted downwards tone (distinct from correct typing by gentle lower slope)
        const tone1 = Math.sin(2 * Math.PI * (175 - progress * 60) * pitchMod * t) * Math.exp(-progress * 12) * 0.45;
        const tone2 = Math.sin(2 * Math.PI * (90 - progress * 25) * pitchMod * t) * Math.exp(-progress * 10) * 0.3;
        const softTap = Math.sin(2 * Math.PI * 260 * t) * Math.exp(-progress * 22) * 0.12;

        data[i] = (tone1 + tone2 + softTap) * attack * 0.65;
      }
      return buf;
    });
  }

  playKeySound(isSpace = false, isError = false) {
    if (this.isMuted || this.soundProfile === 'off') return;
    this.init();
    if (!this.ctx || !this.buffers) return;

    let profileKey = this.soundProfile;
    if (isError) {
      profileKey = 'error';
    } else if (isSpace) {
      profileKey = `${this.soundProfile}_space`;
    }

    let bufList = this.buffers[profileKey];
    if (!bufList || bufList.length === 0) {
      bufList = this.buffers[this.soundProfile] || this.buffers['thock'];
    }
    if (!bufList || bufList.length === 0) return;

    const buf = bufList[Math.floor(Math.random() * bufList.length)];
    if (!buf) return;

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = buf;
      // Micro pitch variation for realistic tactile depth
      const randomPitch = 0.98 + Math.random() * 0.04;
      source.playbackRate.value = isSpace ? 0.93 * randomPitch : (isError ? 1.0 : randomPitch);
      source.connect(this.masterGain);
      source.start(0);
    } catch (e) {}
  }
}
