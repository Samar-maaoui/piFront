import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Tutor } from '../models/user.model';

export interface StudentPreferences {
  topic: string;
  level: string;
  maxBudget: number;
  sessionsPerWeek: number;
  weakTopics?: string[];
}

export interface TutorRecommendation {
  tutorId: number;
  tutor?: Tutor;
  score: number;
  reason: string;
  matchedSpecializations: string[];
}

@Injectable({ providedIn: 'root' })
export class AiRecommendationService {

  private readonly apiUrl = `${environment.apiUrl}/api/ai/recommend`;

  constructor(private http: HttpClient) {}

  recommendTutors(
    tutors: Tutor[],
    preferences: StudentPreferences
  ): Observable<TutorRecommendation[]> {

    // Données allégées pour réduire la taille du prompt
    const tutorSummary = tutors.map(t => ({
      id:             t.id,
      name:           `${t.firstName} ${t.lastName}`,
      specialization: t.specialization,
      rating:         t.rating,
      experienceYears: t.experienceYears,
      hourlyRate:     t.hourlyRate
    }));

    const prompt = `
You are an AI tutor recommendation engine for "Jungle in English", an online tutoring platform.

AVAILABLE TUTORS:
${JSON.stringify(tutorSummary)}

STUDENT PROFILE:
- Topic: ${preferences.topic}
- Level: ${preferences.level}
- Max budget: ${preferences.maxBudget} DT/h
- Sessions/week: ${preferences.sessionsPerWeek}
${preferences.weakTopics?.length ? `- Weak areas: ${preferences.weakTopics.join(', ')}` : ''}

Respond ONLY with a valid JSON array, no markdown, no explanation:
[{"tutorId":1,"score":9,"reason":"...","matchedSpecializations":["spec"]}]`;

    // ✅ L'appel HTTP est bien connecté au pipe/map
    return this.http.post<{ text: string }>(this.apiUrl, { prompt }).pipe(

      map(response => {
        let text = response.text.replace(/```json|```/g, '').trim();

        const start = text.indexOf('[');
        const end   = text.lastIndexOf(']');

        if (start === -1 || end === -1) {
          console.error('Réponse Gemini invalide :', text);
          return [];
        }

        text = text.substring(start, end + 1);

        const recommendations: TutorRecommendation[] = JSON.parse(text);

        return recommendations
          .map(r => ({ ...r, tutor: tutors.find(t => t.id === r.tutorId) }))
          .filter(r => !!r.tutor)
          .sort((a, b) => b.score - a.score);
      }),

      catchError(err => {
        console.error('AiRecommendationService error :', err);
        return of([]);
      })
    );
  }
}