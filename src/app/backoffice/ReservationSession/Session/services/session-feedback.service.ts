import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SessionFeedback } from '../../../../core/models/SessionFeedback';

@Injectable({ providedIn: 'root' })
export class SessionFeedbackService {
  private api = 'http://localhost:8080/api/feedback';

  constructor(private http: HttpClient) {}

  add(sessionId: number, payload: Partial<SessionFeedback>): Observable<SessionFeedback> {
    return this.http.post<SessionFeedback>(`${this.api}/session/${sessionId}`, payload);
  }

  getBySession(sessionId: number): Observable<SessionFeedback> {
    return this.http.get<SessionFeedback>(`${this.api}/session/${sessionId}`);
  }

  update(feedbackId: number, payload: Partial<SessionFeedback>): Observable<SessionFeedback> {
    return this.http.put<SessionFeedback>(`${this.api}/${feedbackId}`, payload);
  }

  delete(feedbackId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${feedbackId}`);
  }

  getAll(): Observable<SessionFeedback[]> {
    return this.http.get<SessionFeedback[]>(this.api);
  }

  getByStudent(studentId: number): Observable<SessionFeedback[]> {
    return this.http.get<SessionFeedback[]>(`${this.api}/student/${studentId}`);
  }

  getByTutor(tutorId: number): Observable<SessionFeedback[]> {
    return this.http.get<SessionFeedback[]>(`${this.api}/tutor/${tutorId}`);
  }

  getAverageRating(tutorId: number): Observable<number> {
    return this.http.get<number>(`${this.api}/tutor/${tutorId}/average`);
  }

  getByMinRating(min: number): Observable<SessionFeedback[]> {
    return this.http.get<SessionFeedback[]>(`${this.api}/rating?min=${min}`);
  }
}
