import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Booking } from '../../../../core/models/booking';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private api = 'http://localhost:8080/api/bookings';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Booking[]>                    { return this.http.get<Booking[]>(this.api); }
  getById(id: number): Observable<Booking>           { return this.http.get<Booking>(`${this.api}/${id}`); }
  getByStudent(id: number): Observable<Booking[]>    { return this.http.get<Booking[]>(`${this.api}/student/${id}`); }
  getByTutor(id: number): Observable<Booking[]>      { return this.http.get<Booking[]>(`${this.api}/tutor/${id}`); }
  create(b: Booking): Observable<Booking>            { return this.http.post<Booking>(this.api, b); }
  update(id: number, b: Booking): Observable<Booking>{ return this.http.put<Booking>(`${this.api}/${id}`, b); }
  delete(id: number): Observable<void>               { return this.http.delete<void>(`${this.api}/${id}`); }
  confirm(id: number): Observable<Booking>           { return this.http.put<Booking>(`${this.api}/${id}/confirm`, {}); }
 reject(id: number, reason: string): Observable<any> {
  const params = new HttpParams().set('reason', reason);
  return this.http.put(`${this.api}/${id}/reject`, {}, { params });
}
  cancel(id: number, cancelledBy: string, reason: string): Observable<Booking> {
    const params = new HttpParams().set('cancelledBy', cancelledBy).set('reason', reason);
    return this.http.put<Booking>(`${this.api}/${id}/cancel`, {}, { params });
  }
  complete(id: number): Observable<Booking>          { return this.http.put<Booking>(`${this.api}/${id}/complete`, {}); }
}