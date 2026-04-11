import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface UnsplashImage {
  url:          string;
  thumb:        string;
  authorName:   string;
  authorLink:   string;
  downloadLink?: string;
}

@Injectable({ providedIn: 'root' })
export class UnsplashService {

  private accessKey = 'm659Nav4yFNYgl-h7SmvpCnGWBquk856O1DCVKSiY-s';
  private api = 'https://api.unsplash.com';
  private cache = new Map<string, UnsplashImage>();

  // ✅ Fallback images statiques par thème (Unsplash direct URLs qui fonctionnent)
  private fallbackImages: Record<string, string> = {
    'education': 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80',
    'english':   'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&q=80',
    'culture':   'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&q=80',
    'science':   'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&q=80',
    'math':      'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
    'history':   'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&q=80',
    'geography': 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?w=800&q=80',
    'default':   'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80'
  };

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  getImageForQuestion(questionText: string): Observable<UnsplashImage> {
    const keywords = this.extractKeywords(questionText);
    const cacheKey = keywords.toLowerCase().trim();

    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    const headers = new HttpHeaders({
      Authorization: `Client-ID ${this.accessKey}`,
      'Accept-Version': 'v1'
    });

    return this.http.get<any>(
      `${this.api}/search/photos`,
      { headers, params: { query: keywords, per_page: '5', orientation: 'landscape' } }
    ).pipe(
      map(res => {
        if (!res.results?.length) return this.getFallback(keywords);
        const photo = res.results[Math.floor(Math.random() * Math.min(5, res.results.length))];
        const image: UnsplashImage = {
          url:          photo.urls.regular,
          thumb:        photo.urls.thumb,
          authorName:   photo.user.name,
          authorLink:   `${photo.user.links.html}?utm_source=quiz_app&utm_medium=referral`,
          downloadLink: photo.links.download_location
        };
        this.cache.set(cacheKey, image);
        return image;
      }),
      catchError(err => {
        console.warn('Unsplash API error, using fallback:', err.status);
        return of(this.getFallback(keywords));
      })
    );
  }

  private getFallback(keywords: string): UnsplashImage {
    // Chercher une image de fallback qui correspond au keyword
    const match = Object.keys(this.fallbackImages).find(k => keywords.includes(k));
    const url = this.fallbackImages[match || 'default'];
    const fallback: UnsplashImage = {
      url,
      thumb: url,
      authorName: 'Unsplash',
      authorLink: 'https://unsplash.com'
    };
    this.cache.set(keywords, fallback);
    return fallback;
  }

  private extractKeywords(text: string): string {
    const stopWords = new Set([
      'what','is','are','the','a','an','of','in','on','at','to','for',
      'with','by','from','how','why','when','where','which','who',
      'does','do','did','has','have','had','will','would','could','should'
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^a-zA-Z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w))
      .slice(0, 3);

    return words.join(' ') || 'education learning';
  }

  clearCache(): void {
    this.cache.clear();
  }
}