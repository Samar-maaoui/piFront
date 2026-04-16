import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Quiz } from '../Quiz/quiz';

const QUIZ_API_URL = 'http://localhost:8080/api/quizzes';

@Injectable({
  providedIn: 'root'
})
export class QuizService {

  private apiUrl = QUIZ_API_URL;

  constructor(private http: HttpClient) {}

  // GET /api/quizzes
  getAll(): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(this.apiUrl);
  }

  // GET /api/quizzes/{id}
  getById(id: number): Observable<Quiz> {
    return this.http.get<Quiz>(`${this.apiUrl}/${id}`);
  }

  // ✅ GET /api/quizzes/tutor/{tutorId}
  getByTutorId(tutorId: number): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(`${this.apiUrl}/tutor/${tutorId}`);
  }

  // POST /api/quizzes
  create(quiz: Partial<Quiz>): Observable<Quiz> {
    const payload = { ...quiz, status: quiz.status ?? 'DRAFT' } as Partial<Quiz>;
    return this.http.post<Quiz>(this.apiUrl, this.toBody(payload));
  }

  // PUT /api/quizzes/{id}
  update(id: number, quiz: Partial<Quiz>): Observable<Quiz> {
    return this.http.put<Quiz>(`${this.apiUrl}/${id}`, this.toBody(quiz));
  }

  // ✅ PATCH /api/quizzes/{id}/publish
  publish(id: number): Observable<Quiz> {
    return this.http.patch<Quiz>(`${this.apiUrl}/${id}/publish`, {});
  }

  // ✅ PATCH /api/quizzes/{id}/archive
  archive(id: number): Observable<Quiz> {
    return this.http.patch<Quiz>(`${this.apiUrl}/${id}/archive`, {});
  }

  // ✅ PATCH /api/quizzes/{id}/draft
  setDraft(id: number): Observable<Quiz> {
    return this.http.patch<Quiz>(`${this.apiUrl}/${id}/draft`, {});
  }

  // DELETE /api/quizzes/{id}
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private toBody(quiz: Partial<Quiz>): Record<string, unknown> {
    return {
      title:        quiz.title,
      description:  quiz.description,
      level:        quiz.level,
      duration:     quiz.duration,
      passingScore: quiz.passingScore,
      maxAttempts:  quiz.maxAttempts,
      isAdaptive:   quiz.isAdaptive ?? false,
      status:       quiz.status    ?? 'DRAFT',
      createdBy:    quiz.createdBy,
      questions:    quiz.questions?.map((q: any, qi: number) => ({
        text:       q.text,
        points:     q.points,
        orderIndex: q.orderIndex ?? qi,
        answers:    q.answers?.map((a: any, ai: number) => ({
          text:       a.text,
          isCorrect:  a.isCorrect,
          orderIndex: a.orderIndex ?? ai
        }))
      }))
    };
  }
}