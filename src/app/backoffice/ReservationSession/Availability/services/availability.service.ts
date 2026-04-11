import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Availability } from '../../../../core/models/Availability';

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private api = 'http://localhost:8080/api/availability';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Availability[]>                           { return this.http.get<Availability[]>(this.api); }
  getById(id: number): Observable<Availability>                  { return this.http.get<Availability>(`${this.api}/${id}`); }
  getByTutor(id: number): Observable<Availability[]>             { return this.http.get<Availability[]>(`${this.api}/tutor/${id}`); }
  getAvailableByTutor(id: number): Observable<Availability[]>    { return this.http.get<Availability[]>(`${this.api}/tutor/${id}/available`); }
  add(a: Availability): Observable<Availability>                 { return this.http.post<Availability>(this.api, a); }
  update(id: number, a: Availability): Observable<Availability>  { return this.http.put<Availability>(`${this.api}/${id}`, a); }
  delete(id: number): Observable<void>                           { return this.http.delete<void>(`${this.api}/${id}`); }
  toggle(id: number): Observable<Availability>                   { return this.http.patch<Availability>(`${this.api}/${id}/toggle`, {}); }

  /** Feature 1 — only free, future slots for this tutor */
  getFreeSlots(tutorId: number): Observable<Availability[]> {
    return this.http.get<Availability[]>(`${this.api}/tutor/${tutorId}/free`);
  }
}
