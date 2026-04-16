import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Quiz } from '../models/quiz';

const QUIZ_API_URL = 'http://localhost:8080/api/quizzes';

@Injectable({
    providedIn: 'root'
})
export class QuizService {

    private apiUrl = QUIZ_API_URL;

    constructor(private http: HttpClient) { }

    getAll(): Observable<Quiz[]> {
        return this.http.get<Quiz[]>(this.apiUrl);
    }

    getById(id: number): Observable<Quiz> {
        return this.http.get<Quiz>(`${this.apiUrl}/${id}`);
    }

    getByTutorId(tutorId: number): Observable<Quiz[]> {
        return this.http.get<Quiz[]>(`${this.apiUrl}/tutor/${tutorId}`);
    }

    create(quiz: Partial<Quiz>): Observable<Quiz> {
        const payload = { ...quiz, status: quiz.status ?? 'DRAFT' } as Partial<Quiz>;
        return this.http.post<Quiz>(this.apiUrl, payload);
    }

    update(id: number, quiz: Partial<Quiz>): Observable<Quiz> {
        return this.http.put<Quiz>(`${this.apiUrl}/${id}`, quiz);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    publish(id: number): Observable<Quiz> {
        return this.http.patch<Quiz>(`${this.apiUrl}/${id}/publish`, {});
    }

    archive(id: number): Observable<Quiz> {
        return this.http.patch<Quiz>(`${this.apiUrl}/${id}/archive`, {});
    }
}
