import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
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

  /** Get tutor slots organized by date and next day with dates included */
  getTutorSlotsWithDates(tutorId: number, date: string): Observable<{ date: string; startTime: string; endTime: string }[]> {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    const dateSlots$ = this.http.get<Availability[]>(`${this.api}/tutor/${tutorId}/date?date=${date}`).pipe(
      map(availabilities => this.processSlots(availabilities, date))
    );

    const nextDateSlots$ = this.http.get<Availability[]>(`${this.api}/tutor/${tutorId}/date?date=${nextDateStr}`).pipe(
      map(availabilities => this.processSlots(availabilities, nextDateStr))
    );

    return forkJoin([dateSlots$, nextDateSlots$]).pipe(
      map(([dateSlots, nextDateSlots]) => [...dateSlots, ...nextDateSlots])
    );
  }

  private processSlots(availabilities: Availability[], date: string): { date: string; startTime: string; endTime: string }[] {
    const result: { date: string; startTime: string; endTime: string }[] = [];
    availabilities.forEach(slot => {
      let current = slot.startTime;
      while (current < slot.endTime) {
        const end = this.addMinutes(current, 60);
        if (end <= slot.endTime) {
          result.push({ date, startTime: current, endTime: end });
        }
        current = this.addMinutes(current, 30);
      }
    });
    return result;
  }

  private addMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + minutes;
    return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
  }
}
