import { uzbekLatin, uzbekCyrillic, uzbekQuotes } from './uzbek.js';
import { japaneseRomaji, japaneseKana, japaneseQuotes } from './japanese.js';
import { englishWords, englishQuotes } from './english.js';
import { russianWords, russianQuotes } from './russian.js';
import { arabicWords, arabicQuotes } from './arabic.js';
import { spanishWords, spanishQuotes } from './spanish.js';
import { germanWords, germanQuotes } from './german.js';

export const LANGUAGES = [
  {
    id: 'uzbek_latin',
    name: 'Uzbek (Latin)',
    native: "O'zbekcha (Lotin)",
    flag: '🇺🇿',
    isRtl: false,
    words: uzbekLatin,
    quotes: uzbekQuotes
  },
  {
    id: 'uzbek_cyrillic',
    name: 'Uzbek (Cyrillic)',
    native: 'Ўзбекча (Кирилл)',
    flag: '🇺🇿',
    isRtl: false,
    words: uzbekCyrillic,
    quotes: uzbekQuotes
  },
  {
    id: 'japanese_romaji',
    name: 'Japanese (Romaji)',
    native: '日本語 (Romaji)',
    flag: '🇯🇵',
    isRtl: false,
    words: japaneseRomaji,
    quotes: japaneseQuotes
  },
  {
    id: 'japanese_kana',
    name: 'Japanese (Kana)',
    native: '日本語 (かな)',
    flag: '🇯🇵',
    isRtl: false,
    words: japaneseKana,
    quotes: japaneseQuotes
  },
  {
    id: 'english',
    name: 'English',
    native: 'English',
    flag: '🇬🇧',
    isRtl: false,
    words: englishWords,
    quotes: englishQuotes
  },
  {
    id: 'russian',
    name: 'Russian',
    native: 'Русский',
    flag: '🇷🇺',
    isRtl: false,
    words: russianWords,
    quotes: russianQuotes
  },
  {
    id: 'arabic',
    name: 'Arabic',
    native: 'العربية',
    flag: '🇸🇦',
    isRtl: true,
    words: arabicWords,
    quotes: arabicQuotes
  },
  {
    id: 'spanish',
    name: 'Spanish',
    native: 'Español',
    flag: '🇪🇸',
    isRtl: false,
    words: spanishWords,
    quotes: spanishQuotes
  },
  {
    id: 'german',
    name: 'German',
    native: 'Deutsch',
    flag: '🇩🇪',
    isRtl: false,
    words: germanWords,
    quotes: germanQuotes
  }
];

export class LanguageManager {
  constructor(defaultLangId = 'uzbek_latin') {
    this.currentLanguage = this.getLanguage(defaultLangId) || LANGUAGES[0];
  }

  getLanguage(id) {
    return LANGUAGES.find(lang => lang.id === id);
  }

  setLanguage(id) {
    const found = this.getLanguage(id);
    if (found) {
      this.currentLanguage = found;
      return true;
    }
    return false;
  }

  getAllLanguages() {
    return LANGUAGES;
  }

  getCurrentLanguage() {
    return this.currentLanguage;
  }

  generateWords(count = 50, includePunctuation = false, includeNumbers = false) {
    const list = this.currentLanguage.words;
    if (!list || list.length === 0) return ["windy", "typing", "server"];

    const result = [];
    const punctuationMarks = ['.', ',', '!', '?', ';'];

    for (let i = 0; i < count; i++) {
      // 10% chance of inserting a number if enabled
      if (includeNumbers && Math.random() < 0.1) {
        const randNum = Math.floor(Math.random() * 900) + 10;
        result.push(randNum.toString());
        continue;
      }

      let word = list[Math.floor(Math.random() * list.length)];

      if (includePunctuation) {
        // 15% chance capitalize first letter
        if (Math.random() < 0.15 && !this.currentLanguage.isRtl) {
          word = word.charAt(0).toUpperCase() + word.slice(1);
        }
        // 15% chance add punctuation to end
        if (Math.random() < 0.15) {
          const mark = punctuationMarks[Math.floor(Math.random() * punctuationMarks.length)];
          word = word + mark;
        }
      }

      result.push(word);
    }

    return result;
  }

  getRandomQuote() {
    const quotes = this.currentLanguage.quotes;
    if (quotes && quotes.length > 0) {
      const q = quotes[Math.floor(Math.random() * quotes.length)];
      return q.text;
    }
    return "The wind whispered ancient secrets through the calm night.";
  }
}
