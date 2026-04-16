// tts.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TtsService {

  private api = 'http://localhost:8080/api/tts';

  // ✅ Cache audio par texte — évite d'appeler ElevenLabs deux fois pour le même texte
  private audioCache = new Map<string, string>();

  // État courant
  private currentAudio: HTMLAudioElement | null = null;
  isPlaying = false;

  constructor(private http: HttpClient) {}

  // ── Speak ─────────────────────────────────────────────────────────────────

  speak(text: string): void {
    if (!text?.trim()) return;

    // Arrêter l'audio en cours
    this.stop();

    // Vérifier le cache
    const cached = this.audioCache.get(text);
    if (cached) {
      this.playAudioUrl(cached);
      return;
    }

    // Appeler le backend
    this.http.post(`${this.api}/speak`, { text }, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.audioCache.set(text, url); // mettre en cache
          this.playAudioUrl(url);
        },
        error: (err) => {
          console.warn('TTS error:', err);
          this.isPlaying = false;
        }
      });
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.isPlaying = false;
  }

  toggle(text: string): void {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.speak(text);
    }
  }

  // ── Privé ──────────────────────────────────────────────────────────────────

  private playAudioUrl(url: string): void {
    this.currentAudio = new Audio(url);
    this.isPlaying    = true;

    this.currentAudio.onended = () => {
      this.isPlaying = false;
    };

    this.currentAudio.onerror = () => {
      this.isPlaying = false;
      console.warn('Audio playback error');
    };

    this.currentAudio.play().catch(() => {
      this.isPlaying = false;
    });
  }

  // Nettoyer le cache (à appeler dans ngOnDestroy du composant)
  clearCache(): void {
    this.audioCache.forEach(url => URL.revokeObjectURL(url));
    this.audioCache.clear();
  }
}