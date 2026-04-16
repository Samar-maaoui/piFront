// booking-conflict.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BookingConflict {
  id: number;
  tutorId: number;
  bookingId: number;
  conflictingBookingId?: number;
  type: string;
  status: string;
  description?: string;
  detectedAt: string;
  resolvedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingConflictService {

  private api = 'http://localhost:8080/api/booking-conflicts';

  constructor(private http: HttpClient) {}

  // Admin — tous les conflits
  getAll(): Observable<BookingConflict[]> {
    return this.http.get<BookingConflict[]>(this.api);
  }

  // Détail d'un conflit
  getById(id: number): Observable<BookingConflict> {
    return this.http.get<BookingConflict>(`${this.api}/${id}`);
  }

  // Conflits d'un tutor
  getByTutor(tutorId: number): Observable<BookingConflict[]> {
    return this.http.get<BookingConflict[]>(
      `${this.api}/tutor/${tutorId}`
    );
  }

  // Conflits récents d'un tutor
  getRecentByTutor(tutorId: number): Observable<BookingConflict[]> {
    return this.http.get<BookingConflict[]>(
      `${this.api}/tutor/${tutorId}/recent`
    );
  }

  // Conflits par date
  getByDate(date: string): Observable<BookingConflict[]> {
    return this.http.get<BookingConflict[]>(
      `${this.api}/date?date=${date}`
    );
  }

  // Conflits tutor + date
  getByTutorAndDate(
    tutorId: number, date: string
  ): Observable<BookingConflict[]> {
    return this.http.get<BookingConflict[]>(
      `${this.api}/tutor/${tutorId}/date?date=${date}`
    );
  }

  // Supprimer un conflit
  deleteConflict(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  // Supprimer tous les conflits d'un tutor
  deleteAllByTutor(tutorId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/tutor/${tutorId}`);
  }
}