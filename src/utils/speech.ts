/**
 * 100% Free & Native Browser Speech Synthesis (Web Speech API)
 * - Zero external API calls, zero cost, completely offline
 * - Fixes Chrome asynchronous voice loading, paused state, and garbage-collection cutoffs
 * - Accurate word-by-word boundary tracking for real-time highlighting
 */

declare global {
  interface Window {
    __ttsActiveUtterance?: SpeechSynthesisUtterance | null;
    __ttsHeartbeat?: number | null;
  }
}

class NativeSpeechManager {
  private voices: SpeechSynthesisVoice[] = [];
  private audioCtx: AudioContext | null = null;
  private voiceListeners: ((voices: SpeechSynthesisVoice[]) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.refreshVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.refreshVoices();
      };
    }
  }

  private refreshVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.voices = window.speechSynthesis.getVoices();
    this.voiceListeners.forEach(listener => listener(this.voices));
  }

  public onVoicesReady(cb: (voices: SpeechSynthesisVoice[]) => void) {
    if (this.voices.length > 0) {
      cb(this.voices);
    } else {
      this.voiceListeners.push(cb);
    }
  }

  public getArabicVoice(): SpeechSynthesisVoice | null {
    this.refreshVoices();
    if (!this.voices.length) return null;

    // Search for Arabic voices across all browsers and operating systems
    // e.g. Google العربية, Microsoft Naayf / Hoda / Shakir, Apple Maged / Tarik / Laila
    const voice = this.voices.find(v => {
      const l = v.lang.toLowerCase();
      const n = v.name.toLowerCase();
      return (
        l.startsWith('ar') ||
        n.includes('arabic') ||
        v.name.includes('العربية') ||
        n.includes('maged') ||
        n.includes('tarik') ||
        n.includes('naayf') ||
        n.includes('hoda') ||
        n.includes('shakir') ||
        n.includes('fatima')
      );
    });

    return voice || null;
  }

  /**
   * Speak text with real-time word boundary highlighting
   */
  public speakText(
    text: string,
    rate: number = 0.85,
    onEnd?: () => void,
    onBoundary?: (charIndex: number, charLength?: number) => void,
    onError?: (err: unknown) => void
  ): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis is not supported in this browser environment');
      if (onEnd) onEnd();
      return false;
    }

    if (!text || !text.trim()) {
      if (onEnd) onEnd();
      return true;
    }

    // 1. Unfreeze if Chrome was paused
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // 2. Cancel previous utterance
    window.speechSynthesis.cancel();
    this.clearHeartbeat();

    // 3. Prepare the utterance
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.rate = Math.max(0.5, Math.min(1.5, rate));
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // 4. Resolve voice
    const arabicVoice = this.getArabicVoice();
    if (arabicVoice) {
      utterance.voice = arabicVoice;
      utterance.lang = arabicVoice.lang;
    } else {
      // Standard Arabic locale (supported on Android, Chrome, Edge, Safari)
      utterance.lang = 'ar-SA';
    }

    // 5. Track word boundaries for visual highlighting
    utterance.onboundary = (e) => {
      if (e.name === 'word' && onBoundary) {
        onBoundary(e.charIndex, e.charLength);
      }
    };

    utterance.onend = () => {
      this.clearHeartbeat();
      window.__ttsActiveUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      this.clearHeartbeat();
      window.__ttsActiveUtterance = null;
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('TTS utterance event:', e.error);
        if (onError) onError(e);
      }
      if (onEnd) onEnd();
    };

    // 6. Global reference to prevent Chrome garbage collector bug
    window.__ttsActiveUtterance = utterance;

    // 7. Chrome 15s pause workaround
    window.__ttsHeartbeat = window.setInterval(() => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else {
        this.clearHeartbeat();
      }
    }, 10000);

    // 8. 50ms delay to prevent Chrome cancel() race condition
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);

    return true;
  }

  /**
   * Speak a single word immediately when clicked
   */
  public speakWord(word: string, rate: number = 0.85): void {
    if (!word || !word.trim()) return;
    const cleanWord = word.replace(/[.,:;،؟!()[\]{}"'«»]/g, '').trim();
    if (!cleanWord) return;

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();
    this.clearHeartbeat();

    const utterance = new SpeechSynthesisUtterance(cleanWord);
    utterance.rate = Math.max(0.5, Math.min(1.5, rate));
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const arabicVoice = this.getArabicVoice();
    if (arabicVoice) {
      utterance.voice = arabicVoice;
      utterance.lang = arabicVoice.lang;
    } else {
      utterance.lang = 'ar-SA';
    }

    utterance.onend = () => {
      window.__ttsActiveUtterance = null;
    };

    window.__ttsActiveUtterance = utterance;

    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  }

  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.clearHeartbeat();
      window.speechSynthesis.cancel();
      window.__ttsActiveUtterance = null;
    }
  }

  public pause(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  public resume(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }

  private clearHeartbeat(): void {
    if (window.__ttsHeartbeat) {
      clearInterval(window.__ttsHeartbeat);
      window.__ttsHeartbeat = null;
    }
  }

  // Web Audio feedback sounds (clicks & chimes)
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public playSuccessSound(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    } catch {}
  }

  public playErrorSound(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.25);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  public playClickSound(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }
}

export const speech = new NativeSpeechManager();
