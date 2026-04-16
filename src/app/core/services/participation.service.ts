/*// src/app/services/participation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Participation } from '../models/participation.model';

@Injectable({
  providedIn: 'root',
})
export class ParticipationService {
  private baseUrl = 'http://localhost:8222/api/participations';
  private emailUrl = 'http://localhost:8222/api/email';

  constructor(private http: HttpClient) {}

  addParticipation(participation: Participation): Observable<Participation> {
    return this.http.post<Participation>(`${this.baseUrl}/add`, participation);
  }

  getAllParticipations(): Observable<Participation[]> {
    return this.http.get<Participation[]>(`${this.baseUrl}/getAll`);
  }

  getParticipationById(id: number): Observable<Participation> {
    return this.http.get<Participation>(`${this.baseUrl}/getById/${id}`);
  }

  updateParticipation(
    id: number,
    participation: Participation,
  ): Observable<Participation> {
    return this.http.put<Participation>(
      `${this.baseUrl}/update/${id}`,
      participation,
    );
  }

  deleteParticipation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/delete/${id}`);
  }

  sendRib(
    email: string,
    eventTitle: string,
    sessionDate: string,
    amount: number,
  ): Observable<any> {
    return this.http.post(
      `${this.emailUrl}/send-rib`,
      {
        email,
        eventTitle,
        sessionDate,
        amount,
      },
      { responseType: 'text' },
    );
  }
  getParticipationsByEmail(email: string): Observable<Participation[]> {
    return this.http
      .get<Participation[]>(`${this.baseUrl}/getAll`)
      .pipe(
        map((all: Participation[]) => all.filter((p) => p.userEmail === email)),
      );
  }
}
*/