import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Booking } from '../../core/models/booking';
import { Session } from '../../core/models/Session';
import { SessionFeedback } from '../../core/models/SessionFeedback';
import { STATIC_TUTORS, StaticTutor, getTutorById } from '../../core/models/static-tutors';

@Injectable({ providedIn: 'root' })
export class BookingService {

  private bookingApi  = 'http://localhost:8080/api/bookings';
  private sessionApi  = 'http://localhost:8080/api/sessions';
  private feedbackApi = 'http://localhost:8080/api/feedback';

  constructor(private http: HttpClient) {}

  // ── Tuteurs statiques ──
  getStaticTutors(): Observable<StaticTutor[]> {
    return of(STATIC_TUTORS);
  }

  getTutorById(id: number): Observable<StaticTutor | null> {
    return of(getTutorById(id) || null);
  }

  // ── Bookings ──
  createBooking(booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Observable<Booking> {
    return this.http.post<Booking>(this.bookingApi, booking);
  }

  getStudentBookings(studentId: number): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.bookingApi}/student/${studentId}`);
  }

  getTutorBookings(tutorId: number): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.bookingApi}/tutor/${tutorId}`);
  }

  getAllBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(this.bookingApi);
  }

  cancelBooking(bookingId: number, cancelledBy: string, reason: string): Observable<Booking> {
    return this.http.put<Booking>(
      `${this.bookingApi}/${bookingId}/cancel?cancelledBy=${cancelledBy}&reason=${reason}`, {}
    );
  }

  acceptBooking(bookingId: number): Observable<Booking> {
    return this.http.patch<Booking>(
      `${this.bookingApi}/${bookingId}/accept`, {}
    );
  }

  rejectBooking(bookingId: number): Observable<Booking> {
    return this.http.patch<Booking>(
      `${this.bookingApi}/${bookingId}/reject`, {}
    );
  }

  // ── Sessions ──
  getStudentSessions(studentId: number): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.sessionApi}/student/${studentId}`);
  }

  getTutorSessions(tutorId: number): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.sessionApi}/tutor/${tutorId}`);
  }

  startSession(sessionId: number): Observable<Session> {
    return this.http.patch<Session>(
      `${this.sessionApi}/${sessionId}/start`, {}
    );
  }

  endSession(sessionId: number): Observable<Session> {
    return this.http.patch<Session>(
      `${this.sessionApi}/${sessionId}/complete`, {}
    );
  }

  // ── Feedback → API réelle ──
  submitFeedback(
    sessionId: number,
    studentId: number,
    rating: number,
    comment?: string
  ): Observable<SessionFeedback> {
    return this.http.post<SessionFeedback>(
      `${this.feedbackApi}/session/${sessionId}`,
      {
        studentId,
        rating,
        comment
      }
    );
  }

  getSessionFeedback(sessionId: number): Observable<SessionFeedback> {
    return this.http.get<SessionFeedback>(`${this.feedbackApi}/session/${sessionId}`);
  }

  // ── Créneaux disponibles ──
  getAvailableSlots(tutorId: number, date: string): { startTime: string; endTime: string }[] {
    const tutor = getTutorById(tutorId);
    if (!tutor) return [];

    const dayOfWeek = new Date(date)
      .toLocaleDateString('en', { weekday: 'long' })
      .toUpperCase();

    const daySlots = tutor.availability
      .filter(s => s.dayOfWeek === dayOfWeek && s.available);

    const result: { startTime: string; endTime: string }[] = [];

    daySlots.forEach(slot => {
      let current = slot.startTime;
      while (current < slot.endTime) {
        const end = this.addMinutes(current, 60);
        if (end <= slot.endTime) {
          result.push({ startTime: current, endTime: end });
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