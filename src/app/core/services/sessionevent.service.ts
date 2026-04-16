/*import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Session } from '../models/sessionevent.model';

@Injectable({
  providedIn: 'root',
})
export class SessioneventService {
  private baseUrl = 'http://localhost:8222/api/sessions';

  constructor(private http: HttpClient) {}

  addSession(session: Session): Observable<Session> {
    return this.http.post<Session>(`${this.baseUrl}/add`, session);
  }

  getAllSessions(): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.baseUrl}/getAll`);
  }

  getSessionById(id: number): Observable<Session> {
    return this.http.get<Session>(`${this.baseUrl}/getById/${id}`);
  }

  updateSession(id: number, session: Session): Observable<Session> {
    return this.http.put<Session>(`${this.baseUrl}/update/${id}`, session);
  }

  deleteSession(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/delete/${id}`);
  }

  getSessionsByEvent(eventId: number): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.baseUrl}/event/${eventId}`);
  }
}
*/