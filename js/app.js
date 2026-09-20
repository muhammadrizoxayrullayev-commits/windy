// Windy Typing Platform - Main Application Coordinator

import { StorageManager } from './storage.js';
import { LanguageManager, LANGUAGES } from './languages/loader.js';
import { AudioEngine } from './audio.js';
import { TypingEngine } from './engine.js';
import { PerformanceChart } from './chart.js';
import { WindBackground } from './wind_canvas.js';

class WindyApp {
  constructor() {
    this.storage = new StorageManager();
    this.settings = this.storage.getSettings();

    this.languageMgr = new LanguageManager(this.settings.language);
    this.audio = new AudioEngine();
    this.audio.setProfile(this.settings.soundProfile);

    this.chart = new PerformanceChart('speed-chart');
    this.windBg = new WindBackground('wind-canvas');

    // DOM Elements
    this.wordsContainer = document.getElementById('words');
    this.caretElement = document.getElementById('caret');
    this.hudElement = document.getElementById('typing-hud');
    this.typingArena = document.getElementById('typing-arena');
    this.typingView = document.getElementById('typing-view');
    this.resultsView = document.getElementById('results-view');
    this.keystrokeReceiver = document.getElementById('keystroke-receiver');

    // Modals
    this.langModal = document.getElementById('language-modal');
    this.themeModal = document.getElementById('theme-modal');
    this.customModal = document.getElementById('custom-modal');
    this.shortcutsModal = document.getElementById('shortcuts-modal');

    // Engine instance
    this.engine = new TypingEngine({
      container: this.wordsContainer,
      caret: this.caretElement,
      arena: this.typingArena,
      hudElement: this.hudElement,
      audio: this.audio,
      onComplete: (results) => this.handleTestComplete(results),
      onTick: (data) => {},
      onKeystroke: () => {
        if (this.windBg) this.windBg.boost();
      }
    });

    this.lastTestConfig = null;
    this.missedWords = [];
  }

  init() {
    this.applyTheme(this.settings.theme);
    this.audio.setVolume(this.settings.volume || 1.0);
    this.updateSoundButtonUI();
    this.updateVolumeButtonUI();
    this.updateLanguageButtonUI();
    this.updateConfigBarUI();

    this.setupEventListeners();
    this.startNewTest();
  }

  startNewTest(customWords = null) {
    this.resultsView.classList.remove('active');
    this.typingView.style.display = 'flex';
    this.hudElement.classList.remove('active');

    let wordsList = [];

    if (customWords) {
      wordsList = customWords;
    } else if (this.settings.mode === 'quote') {
      const quoteStr = this.languageMgr.getRandomQuote();
      wordsList = quoteStr.split(/\s+/).filter(Boolean);
    } else if (this.settings.mode === 'custom' && this.settings.customText) {
      wordsList = this.settings.customText.trim().split(/\s+/).filter(Boolean);
    } else {
      const count = this.settings.mode === 'words' ? this.settings.wordLimit : 120;
      wordsList = this.languageMgr.generateWords(
        count,
        this.settings.punctuation,
        this.settings.numbers
      );
    }

    const currentLang = this.languageMgr.getCurrentLanguage();

    this.lastTestConfig = {
      words: [...wordsList],
      mode: this.settings.mode,
      timeLimit: this.settings.timeLimit,
      wordLimit: this.settings.wordLimit,
      isRtl: currentLang.isRtl
    };

    this.engine.initTest(wordsList, this.lastTestConfig);
    this.focusInput();
  }

  focusInput() {
    if (this.keystrokeReceiver) {
      this.keystrokeReceiver.focus();
    }
  }

  handleTestComplete(results) {
    this.typingView.style.display = 'none';
    this.resultsView.classList.add('active');

    // Collect missed/error words
    this.missedWords = [];
    const currentLang = this.languageMgr.getCurrentLanguage();

    // Check personal best
    const pbKey = `${results.mode}_${this.settings.mode === 'time' ? this.settings.timeLimit : this.settings.wordLimit}_${currentLang.id}`;
    const isNewPB = this.storage.checkAndSavePersonalBest(pbKey, results.wpm, results.accuracy);
    this.storage.saveTestResult(results);

    // Update Hero Stats
    document.getElementById('res-wpm').textContent = results.wpm.toString();
    document.getElementById('res-acc').textContent = `${results.accuracy}%`;

    const pbBadge = document.getElementById('pb-badge');
    if (pbBadge) {
      pbBadge.style.display = isNewPB ? 'inline-flex' : 'none';
    }

    // Update Secondary Stats
    document.getElementById('res-test-type').textContent = `${results.mode} ${results.modeDetail}`;
    document.getElementById('res-raw-wpm').textContent = results.rawWpm.toString();
    document.getElementById('res-chars').textContent =
      `${results.characters.correct}/${results.characters.incorrect}/${results.characters.extra}/${results.characters.missed}`;
    document.getElementById('res-consistency').textContent = `${results.consistency}%`;
    document.getElementById('res-time').textContent = `${results.time}s`;

    // Render Canvas Chart
    setTimeout(() => {
      this.chart.render(results.timeline);
    }, 60);
  }

  applyTheme(themeName) {
    this.settings.theme = themeName;
    document.body.setAttribute('data-theme', themeName);
    this.storage.saveSettings(this.settings);

    // Update active state in theme modal
    document.querySelectorAll('.theme-card').forEach(card => {
      card.classList.toggle('active', card.dataset.theme === themeName);
    });

    const themeColors = {
      'windy-frost': { r: 0, g: 242, b: 254 },
      'cyber-breeze': { r: 0, g: 255, b: 234 },
      'dark-zephyr': { r: 74, g: 222, b: 128 },
      'serika-wind': { r: 226, g: 183, b: 20 },
      'sakura-gale': { r: 244, g: 114, b: 182 },
      'nordic-sky': { r: 56, g: 189, b: 248 }
    };
    if (this.windBg && themeColors[themeName]) {
      const { r, g, b } = themeColors[themeName];
      this.windBg.setThemeColor(r, g, b);
    }
  }

  updateVolumeButtonUI() {
    const volBtn = document.getElementById('volume-toggle-btn');
    const volText = document.getElementById('volume-btn-text');
    if (!volBtn || !volText) return;

    const vol = this.settings.volume || 1.0;
    if (vol >= 1.4) {
      volText.textContent = '150% MAX';
      volBtn.classList.add('active-glow');
    } else if (vol >= 0.9) {
      volText.textContent = '100%';
      volBtn.classList.add('active-glow');
    } else {
      volText.textContent = '50%';
      volBtn.classList.remove('active-glow');
    }
  }

  updateSoundButtonUI() {
    const soundBtn = document.getElementById('sound-toggle-btn');
    const soundText = document.getElementById('sound-btn-text');
    if (!soundBtn || !soundText) return;

    soundText.textContent = this.settings.soundProfile.toUpperCase();
    soundBtn.classList.toggle('active-glow', this.settings.soundProfile !== 'off');
  }

  updateLanguageButtonUI() {
    const langBtnText = document.getElementById('lang-btn-text');
    const langFlag = document.getElementById('lang-flag-icon');
    const curLang = this.languageMgr.getCurrentLanguage();

    if (langBtnText) langBtnText.textContent = curLang.name;
    if (langFlag) langFlag.textContent = curLang.flag;
  }

  updateConfigBarUI() {
    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === this.settings.mode);
    });

    // Sub-mode options (Time vs Words)
    const timeGroup = document.getElementById('time-subgroup');
    const wordGroup = document.getElementById('word-subgroup');

    if (timeGroup && wordGroup) {
      timeGroup.style.display = this.settings.mode === 'time' ? 'inline-flex' : 'none';
      wordGroup.style.display = this.settings.mode === 'words' ? 'inline-flex' : 'none';
    }

    document.querySelectorAll('.time-opt-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.time) === this.settings.timeLimit);
    });

    document.querySelectorAll('.word-opt-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.words) === this.settings.wordLimit);
    });

    // Modifiers (punctuation, numbers)
    const punctBtn = document.getElementById('toggle-punct-btn');
    const numBtn = document.getElementById('toggle-num-btn');
    if (punctBtn) punctBtn.classList.toggle('active', this.settings.punctuation);
    if (numBtn) numBtn.classList.toggle('active', this.settings.numbers);
  }

  setupEventListeners() {
    // Real-time Ultra-Fast Caps Lock Detector
    const updateCapsLockUI = (isActive) => {
      const warningEl = document.getElementById('caps-lock-warning');
      if (warningEl) {
        warningEl.classList.toggle('active', !!isActive);
      }
    };

    const checkCapsLock = (e) => {
      if (!e) return;

      // 1. Direct ModifierState API from MouseEvent / KeyboardEvent / PointerEvent
      if (typeof e.getModifierState === 'function') {
        const isCaps = e.getModifierState('CapsLock');
        updateCapsLockUI(isCaps);
        return;
      }

      // 2. Physical CapsLock key toggle fallback
      if (e.key === 'CapsLock') {
        setTimeout(() => {
          if (typeof e.getModifierState === 'function') {
            updateCapsLockUI(e.getModifierState('CapsLock'));
          }
        }, 20);
        return;
      }

      // 3. Heuristic letter case check
      if (e.key && e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        if (e.key >= 'A' && e.key <= 'Z' && !e.shiftKey) {
          updateCapsLockUI(true);
        } else if (e.key >= 'a' && e.key <= 'z' && e.shiftKey) {
          updateCapsLockUI(true);
        } else if (e.key >= 'a' && e.key <= 'z' && !e.shiftKey) {
          updateCapsLockUI(false);
        } else if (e.key >= 'A' && e.key <= 'Z' && e.shiftKey) {
          updateCapsLockUI(false);
        }
      }
    };

    // Instant detection on mouse move, clicks, window focus, and key releases
    window.addEventListener('mousemove', checkCapsLock, { passive: true });
    window.addEventListener('mousedown', checkCapsLock, { passive: true });
    window.addEventListener('pointerdown', checkCapsLock, { passive: true });
    window.addEventListener('keyup', checkCapsLock);
    window.addEventListener('focus', checkCapsLock);

    // One-time browser audio unlock on first user gesture
    const unlockAudio = () => {
      this.audio.init();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    // Dual-input pipeline: Physical keyboard vs Android Virtual Keyboard / IME (Gboard, Samsung Keyboard)
    this.lastHandledKey = null;
    this.lastHandledTime = 0;

    // Android & Mobile Virtual Keyboard IME listener
    if (this.keystrokeReceiver) {
      this.keystrokeReceiver.addEventListener('input', (e) => {
        // Unlock audio on mobile if not yet initialized
        if (!this.audio.initialized) {
          this.audio.init();
        }

        const now = performance.now();
        const isRecentPhysical = (now - this.lastHandledTime) < 75;

        // 1. Mobile Virtual Keyboard Backspace
        if (e.inputType === 'deleteContentBackward') {
          if (isRecentPhysical && this.lastHandledKey === 'Backspace') {
            this.keystrokeReceiver.value = '';
            return;
          }
          this.engine.handleKeyDown({
            key: 'Backspace',
            ctrlKey: false,
            altKey: false,
            metaKey: false,
            shiftKey: false,
            preventDefault: () => {}
          });
          this.keystrokeReceiver.value = '';
          return;
        }

        // 2. Mobile Virtual Keyboard Text Insertion
        const data = e.data;
        if (data) {
          // If this character was already handled by physical keydown within 75ms, skip duplicate
          if (isRecentPhysical && data === this.lastHandledKey) {
            this.keystrokeReceiver.value = '';
            return;
          }

          // Process character(s) - handles single tap, space, or word suggestions
          for (let i = 0; i < data.length; i++) {
            const char = data[i];
            this.engine.handleKeyDown({
              key: char,
              ctrlKey: false,
              altKey: false,
              metaKey: false,
              shiftKey: false,
              preventDefault: () => {}
            });
          }
        }

        // Clear receiver buffer immediately
        this.keystrokeReceiver.value = '';
      });
    }

    // Global Keydown
    window.addEventListener('keydown', (e) => {
      checkCapsLock(e);
      if (e.key === 'CapsLock') {
        setTimeout(() => {
          if (typeof e.getModifierState === 'function') {
            updateCapsLockUI(e.getModifierState('CapsLock'));
          }
        }, 20);
        setTimeout(() => {
          if (typeof e.getModifierState === 'function') {
            updateCapsLockUI(e.getModifierState('CapsLock'));
          }
        }, 80);
      }

      // Ignore if typing inside an open modal input or textarea
      if (document.querySelector('.modal-backdrop.open')) {
        if (e.key === 'Escape') {
          this.closeAllModals();
        }
        return;
      }

      // Ignore Android virtual keyboard composition code 229 or Unidentified
      // (these will be captured cleanly by the input event above)
      if (e.key === 'Unidentified' || e.keyCode === 229) {
        return;
      }

      // Shortcut: Tab + Enter or Escape to restart test
      if (e.key === 'Escape' || (e.key === 'Enter' && e.shiftKey)) {
        e.preventDefault();
        this.startNewTest();
        return;
      }

      // Tab key shortcut (Monkeytype Tab + Enter or just Tab)
      if (e.key === 'Tab') {
        e.preventDefault();
        this.startNewTest();
        return;
      }

      // Shortcut: Ctrl + Shift + P opens Language picker
      if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        this.openLanguageModal();
        return;
      }

      // Track last physical key to prevent duplicate input event
      this.lastHandledKey = e.key;
      this.lastHandledTime = performance.now();

      // Send to typing engine
      this.engine.handleKeyDown(e);
    });

    // Keep caret aligned on window resize / zoom
    window.addEventListener('resize', () => {
      if (this.engine) {
        this.engine.updateCaretPosition();
      }
    });

    // Seamless auto-focus: clicking anywhere outside interactive controls focuses typing
    document.addEventListener('click', (e) => {
      if (document.querySelector('.modal-backdrop.open')) return;
      if (e.target.closest('button, a, input, textarea, .theme-card, .language-item')) return;
      this.focusInput();
    });

    // Clicking typing arena focuses hidden receiver
    if (this.typingArena) {
      this.typingArena.addEventListener('click', () => {
        this.focusInput();
      });
    }

    // Config Bar Mode Selectors
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (mode === 'custom') {
          this.openCustomModal();
          return;
        }
        this.settings.mode = mode;
        this.storage.saveSettings(this.settings);
        this.updateConfigBarUI();
        this.startNewTest();
      });
    });

    // Time limit buttons
    document.querySelectorAll('.time-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.settings.timeLimit = parseInt(btn.dataset.time);
        this.storage.saveSettings(this.settings);
        this.updateConfigBarUI();
        this.startNewTest();
      });
    });

    // Word limit buttons
    document.querySelectorAll('.word-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.settings.wordLimit = parseInt(btn.dataset.words);
        this.storage.saveSettings(this.settings);
        this.updateConfigBarUI();
        this.startNewTest();
      });
    });

    // Punctuation toggle
    const punctBtn = document.getElementById('toggle-punct-btn');
    if (punctBtn) {
      punctBtn.addEventListener('click', () => {
        this.settings.punctuation = !this.settings.punctuation;
        this.storage.saveSettings(this.settings);
        this.updateConfigBarUI();
        this.startNewTest();
      });
    }

    // Numbers toggle
    const numBtn = document.getElementById('toggle-num-btn');
    if (numBtn) {
      numBtn.addEventListener('click', () => {
        this.settings.numbers = !this.settings.numbers;
        this.storage.saveSettings(this.settings);
        this.updateConfigBarUI();
        this.startNewTest();
      });
    }

    // Restart Button
    const restartBtn = document.getElementById('restart-test-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.startNewTest();
      });
    }

    // Language Modal & Selector
    const langPill = document.getElementById('quick-lang-pill');
    if (langPill) {
      langPill.addEventListener('click', () => this.openLanguageModal());
    }

    // Sound Switcher (Cycle profiles: Thock -> Clicky -> Cream -> Bubble -> Typewriter -> Off)
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        const profiles = ['thock', 'clicky', 'cream', 'bubble', 'typewriter', 'off'];
        const currentIdx = profiles.indexOf(this.settings.soundProfile);
        const nextProfile = profiles[(currentIdx + 1) % profiles.length];
        this.settings.soundProfile = nextProfile;
        this.audio.setProfile(nextProfile);
        this.storage.saveSettings(this.settings);
        this.updateSoundButtonUI();

        // Play quick test sample so user immediately hears new profile
        if (nextProfile !== 'off') {
          this.audio.playKeySound(false, false);
        }
      });
    }

    // Volume Boost Switcher: 100% -> 150% (MAX) -> 50% -> 100%
    const volumeToggleBtn = document.getElementById('volume-toggle-btn');
    if (volumeToggleBtn) {
      volumeToggleBtn.addEventListener('click', () => {
        const vols = [1.0, 1.5, 0.5];
        const curVol = this.settings.volume || 1.0;
        let nextIdx = vols.indexOf(curVol) + 1;
        if (nextIdx >= vols.length || nextIdx < 0) nextIdx = 0;
        const nextVol = vols[nextIdx];

        this.settings.volume = nextVol;
        this.audio.setVolume(nextVol);
        this.storage.saveSettings(this.settings);
        this.updateVolumeButtonUI();

        // Play test sample with new volume immediately
        this.audio.playKeySound(false, false);
      });
    }

    // Theme Switcher Button
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.openThemeModal());
    }

    // Shortcuts Button
    const shortcutsBtn = document.getElementById('shortcuts-info-btn');
    if (shortcutsBtn) {
      shortcutsBtn.addEventListener('click', () => this.openShortcutsModal());
    }

    // Results Actions
    const resNextBtn = document.getElementById('res-next-btn');
    if (resNextBtn) {
      resNextBtn.addEventListener('click', () => this.startNewTest());
    }

    const resRepeatBtn = document.getElementById('res-repeat-btn');
    if (resRepeatBtn) {
      resRepeatBtn.addEventListener('click', () => {
        if (this.lastTestConfig && this.lastTestConfig.words) {
          this.startNewTest(this.lastTestConfig.words);
        } else {
          this.startNewTest();
        }
      });
    }

    // Close buttons for modals
    document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.closeAllModals();
      });
    });

    // Setup Modals Content & Search
    this.setupLanguageModal();
    this.setupThemeModal();
    this.setupCustomModal();
  }

  setupLanguageModal() {
    const listContainer = document.getElementById('language-items-container');
    const searchInput = document.getElementById('lang-search-input');
    if (!listContainer) return;

    const renderList = (filterText = '') => {
      listContainer.innerHTML = '';
      const filter = filterText.toLowerCase().trim();

      LANGUAGES.filter(l => 
        l.name.toLowerCase().includes(filter) || 
        l.native.toLowerCase().includes(filter) ||
        l.id.toLowerCase().includes(filter)
      ).forEach(lang => {
        const item = document.createElement('div');
        item.className = 'language-item';
        if (lang.id === this.languageMgr.getCurrentLanguage().id) {
          item.classList.add('selected');
        }

        item.innerHTML = `
          <span class="language-flag">${lang.flag}</span>
          <div class="language-info">
            <span class="language-name">${lang.name}</span>
            <span class="language-native">${lang.native}</span>
          </div>
        `;

        item.addEventListener('click', () => {
          this.languageMgr.setLanguage(lang.id);
          this.settings.language = lang.id;
          this.storage.saveSettings(this.settings);
          this.updateLanguageButtonUI();
          this.closeAllModals();
          this.startNewTest();
        });

        listContainer.appendChild(item);
      });
    };

    renderList();

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderList(e.target.value);
      });
    }
  }

  setupThemeModal() {
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        const theme = card.dataset.theme;
        this.applyTheme(theme);
        this.closeAllModals();
      });
    });
  }

  setupCustomModal() {
    const saveBtn = document.getElementById('custom-text-save-btn');
    const textarea = document.getElementById('custom-text-input');

    if (saveBtn && textarea) {
      saveBtn.addEventListener('click', () => {
        const text = textarea.value.trim();
        if (text) {
          this.settings.customText = text;
          this.settings.mode = 'custom';
          this.storage.saveSettings(this.settings);
          this.updateConfigBarUI();
          this.closeAllModals();
          this.startNewTest();
        }
      });
    }
  }

  openLanguageModal() {
    this.closeAllModals();
    if (this.langModal) {
      this.langModal.classList.add('open');
      const input = document.getElementById('lang-search-input');
      if (input) {
        input.value = '';
        input.focus();
      }
      this.setupLanguageModal();
    }
  }

  openThemeModal() {
    this.closeAllModals();
    if (this.themeModal) this.themeModal.classList.add('open');
  }

  openCustomModal() {
    this.closeAllModals();
    if (this.customModal) {
      this.customModal.classList.add('open');
      const textarea = document.getElementById('custom-text-input');
      if (textarea) {
        textarea.value = this.settings.customText || '';
        textarea.focus();
      }
    }
  }

  openShortcutsModal() {
    this.closeAllModals();
    if (this.shortcutsModal) this.shortcutsModal.classList.add('open');
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
    this.focusInput();
  }
}

// Bootstrap application on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.windyApp = new WindyApp();
  window.windyApp.init();
});
