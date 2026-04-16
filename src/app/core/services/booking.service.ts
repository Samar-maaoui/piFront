import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, forkJoin, mergeMap, catchError } from 'rxjs';
import { Booking } from '../models/booking';
import { Session, SessionStatus, StudentDashboardDTO, TutorDashboardDTO } from '../models/Session';
import { SessionFeedback } from '../models/SessionFeedback';
import { UserServiceService } from '../../backoffice/services/user-service.service';
import { Tutor } from '../models/user.model';
import { Availability } from '../models/Availability';

@Injectable({ providedIn: 'root' })
export class BookingService {

  private bookingApi  = 'http://localhost:8080/api/bookings';
  private sessionApi  = 'http://localhost:8080/api/sessions';
  private feedbackApi = 'http://localhost:8080/api/feedback';

  constructor(private http: HttpClient, private userService: UserServiceService) {}

  // ── Tutors ───────────────────────────────────────────────────────
  getTutors(): Observable<Tutor[]> {
    return this.userService.getAllTutorProfiles().pipe(
      mergeMap(profiles => {
        const observables = profiles.map(p =>
          this.userService.getUserById(p.id).pipe(
            map(user => ({ profile: p, user })),
            catchError(() => of(null))
          )
        );
        return forkJoin(observables).pipe(
          map(results =>
            results
              .filter(r => r !== null && r!.user.role === 'TUTOR')
              .map(r => ({
                ...r!.user,
                bio: r!.profile.bio,
                specialization: r!.profile.specialization
                  ? [r!.profile.specialization]
                  : [],
                experienceYears: r!.profile.experienceYears,
                hourlyRate: r!.profile.hourlyRate
              } as Tutor))
          )
        );
      })
    );
  }

  getTutorById(id: number): Observable<Tutor | null> {
    return forkJoin([
      this.userService.getUserById(id),
      this.userService.getAllTutorProfiles()
    ]).pipe(
      map(([user, profiles]: [any, any[]]) => {
        if (!user || user.role !== 'TUTOR') return null;
        const profile = profiles.find((p: any) => p.id === id);
        return {
          ...user,
          bio: profile?.bio,
          specialization: profile?.specialization ? [profile.specialization] : [],
          experienceYears: profile?.experienceYears,
          hourlyRate: profile?.hourlyRate
        } as Tutor;
      }),
      catchError(() => of(null))
    );
  }

  // ── Bookings ─────────────────────────────────────────────────────
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
    return this.http.patch<Booking>(`${this.bookingApi}/${bookingId}/accept`, {});
  }

  rejectBooking(bookingId: number): Observable<Booking> {
    return this.http.patch<Booking>(`${this.bookingApi}/${bookingId}/reject`, {});
  }

  // ── Sessions ─────────────────────────────────────────────────────
  getSessionById(sessionId: number): Observable<Session> {
    return this.http.get<Session>(`${this.sessionApi}/${sessionId}`);
  }

  getStudentSessions(studentId: number): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.sessionApi}/student/${studentId}`);
  }

  getTutorSessions(tutorId: number): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.sessionApi}/tutor/${tutorId}`);
  }

  // SCHEDULED → ONGOING  (endpoint: /start)
  startSession(sessionId: number): Observable<Session> {
    return this.http.patch<Session>(`${this.sessionApi}/${sessionId}/start`, {});
  }

  // ONGOING → DONE  (endpoint: /end)
  endSession(sessionId: number): Observable<Session> {
    return this.http.patch<Session>(`${this.sessionApi}/${sessionId}/end`, {});
  }

  // SCHEDULED → MISSED  (endpoint: /missed)
  markSessionMissed(sessionId: number): Observable<Session> {
    return this.http.patch<Session>(`${this.sessionApi}/${sessionId}/missed`, {});
  }

  // Méthode générique — choisit l'endpoint selon la transition
  transitionSession(sessionId: number, newStatus: SessionStatus): Observable<Session> {
    const endpointMap: Partial<Record<SessionStatus, string>> = {
      ONGOING: 'start',
      DONE:    'end',
      MISSED:  'missed'
    };
    const endpoint = endpointMap[newStatus];
    if (!endpoint) {
      throw new Error(`Pas d'endpoint pour la transition vers ${newStatus}`);
    }
    return this.http.patch<Session>(`${this.sessionApi}/${sessionId}/${endpoint}`, {});
  }

  // ── Feedback ─────────────────────────────────────────────────────
  submitFeedback(
    sessionId: number,
    studentId: number,
    rating: number,
    comment?: string
  ): Observable<SessionFeedback> {
    return this.http.post<SessionFeedback>(
      `${this.feedbackApi}/session/${sessionId}`,
      { studentId, rating, comment }
    );
  }

  getSessionFeedback(sessionId: number): Observable<SessionFeedback> {
    return this.http.get<SessionFeedback>(`${this.feedbackApi}/session/${sessionId}`);
  }

  // ── Créneaux disponibles ─────────────────────────────────────────
  getAvailableSlotsRange(
    tutorId: number,
    days: number = 14
  ): Observable<{ date: string; startTime: string; endTime: string }[]> {
    const baseUrl = this.bookingApi.replace('bookings', 'availability');
    const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

    return forkJoin([
      this.http.get<Availability[]>(`${baseUrl}/tutor/${tutorId}/available`),
      this.http.get<Availability[]>(`${baseUrl}/tutor/${tutorId}`).pipe(
        catchError(() => of([] as Availability[]))
      )
    ]).pipe(
      map(([available, all]) => {
        const blocked = all.filter(a => !a.available && a.availabilityType === 'ONE_TIME');
        const result: { date: string; startTime: string; endTime: string }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < days; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const dayName = DAY_NAMES[d.getDay()];

          available.forEach(avail => {
            const isRecurring = avail.availabilityType === 'RECURRING' && avail.dayOfWeek === dayName;
            const isOneTime   = avail.availabilityType === 'ONE_TIME'  && avail.specificDate === dateStr;
            if (!isRecurring && !isOneTime) return;

            this.processSlots([avail], dateStr).forEach(slot => {
              const isBlocked = blocked.some(b =>
                b.specificDate === slot.date &&
                b.startTime < slot.endTime &&
                slot.startTime < b.endTime
              );
              if (!isBlocked) result.push(slot);
            });
          });
        }
        return result;
      }),
      catchError(() => of([] as { date: string; startTime: string; endTime: string }[]))
    );
  }

  getAvailableSlots(
    tutorId: number,
    date: string
  ): Observable<{ date: string; startTime: string; endTime: string }[]> {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];
    const baseUrl = this.bookingApi.replace('bookings', 'availability');

    const dateSlots$ = this.http.get<Availability[]>(
      `${baseUrl}/tutor/${tutorId}/date?date=${date}`
    ).pipe(map(a => this.processSlots(a, date)));

    const nextDateSlots$ = this.http.get<Availability[]>(
      `${baseUrl}/tutor/${tutorId}/date?date=${nextDateStr}`
    ).pipe(map(a => this.processSlots(a, nextDateStr)));

    return forkJoin([dateSlots$, nextDateSlots$]).pipe(
      map(([s1, s2]) => [...s1, ...s2])
    );
  }

  private processSlots(
    availabilities: Availability[],
    date: string
  ): { date: string; startTime: string; endTime: string }[] {
    const result: { date: string; startTime: string; endTime: string }[] = [];
    availabilities.forEach(slot => {
      let current = slot.startTime;
      while (current < slot.endTime) {
        const end = this.addMinutes(current, 60);
        if (end <= slot.endTime) result.push({ date, startTime: current, endTime: end });
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

  // ── Dashboards ───────────────────────────────────────────────────
  getStudentDashboard(studentId: number): Observable<StudentDashboardDTO> {
    return this.http.get<StudentDashboardDTO>(
      `${this.sessionApi}/dashboard/student/${studentId}`
    );
  }

  getTutorDashboard(tutorId: number): Observable<TutorDashboardDTO> {
    return this.http.get<TutorDashboardDTO>(
      `${this.sessionApi}/dashboard/tutor/${tutorId}`
    );
  }
}