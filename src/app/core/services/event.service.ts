/*import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventModel, EventStatus } from '../models/event.model';

export type { EventModel, EventStatus };

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly url = 'http://localhost:8222/api/events';

  constructor(private http: HttpClient) {}

  getAll(): Observable<EventModel[]> {
    return this.http.get<EventModel[]>(`${this.url}/getAllEvents`);
  }

  getById(id: number): Observable<EventModel> {
    return this.http.get<EventModel>(`${this.url}/getEventById/${id}`);
  }

  create(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.url}/addEvent`, formData);
  }

  update(id: number, eventData: FormData): Observable<any> {
    return this.http.put(`${this.url}/updateEventById/${id}`, eventData, {
      responseType: 'text' as 'json',
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/deleteEventById/${id}`);
  }
}
*/