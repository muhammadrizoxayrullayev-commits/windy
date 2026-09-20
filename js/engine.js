// High-Performance Core Typing Engine for Windy

export class TypingEngine {
  constructor(options = {}) {
    this.container = options.container;
    this.caret = options.caret;
    this.arena = options.arena || (this.container ? this.container.parentElement : null);
    this.hudElement = options.hudElement;
    this.audio = options.audio;
    this.onComplete = options.onComplete || (() => {});
    this.onTick = options.onTick || (() => {});
    this.onKeystroke = options.onKeystroke || (() => {});
    this.blinkTimeout = null;
    this.lastActiveWordEl = null;
    this.caretRAF = null;
    this.hudTimerEl = null;
    this.hudWpmEl = null;
    this.hudAccEl = null;
    this.hudStreakEl = null;
    this.progressFillEl = null;
    this.deckEl = null;
    this.meterEl = null;
    this.meterTimeout = null;

    // State
    this.words = [];
    this.currentWordIdx = 0;
    this.currentLetterIdx = 0;
    this.typedHistory = []; // Array of word records
    this.currentStreak = 0;
    this.maxStreak = 0;

    this.mode = 'time'; // 'time' | 'words' | 'quote' | 'zen' | 'custom'
    this.timeLimit = 15;
    this.wordLimit = 25;
    this.isRtl = false;

    this.timer = null;
    this.timeElapsed = 0;
    this.timeRemaining = 15;
    this.testActive = false;
    this.testFinished = false;
    this.startTime = null;

    // Metrics tracking
    this.timeline = []; // [{ time, wpm, raw, errors }]
    this.totalCorrectChars = 0;
    this.totalIncorrectChars = 0;
    this.totalExtraChars = 0;
    this.totalMissedChars = 0;
    this.currentSecondErrors = 0;

    // Line scroll tracking
    this.activeLineOffset = 0;
    this.baseLineTop = null;
    this.lineHeight = 44;
  }

  initTest(wordsList, config = {}) {
    this.reset();

    this.words = wordsList;
    this.mode = config.mode || 'time';
    this.timeLimit = config.timeLimit || 15;
    this.wordLimit = config.wordLimit || 25;
    this.isRtl = !!config.isRtl;
    this.timeRemaining = this.timeLimit;

    // Setup RTL on container if needed
    if (this.isRtl) {
      this.container.setAttribute('dir', 'rtl');
    } else {
      this.container.removeAttribute('dir');
    }

    this.renderWords();
    this.updateHUD();
    
    // Position caret accurately after layout is ready
    requestAnimationFrame(() => {
      this.updateCaretPosition();
      if (this.caret) {
        setTimeout(() => {
          this.caret.style.transition = 'left 0.09s cubic-bezier(0.16, 1, 0.3, 1), top 0.12s cubic-bezier(0.16, 1, 0.3, 1)';
        }, 50);
      }
    });
  }

  reset() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.blinkTimeout) {
      clearTimeout(this.blinkTimeout);
      this.blinkTimeout = null;
    }

    this.words = [];
    this.currentWordIdx = 0;
    this.currentLetterIdx = 0;
    this.typedHistory = [];

    this.timeElapsed = 0;
    this.testActive = false;
    this.testFinished = false;
    this.startTime = null;

    this.timeline = [];
    this.totalCorrectChars = 0;
    this.totalIncorrectChars = 0;
    this.totalExtraChars = 0;
    this.totalMissedChars = 0;
    this.currentSecondErrors = 0;

    this.activeLineOffset = 0;
    this.baseLineTop = null;
    this.lastActiveWordEl = null;
    this.currentStreak = 0;
    this.maxStreak = 0;

    if (!this.deckEl) this.deckEl = document.getElementById('typing-deck');
    if (this.deckEl) this.deckEl.classList.remove('typing-active');

    if (!this.progressFillEl) this.progressFillEl = document.getElementById('deck-progress-fill');
    if (this.progressFillEl) this.progressFillEl.style.width = '0%';

    if (!this.hudStreakEl) this.hudStreakEl = document.getElementById('hud-live-streak');
    if (this.hudStreakEl) this.hudStreakEl.textContent = '0';

    if (this.container) {
      this.container.style.transform = 'translate3d(0, 0, 0)';
      this.container.innerHTML = '';
    }

    if (this.caret) {
      this.caret.style.transition = 'none';
      this.caret.classList.add('blink');
      this.caret.style.display = 'block';
    }
  }

  renderWords() {
    this.container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    this.words.forEach((wordStr, wIdx) => {
      const wordDiv = document.createElement('div');
      wordDiv.className = 'word';
      wordDiv.dataset.wordIndex = wIdx;

      for (let i = 0; i < wordStr.length; i++) {
        const letterSpan = document.createElement('span');
        letterSpan.className = 'letter';
        letterSpan.textContent = wordStr[i];
        wordDiv.appendChild(letterSpan);
      }

      fragment.appendChild(wordDiv);
    });

    this.container.appendChild(fragment);
  }

  startTest() {
    this.testActive = true;
    this.testFinished = false;
    this.startTime = Date.now();
    this.caret.classList.remove('blink');

    if (!this.deckEl) this.deckEl = document.getElementById('typing-deck');
    if (this.deckEl) this.deckEl.classList.add('typing-active');

    if (this.hudElement) {
      this.hudElement.classList.add('active');
    }

    // Start 1-second interval for HUD & timeline data collection
    this.timer = setInterval(() => {
      this.timeElapsed++;

      if (this.mode === 'time') {
        this.timeRemaining--;
        if (this.timeRemaining <= 0) {
          this.finishTest();
          return;
        }
      }

      this.recordTimelinePoint();
      this.updateHUD(true);
      this.onTick({
        timeElapsed: this.timeElapsed,
        timeRemaining: this.timeRemaining,
        wpm: this.getCurrentWPM(),
        accuracy: this.getCurrentAccuracy()
      });
    }, 1000);
  }

  recordTimelinePoint() {
    const wpm = this.getCurrentWPM();
    const raw = this.getCurrentRawWPM();
    this.timeline.push({
      time: this.timeElapsed,
      wpm: wpm,
      raw: raw,
      errors: this.currentSecondErrors
    });
    this.currentSecondErrors = 0;
  }

  finishTest() {
    if (this.testFinished) return;
    this.testFinished = true;
    this.testActive = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Capture final timeline point
    this.recordTimelinePoint();

    // Calculate missed characters in words remaining (if word mode)
    if (this.mode === 'words' || this.mode === 'quote') {
      for (let w = this.currentWordIdx; w < this.words.length; w++) {
        const expectedWord = this.words[w];
        if (w === this.currentWordIdx) {
          this.totalMissedChars += Math.max(0, expectedWord.length - this.currentLetterIdx);
        } else {
          this.totalMissedChars += expectedWord.length;
        }
      }
    }

    const durationSec = Math.max(1, this.timeElapsed || 1);
    const finalWpm = this.getCurrentWPM();
    const finalRaw = this.getCurrentRawWPM();
    const finalAcc = this.getCurrentAccuracy();
    const consistency = this.calculateConsistency();

    const results = {
      wpm: finalWpm,
      rawWpm: finalRaw,
      accuracy: finalAcc,
      consistency: consistency,
      time: durationSec,
      mode: this.mode,
      modeDetail: this.mode === 'time' ? `${this.timeLimit}s` : `${this.wordLimit} words`,
      characters: {
        correct: this.totalCorrectChars,
        incorrect: this.totalIncorrectChars,
        extra: this.totalExtraChars,
        missed: this.totalMissedChars
      },
      timeline: this.timeline
    };

    if (this.caret) {
      this.caret.style.display = 'none';
    }

    this.onComplete(results);
  }

  isCharMatch(typed, expected) {
    if (typed === expected) return true;
    // Normalize Uzbek and international quotes / apostrophes
    const apostrophes = ["'", "’", "‘", "`", "ʻ", "ʼ", "´", "ʹ"];
    if (apostrophes.includes(typed) && apostrophes.includes(expected)) {
      return true;
    }
    return false;
  }

  handleWordDelete() {
    const currentWordEl = this.container.children[this.currentWordIdx];
    if (!currentWordEl) return;

    this.audio.playKeySound(false, false);

    if (this.currentLetterIdx > 0) {
      // Clear typed letters in current word
      const letters = Array.from(currentWordEl.children);
      letters.forEach(l => {
        if (l.classList.contains('extra')) {
          l.remove();
          this.totalExtraChars = Math.max(0, this.totalExtraChars - 1);
        } else {
          if (l.classList.contains('correct')) {
            this.totalCorrectChars = Math.max(0, this.totalCorrectChars - 1);
          } else if (l.classList.contains('incorrect')) {
            this.totalIncorrectChars = Math.max(0, this.totalIncorrectChars - 1);
          }
          l.className = 'letter';
        }
      });
      currentWordEl.classList.remove('error-highlight');
      this.currentLetterIdx = 0;
    } else if (this.currentWordIdx > 0) {
      // Jump back to previous word and clear it
      this.currentWordIdx--;
      const prevWordEl = this.container.children[this.currentWordIdx];
      if (prevWordEl) {
        prevWordEl.classList.remove('error-highlight');
        const letters = Array.from(prevWordEl.children);
        letters.forEach(l => {
          if (l.classList.contains('extra')) {
            l.remove();
            this.totalExtraChars = Math.max(0, this.totalExtraChars - 1);
          } else {
            if (l.classList.contains('correct')) {
              this.totalCorrectChars = Math.max(0, this.totalCorrectChars - 1);
            } else if (l.classList.contains('incorrect')) {
              this.totalIncorrectChars = Math.max(0, this.totalIncorrectChars - 1);
            }
            l.className = 'letter';
          }
        });
        this.currentLetterIdx = 0;
        this.checkLineScroll();
      }
    }

    this.updateCaretPosition();
    this.updateHUD();
  }

  handleKeyDown(e) {
    if (this.testFinished) return;

    // Support Ctrl + Backspace to delete whole word
    if (e.ctrlKey && e.key === 'Backspace') {
      e.preventDefault();
      this.handleWordDelete();
      return;
    }

    // Ignore other control key combinations
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (['Shift', 'CapsLock', 'Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      return;
    }

    // Start timer on first printable character or space
    if (!this.testActive && !this.testFinished && (e.key.length === 1 || e.key === ' ')) {
      this.startTest();
    }

    const currentWordEl = this.container.children[this.currentWordIdx];
    if (!currentWordEl) return;

    const expectedWord = this.words[this.currentWordIdx] || '';

    // Spacebar: advance to next word
    if (e.key === ' ') {
      e.preventDefault();
      if (this.currentLetterIdx === 0 && currentWordEl.children.length === expectedWord.length) {
        return; // Don't advance on empty word with no typing
      }

      this.audio.playKeySound(true, false);

      // Check if current word was completed correctly
      const letters = currentWordEl.children;
      let wordHasError = false;

      // Untyped remaining letters marked missed
      for (let i = this.currentLetterIdx; i < expectedWord.length; i++) {
        wordHasError = true;
        this.totalMissedChars++;
      }

      for (let i = 0; i < letters.length; i++) {
        const l = letters[i];
        if (l.classList.contains('incorrect') || l.classList.contains('extra')) {
          wordHasError = true;
          break;
        }
      }

      if (wordHasError) {
        currentWordEl.classList.add('error-highlight');
        this.currentStreak = 0;
      }

      // Space adds to correct characters count if word was clean
      if (!wordHasError) {
        this.totalCorrectChars++;
      }

      this.triggerMeterBounce();
      this.onKeystroke();

      this.currentWordIdx++;
      this.currentLetterIdx = 0;

      // Check if words mode or quote mode is complete
      if (this.currentWordIdx >= this.words.length) {
        this.finishTest();
        return;
      }

      this.checkLineScroll();
      this.updateCaretPosition();
      this.updateHUD();
      return;
    }

    // Backspace: delete letter
    if (e.key === 'Backspace') {
      e.preventDefault();
      this.audio.playKeySound(false, false);
      this.triggerMeterBounce();

      if (this.currentLetterIdx > 0) {
        this.currentLetterIdx--;
        const letters = currentWordEl.children;
        const targetLetter = letters[this.currentLetterIdx];

        if (targetLetter) {
          if (targetLetter.classList.contains('extra')) {
            targetLetter.remove();
            this.totalExtraChars = Math.max(0, this.totalExtraChars - 1);
          } else {
            if (targetLetter.classList.contains('correct')) {
              this.totalCorrectChars = Math.max(0, this.totalCorrectChars - 1);
            } else if (targetLetter.classList.contains('incorrect')) {
              this.totalIncorrectChars = Math.max(0, this.totalIncorrectChars - 1);
            }
            targetLetter.className = 'letter';
          }
        }
      } else if (this.currentWordIdx > 0) {
        // Option to jump back to previous word if it had errors
        const prevWordEl = this.container.children[this.currentWordIdx - 1];
        if (prevWordEl && prevWordEl.classList.contains('error-highlight')) {
          this.currentWordIdx--;
          prevWordEl.classList.remove('error-highlight');
          this.currentLetterIdx = prevWordEl.children.length;
          this.checkLineScroll();
        }
      }

      this.updateCaretPosition();
      this.updateHUD();
      return;
    }

    // Single character input
    if (e.key.length === 1) {
      e.preventDefault();

      if (this.currentLetterIdx < expectedWord.length) {
        const letters = currentWordEl.children;
        const letterEl = letters[this.currentLetterIdx];
        const isMatch = this.isCharMatch(e.key, expectedWord[this.currentLetterIdx]);

        if (isMatch) {
          letterEl.className = 'letter correct';
          this.totalCorrectChars++;
          this.currentStreak++;
          if (this.currentStreak > this.maxStreak) this.maxStreak = this.currentStreak;
          this.audio.playKeySound(false, false);
          this.triggerMeterBounce();
          this.onKeystroke();
        } else {
          letterEl.className = 'letter incorrect';
          this.totalIncorrectChars++;
          this.currentSecondErrors++;
          this.currentStreak = 0;
          this.audio.playKeySound(false, true);
          this.triggerMeterBounce();
        }
        this.currentLetterIdx++;
      } else {
        // Extra letters beyond word length (max 10 extra)
        const extraCount = currentWordEl.children.length - expectedWord.length;
        if (extraCount < 10) {
          const extraSpan = document.createElement('span');
          extraSpan.className = 'letter extra';
          extraSpan.textContent = e.key;
          currentWordEl.appendChild(extraSpan);
          this.currentLetterIdx++;
          this.totalExtraChars++;
          this.currentSecondErrors++;
          this.currentStreak = 0;
          this.audio.playKeySound(false, true);
          this.triggerMeterBounce();
        }
      }

      // Check if last word in list was typed
      if (this.currentWordIdx === this.words.length - 1 && this.currentLetterIdx === expectedWord.length) {
        if (this.mode === 'words' || this.mode === 'quote') {
          this.finishTest();
          return;
        }
      }

      this.updateCaretPosition();
      this.updateHUD();
    }
  }

  checkLineScroll() {
    const currentWordEl = this.container.children[this.currentWordIdx];
    if (!currentWordEl) return;

    if (this.baseLineTop === null) {
      this.baseLineTop = currentWordEl.offsetTop;
    }

    const currentTop = currentWordEl.offsetTop;
    const diff = currentTop - this.baseLineTop;

    // Dynamic line height threshold for larger fonts (e.g. 2.25rem font ~ 54px line height)
    const threshold = (currentWordEl.offsetHeight || 54) * 0.45;

    // Smooth GPU translate when active line moves past line 1
    if (diff > threshold && diff !== this.activeLineOffset) {
      this.activeLineOffset = diff;
      this.container.style.transform = `translate3d(0, -${this.activeLineOffset}px, 0)`;
      requestAnimationFrame(() => {
        this.updateCaretPosition();
      });
      setTimeout(() => {
        this.updateCaretPosition();
      }, 190);
    }
  }

  updateCaretPosition() {
    if (!this.caret || !this.container) return;

    const currentWordEl = this.container.children[this.currentWordIdx];
    if (!currentWordEl) return;

    // Highlight active word without expensive full-DOM loop
    if (this.lastActiveWordEl !== currentWordEl) {
      if (this.lastActiveWordEl) {
        this.lastActiveWordEl.classList.remove('active');
      }
      currentWordEl.classList.add('active');
      this.lastActiveWordEl = currentWordEl;
    }

    // Keep caret solid while actively typing, resume blinking after 700ms pause
    if (this.testActive && !this.testFinished) {
      this.caret.classList.remove('blink');
      clearTimeout(this.blinkTimeout);
      this.blinkTimeout = setTimeout(() => {
        if (this.caret && !this.testFinished) {
          this.caret.classList.add('blink');
        }
      }, 700);
    }

    // Batch caret repositioning into requestAnimationFrame to prevent forced synchronous reflow
    if (this.caretRAF) {
      cancelAnimationFrame(this.caretRAF);
    }
    this.caretRAF = requestAnimationFrame(() => {
      this.applyCaretPosition(currentWordEl);
    });
  }

  applyCaretPosition(currentWordEl) {
    if (!this.caret || !currentWordEl) return;

    const arena = this.arena || this.container.parentElement || document.getElementById('typing-arena');
    if (!arena) return;

    const arenaRect = arena.getBoundingClientRect();
    const letters = currentWordEl.children;

    let left = 0;
    let top = 0;
    let height = 36;

    if (this.currentLetterIdx < letters.length) {
      const activeLetter = letters[this.currentLetterIdx];
      const letterRect = activeLetter.getBoundingClientRect();

      if (this.isRtl) {
        left = letterRect.right - arenaRect.left;
      } else {
        left = letterRect.left - arenaRect.left;
      }

      height = letterRect.height > 0 ? letterRect.height : 36;
      top = letterRect.top - arenaRect.top;
    } else if (letters.length > 0) {
      const lastLetter = letters[letters.length - 1];
      const letterRect = lastLetter.getBoundingClientRect();

      if (this.isRtl) {
        left = letterRect.left - arenaRect.left;
      } else {
        left = letterRect.right - arenaRect.left;
      }

      height = letterRect.height > 0 ? letterRect.height : 36;
      top = letterRect.top - arenaRect.top;
    } else {
      const wordRect = currentWordEl.getBoundingClientRect();
      left = wordRect.left - arenaRect.left;
      top = wordRect.top - arenaRect.top;
      height = wordRect.height > 0 ? wordRect.height : 36;
    }

    const caretHeight = Math.round(height * 0.88);
    const caretTop = Math.round(top + (height - caretHeight) / 2);

    // Hardware-accelerated GPU translate3d positioning (eliminates layout thrashing)
    this.caret.style.transform = `translate3d(${Math.round(left)}px, ${caretTop}px, 0)`;
    this.caret.style.height = `${caretHeight}px`;
  }

  getCurrentWPM() {
    const minutes = Math.max(0.016, (Date.now() - (this.startTime || Date.now())) / 60000);
    const netWords = Math.max(0, this.totalCorrectChars / 5);
    return Math.round(netWords / minutes) || 0;
  }

  getCurrentRawWPM() {
    const minutes = Math.max(0.016, (Date.now() - (this.startTime || Date.now())) / 60000);
    const grossChars = this.totalCorrectChars + this.totalIncorrectChars + this.totalExtraChars;
    return Math.round((grossChars / 5) / minutes) || 0;
  }

  getCurrentAccuracy() {
    const total = this.totalCorrectChars + this.totalIncorrectChars + this.totalExtraChars;
    if (total === 0) return 100;
    return Math.max(0, Math.round((this.totalCorrectChars / total) * 100));
  }

  calculateConsistency() {
    if (this.timeline.length < 2) return 100;
    const wpms = this.timeline.map(t => t.wpm);
    const avg = wpms.reduce((a, b) => a + b, 0) / wpms.length;
    if (avg === 0) return 100;
    const variance = wpms.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / wpms.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / avg) * 100;
    return Math.max(0, Math.min(100, Math.round(100 - cv)));
  }

  triggerMeterBounce() {
    if (!this.meterEl) this.meterEl = document.getElementById('deck-sound-meter');
    if (this.meterEl) {
      this.meterEl.classList.add('bouncing');
      clearTimeout(this.meterTimeout);
      this.meterTimeout = setTimeout(() => {
        if (this.meterEl) this.meterEl.classList.remove('bouncing');
      }, 90);
    }
  }

  updateHUD(force = false) {
    if (!this.hudElement) return;

    if (!this.hudTimerEl) this.hudTimerEl = document.getElementById('hud-timer');
    if (!this.hudWpmEl) this.hudWpmEl = document.getElementById('hud-live-wpm');
    if (!this.hudAccEl) this.hudAccEl = document.getElementById('hud-live-acc');
    if (!this.hudStreakEl) this.hudStreakEl = document.getElementById('hud-live-streak');
    if (!this.progressFillEl) this.progressFillEl = document.getElementById('deck-progress-fill');

    if (this.mode === 'time') {
      if (this.hudTimerEl) this.hudTimerEl.textContent = this.timeRemaining.toString();
    } else if (this.mode === 'words') {
      if (this.hudTimerEl) this.hudTimerEl.textContent = `${this.currentWordIdx}/${this.wordLimit}`;
    }

    if (this.hudStreakEl) {
      this.hudStreakEl.textContent = this.currentStreak.toString();
    }

    // Dynamic Top Progress Fill
    if (this.progressFillEl) {
      let pct = 0;
      if (this.mode === 'time') {
        pct = ((this.timeLimit - this.timeRemaining) / Math.max(1, this.timeLimit)) * 100;
      } else if (this.mode === 'words') {
        pct = (this.currentWordIdx / Math.max(1, this.wordLimit)) * 100;
      } else if (this.mode === 'quote') {
        pct = (this.currentWordIdx / Math.max(1, this.words.length)) * 100;
      }
      this.progressFillEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    }

    if (force || this.currentLetterIdx === 0) {
      if (this.hudWpmEl) this.hudWpmEl.textContent = this.getCurrentWPM().toString();
      if (this.hudAccEl) this.hudAccEl.textContent = `${this.getCurrentAccuracy()}%`;
    }
  }
}
