// Safe Client-Side LocalStorage Manager for Windy

const STORAGE_KEYS = {
  SETTINGS: 'windy_settings_v1',
  HISTORY: 'windy_history_v1',
  PERSONAL_BESTS: 'windy_pb_v1'
};

const DEFAULT_SETTINGS = {
  theme: 'windy-frost',
  language: 'uzbek_latin',
  mode: 'time', // 'time' | 'words' | 'quote' | 'zen' | 'custom'
  timeLimit: 15, // 15, 30, 60, 120
  wordLimit: 25, // 10, 25, 50, 100
  punctuation: false,
  numbers: false,
  soundProfile: 'thock', // 'thock' | 'clicky' | 'cream' | 'bubble' | 'typewriter' | 'off'
  volume: 1.0, // 0.5 | 1.0 | 1.5
  customText: ''
};

export class StorageManager {
  constructor() {
    this.memoryFallback = {};
  }

  getSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('LocalStorage unavailable, using fallback', e);
    }
    return { ...DEFAULT_SETTINGS, ...(this.memoryFallback[STORAGE_KEYS.SETTINGS] || {}) };
  }

  saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      this.memoryFallback[STORAGE_KEYS.SETTINGS] = settings;
    }
  }

  getPersonalBests() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PERSONAL_BESTS);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return this.memoryFallback[STORAGE_KEYS.PERSONAL_BESTS] || {};
  }

  checkAndSavePersonalBest(key, wpm, accuracy) {
    const pbs = this.getPersonalBests();
    const currentBest = pbs[key];

    if (!currentBest || wpm > currentBest.wpm) {
      pbs[key] = {
        wpm: Math.round(wpm),
        accuracy: Math.round(accuracy),
        date: new Date().toISOString()
      };
      try {
        localStorage.setItem(STORAGE_KEYS.PERSONAL_BESTS, JSON.stringify(pbs));
      } catch (e) {
        this.memoryFallback[STORAGE_KEYS.PERSONAL_BESTS] = pbs;
      }
      return true; // Is a new PB!
    }
    return false;
  }

  saveTestResult(result) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      const history = raw ? JSON.parse(raw) : [];
      history.unshift({
        ...result,
        timestamp: Date.now()
      });
      // Keep last 50 tests
      const trimmed = history.slice(0, 50);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
    } catch (e) {}
  }
}
