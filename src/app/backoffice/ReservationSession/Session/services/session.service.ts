import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Session } from '../../../../core/models/Session';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private api = 'http://localhost:8080/api/sessions';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Session[]>                       { return this.http.get<Session[]>(this.api); }
  getById(id: number): Observable<Session>              { return this.http.get<Session>(`${this.api}/${id}`); }
  getByTutor(id: number): Observable<Session[]>         { return this.http.get<Session[]>(`${this.api}/tutor/${id}`); }
  getByStudent(id: number): Observable<Session[]>       { return this.http.get<Session[]>(`${this.api}/student/${id}`); }
  getByBooking(id: number): Observable<Session>         { return this.http.get<Session>(`${this.api}/booking/${id}`); }
  create(s: Session): Observable<Session>               { return this.http.post<Session>(this.api, s); }
  update(id: number, s: Session): Observable<Session>   { return this.http.put<Session>(`${this.api}/${id}`, s); }
  delete(id: number): Observable<void>                  { return this.http.delete<void>(`${this.api}/${id}`); }
  start(id: number): Observable<Session>                { return this.http.patch<Session>(`${this.api}/${id}/start`, {}); }
  end(id: number): Observable<Session>                  { return this.http.patch<Session>(`${this.api}/${id}/end`, {}); }
  missed(id: number): Observable<Session>               { return this.http.patch<Session>(`${this.api}/${id}/missed`, {}); }
  getAverageRating(tutorId: number): Observable<number> { return this.http.get<number>(`${this.api}/tutor/${tutorId}/rating`); }
}