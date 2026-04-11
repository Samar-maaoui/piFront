import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule,
  FormBuilder, FormGroup, Validators,
  AbstractControl, ValidationErrors
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingService } from '@backoffice/services/booking.service';
import { AuthService } from '@core/services/auth.service';
import { PusherBeamsService } from '@core/services/pusher-beams.service';
import { StaticTutor } from '@core/models/static-tutors';
import { Booking } from '@core/models/booking';

/** Feature 4 — Custom validator: date must be today or in the future */
export function futureDateValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const selected = new Date(control.value + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected >= today ? null : { pastDate: true };
}

interface PackOption {
  sessions: number;
  discount: number;
  label: string;
}

interface ScheduledSession {
  date: string;
  startTime: string;
  endTime: string;
  priceOriginal: number;
  priceDiscounted: number;
}

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './booking-form.component.html',
  styleUrls: ['./booking-form.component.css']
})
export class BookingFormComponent implements OnInit {
  tutor: StaticTutor | null = null;
  loading = true;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  mode: 'single' | 'pack' = 'single';

  // ── Feature 4: Reactive Form for single session ──
  singleForm!: FormGroup;
  availableSlots: { startTime: string; endTime: string }[] = [];
  selectedSlot:   { startTime: string; endTime: string } | null = null;
  minDate: string;
  slotTouched = false;

  // ── Pack booking (template-driven) ──
  packOptions: PackOption[] = [
    { sessions: 5,  discount: 10, label: 'Pack 5 sessions'  },
    { sessions: 10, discount: 20, label: 'Pack 10 sessions' },
    { sessions: 20, discount: 30, label: 'Pack 20 sessions' }
  ];
  selectedPack: PackOption | null = null;
  packType = 'ONE_TO_ONE';
  packStartDate = '';
  packFrequency: 'weekly' | 'biweekly' = 'weekly';
  packNotes = '';
  packSlots: { startTime: string; endTime: string }[] = [];
  packSelectedSlot: { startTime: string; endTime: string } | null = null;
  scheduledSessions: ScheduledSession[] = [];
  packSubmitProgress = 0;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private authService: AuthService,
    private pusherBeamsService: PusherBeamsService
  ) {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    // Build reactive form
    this.singleForm = this.fb.group({
      type:        ['ONE_TO_ONE', Validators.required],
      sessionDate: ['', [Validators.required, futureDateValidator]],
      notes:       ['', Validators.maxLength(500)]
    });

    const tutorId = +this.route.snapshot.queryParams['tutorId'];
    if (tutorId) {
      this.loadTutor(tutorId);
    } else {
      this.errorMessage = 'Aucun tuteur sélectionné';
      this.loading = false;
    }
  }

  loadTutor(tutorId: number): void {
    this.bookingService.getTutorById(tutorId).subscribe({
      next: (tutor: StaticTutor | null) => {
        this.tutor = tutor;
        if (!tutor) this.errorMessage = 'Tuteur non trouvé';
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Erreur lors du chargement du tuteur';
        this.loading = false;
      }
    });
  }

  // ── Single session ──
  onDateChange(): void {
    const date = this.singleForm.get('sessionDate')?.value;
    if (date && this.tutor) {
      this.availableSlots = this.bookingService.getAvailableSlots(this.tutor.id, date);
      this.selectedSlot = null;
      this.slotTouched = false;
    }
  }

  selectSlot(slot: { startTime: string; endTime: string }): void {
    this.selectedSlot = slot;
  }

  submitBooking(): void {
    this.slotTouched = true;
    this.singleForm.markAllAsTouched();

    if (this.singleForm.invalid || !this.selectedSlot || !this.tutor) return;

    this.submitting = true;
    this.errorMessage = '';
    const user = this.authService.getCurrentUser();
    if (!user?.id) { this.errorMessage = 'Utilisateur non connecté'; this.submitting = false; return; }

    const { type, sessionDate, notes } = this.singleForm.value;

    const booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
      studentId:   1,
      tutorId:     1,
      type,
      sessionDate,
      startTime:   this.selectedSlot.startTime,
      endTime:     this.selectedSlot.endTime,
      notes:       notes || ''
    };

    this.bookingService.createBooking(booking).subscribe({
      next: async () => {
        this.submitting = false;
        this.router.navigate(['/student/bookings'], { queryParams: { success: 'true' } });
        try {
          await this.pusherBeamsService.publishNotification(
            `tutor-${this.tutor!.id}`,
            'New booking request',
            'You have a pending booking — check your dashboard.'
          );
        } catch (err) {
          console.error('Pusher notification failed:', err);
        }
      },
      error: () => {
        this.errorMessage = 'Erreur lors de la création de la réservation';
        this.submitting = false;
      }
    });
  }

  isFormValid(): boolean {
    return this.singleForm.valid && !!this.selectedSlot;
  }

  // Helpers to expose form controls to template
  get f() { return this.singleForm.controls; }

  // ── Pack ──
  selectPack(pack: PackOption): void {
    this.selectedPack = pack;
    this.scheduledSessions = [];
    this.packSelectedSlot = null;
    this.packStartDate = '';
    this.packSlots = [];
  }

  onPackDateChange(): void {
    if (this.packStartDate && this.tutor) {
      this.packSlots = this.bookingService.getAvailableSlots(this.tutor.id, this.packStartDate);
      this.packSelectedSlot = null;
      this.scheduledSessions = [];
    }
  }

  selectPackSlot(slot: { startTime: string; endTime: string }): void {
    this.packSelectedSlot = slot;
    this.generateSchedule();
  }

  generateSchedule(): void {
    if (!this.selectedPack || !this.packStartDate || !this.packSelectedSlot || !this.tutor) return;
    const sessions: ScheduledSession[] = [];
    const intervalDays = this.packFrequency === 'weekly' ? 7 : 14;
    const pricePerSession = this.tutor.hourlyRate * this.calculateSlotDuration(this.packSelectedSlot);
    const discountedPrice = pricePerSession * (1 - this.selectedPack.discount / 100);
    let currentDate = new Date(this.packStartDate + 'T12:00:00');
    for (let i = 0; i < this.selectedPack.sessions; i++) {
      if (i > 0) currentDate = new Date(currentDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      sessions.push({
        date: currentDate.toISOString().split('T')[0],
        startTime: this.packSelectedSlot.startTime,
        endTime:   this.packSelectedSlot.endTime,
        priceOriginal:   pricePerSession,
        priceDiscounted: discountedPrice
      });
    }
    this.scheduledSessions = sessions;
  }

  onFrequencyChange(): void {
    if (this.packSelectedSlot) this.generateSchedule();
  }

  submitPack(): void {
    if (!this.isPackFormValid() || !this.tutor) return;
    const user = this.authService.getCurrentUser();
    if (!user?.id) { this.errorMessage = 'Utilisateur non connecté'; return; }
    this.submitting = true;
    this.packSubmitProgress = 0;
    this.errorMessage = '';
    const bookings: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>[] = this.scheduledSessions.map(s => ({
      studentId: 1,
      tutorId:   1,
      type:      this.packType,
      sessionDate: s.date,
      startTime: s.startTime,
      endTime:   s.endTime,
      notes:     this.packNotes || `Pack ${this.selectedPack!.sessions} sessions – ${this.selectedPack!.discount}% réduction`
    }));
    let completed = 0;
    const total = bookings.length;
    const createNext = (index: number) => {
      if (index >= total) {
        this.submitting = false;
        this.router.navigate(['/student/bookings'], { queryParams: { success: 'pack', count: total } });
        this.pusherBeamsService.publishNotification(`tutor-${this.tutor!.id}`, 'New booking request', `You have ${total} pending booking(s) — check your dashboard.`)
          .catch(err => console.error('Pusher notification failed for pack booking:', err));
        return;
      }
      this.bookingService.createBooking(bookings[index]).subscribe({
        next: () => { completed++; this.packSubmitProgress = Math.round((completed / total) * 100); createNext(index + 1); },
        error: () => { this.errorMessage = `Erreur à la session ${index + 1}. ${completed} créée(s).`; this.submitting = false; }
      });
    };
    createNext(0);
  }

  isPackFormValid(): boolean {
    return !!(this.selectedPack && this.packStartDate && this.packSelectedSlot && this.scheduledSessions.length > 0);
  }

  // ── Helpers ──
  calculateSlotDuration(slot: { startTime: string; endTime: string }): number {
    const start = new Date(`1970-01-01T${slot.startTime}:00`);
    const end   = new Date(`1970-01-01T${slot.endTime}:00`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  calculateDuration(): number { return this.selectedSlot ? this.calculateSlotDuration(this.selectedSlot) : 0; }
  calculateTotal(): number { return this.tutor ? this.tutor.hourlyRate * this.calculateDuration() : 0; }
  getPackTotalOriginal(): number    { return this.scheduledSessions.reduce((s, x) => s + x.priceOriginal, 0); }
  getPackTotalDiscounted(): number  { return this.scheduledSessions.reduce((s, x) => s + x.priceDiscounted, 0); }
  getPackSavings(): number          { return this.getPackTotalOriginal() - this.getPackTotalDiscounted(); }

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  formatDateShort(d: string): string {
    if (!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  goBack(): void { this.router.navigate(['/student/tutors']); }
}
