import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule,
  FormBuilder, FormGroup, Validators,
  AbstractControl, ValidationErrors
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingService } from '@core/services/booking.service';
import { AuthService } from '@core/services/auth.service';
import { PusherBeamsService } from '@core/services/pusher-beams.service';
import { Tutor } from '@core/models/user.model';
import { Booking } from '@core/models/booking';
import Swal from 'sweetalert2';

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

const swalBase = Swal.mixin({ confirmButtonColor: '#2563eb', cancelButtonColor: '#6b7280' });
const swalToast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3500, timerProgressBar: true });

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './booking-form.component.html',
  styleUrls: ['./booking-form.component.css']
})
export class BookingFormComponent implements OnInit {
  tutor: Tutor | null = null;
  loading = true;
  submitting = false;

  mode: 'single' | 'pack' = 'single';

  singleForm!: FormGroup;
  slotsLoading = false;
  groupedSlots: { date: string; displayDate: string; slots: { date: string; startTime: string; endTime: string }[] }[] = [];
  selectedSlot: { date: string; startTime: string; endTime: string } | null = null;
  minDate: string;
  slotTouched = false;
  availableSlots: { date: string; startTime: string; endTime: string }[] = [];

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
    public  router: Router,
    private bookingService: BookingService,
    private authService: AuthService,
    private pusherBeamsService: PusherBeamsService
  ) {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.singleForm = this.fb.group({
      type:        ['ONE_TO_ONE', Validators.required],
      sessionDate: ['', [Validators.required, futureDateValidator]],
      notes:       ['', Validators.maxLength(500)]
    });

    const tutorId = +this.route.snapshot.queryParams['tutorId'];
    if (tutorId) {
      this.loadTutor(tutorId);
    } else {
      this.loading = false;
      swalBase.fire({ icon: 'warning', title: 'Aucun tuteur sélectionné', text: 'Veuillez choisir un tuteur depuis la liste.', confirmButtonText: 'Voir les tuteurs' })
        .then(() => this.router.navigate(['/student/tutors']));
    }
  }

  goBack(): void { this.router.navigate(['/student/tutors']); }

  loadTutor(tutorId: number): void {
    this.bookingService.getTutorById(tutorId).subscribe({
      next: (tutor: Tutor | null) => {
        if (!tutor) {
          this.loading = false;
          swalBase.fire({ icon: 'error', title: 'Tuteur introuvable', text: 'Ce tuteur n\'existe pas.' });
          return;
        }
        this.tutor = tutor;
        this.loading = false;
        this.loadAllSlots(tutor.id);
      },
      error: () => {
        this.loading = false;
        swalBase.fire({ icon: 'error', title: 'Erreur de chargement', text: 'Impossible de charger les informations du tuteur.' });
      }
    });
  }

  loadAllSlots(tutorId: number): void {
    this.slotsLoading = true;
    this.bookingService.getAvailableSlotsRange(tutorId, 14).subscribe({
      next: slots => {
        const map = new Map<string, { date: string; startTime: string; endTime: string }[]>();
        slots.forEach(s => {
          if (!map.has(s.date)) map.set(s.date, []);
          map.get(s.date)!.push(s);
        });
        this.groupedSlots = Array.from(map.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, daySlots]) => ({
            date,
            displayDate: this.formatDate(date),
            slots: daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime))
          }));
        this.slotsLoading = false;
      },
      error: () => {
        this.slotsLoading = false;
        swalToast.fire({ icon: 'error', title: 'Impossible de charger les créneaux disponibles.' });
      }
    });
  }

  onDateChange(): void {
    const date = this.singleForm.get('sessionDate')?.value;
    if (date && this.tutor) {
      this.bookingService.getAvailableSlots(this.tutor.id, date).subscribe(slots => {
        this.availableSlots = slots;
        this.selectedSlot = null;
        this.slotTouched = false;
      });
    }
  }

  selectSlot(slot: { date: string; startTime: string; endTime: string }): void {
    this.selectedSlot = slot;
    this.singleForm.patchValue({ sessionDate: slot.date });
    this.slotTouched = true;
  }

  submitBooking(): void {
    this.slotTouched = true;
    this.singleForm.markAllAsTouched();

    if (!this.selectedSlot) {
      swalToast.fire({ icon: 'warning', title: 'Veuillez sélectionner un créneau horaire.' });
      return;
    }
    if (this.singleForm.invalid) {
      swalToast.fire({ icon: 'warning', title: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      swalBase.fire({ icon: 'warning', title: 'Non connecté', text: 'Vous devez être connecté pour réserver.' });
      return;
    }

    this.submitting = true;
    const { type, sessionDate, notes } = this.singleForm.value;
    const booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
      studentId: user.id,
      tutorId:   this.tutor!.id,
      type,
      sessionDate,
      startTime: this.selectedSlot.startTime,
      endTime:   this.selectedSlot.endTime,
      notes:     notes || ''
    };

    this.bookingService.createBooking(booking).subscribe({
      next: () => {
        this.submitting = false;
        swalBase.fire({
          icon: 'success',
          title: 'Réservation envoyée !',
          html: `Votre demande a été envoyée à <strong>${this.tutor!.firstName} ${this.tutor!.lastName}</strong>.<br>Vous recevrez un email avec le lien de paiement une fois acceptée.`,
          timer: 3000,
          showConfirmButton: false,
          timerProgressBar: true,
        }).then(() => this.router.navigate(['/student/bookings']));
        this.pusherBeamsService.publishNotification(
          `tutor-${this.tutor!.id}`, 'New booking request', 'You have a pending booking — check your dashboard.'
        ).catch(() => {});
      },
      error: () => {
        this.submitting = false;
        swalBase.fire({ icon: 'error', title: 'Erreur', text: 'Impossible de créer la réservation. Réessayez.' });
      }
    });
  }

  isFormValid(): boolean { return this.singleForm.valid && !!this.selectedSlot; }
  get f() { return this.singleForm.controls; }

  selectPack(pack: PackOption): void {
    this.selectedPack = pack;
    this.scheduledSessions = [];
    this.packSelectedSlot = null;
    this.packStartDate = '';
    this.packSlots = [];
  }

  onPackDateChange(): void {
    if (this.packStartDate && this.tutor) {
      this.bookingService.getAvailableSlots(this.tutor.id, this.packStartDate).subscribe(slots => {
        this.packSlots = slots;
        this.packSelectedSlot = null;
        this.scheduledSessions = [];
      });
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
    const rate = this.tutor.hourlyRate ?? 0;
    const pricePerSession = rate * this.calculateSlotDuration(this.packSelectedSlot);
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

  onFrequencyChange(): void { if (this.packSelectedSlot) this.generateSchedule(); }

  submitPack(): void {
    if (!this.isPackFormValid() || !this.tutor) {
      swalToast.fire({ icon: 'warning', title: 'Veuillez compléter toutes les options du pack.' });
      return;
    }
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      swalBase.fire({ icon: 'warning', title: 'Non connecté', text: 'Vous devez être connecté pour réserver.' });
      return;
    }

    this.submitting = true;
    this.packSubmitProgress = 0;
    const bookings: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>[] = this.scheduledSessions.map(s => ({
      studentId: user.id, tutorId: this.tutor!.id,
      type: this.packType,
      sessionDate: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      notes: this.packNotes || `Pack ${this.selectedPack!.sessions} sessions – ${this.selectedPack!.discount}% réduction`
    }));

    let completed = 0;
    const total = bookings.length;
    const createNext = (index: number) => {
      if (index >= total) {
        this.submitting = false;
        swalBase.fire({
          icon: 'success',
          title: 'Pack envoyé !',
          html: `<strong>${total} sessions</strong> ont été soumises.<br>Vous recevrez un email de paiement dès que le tuteur accepte.`,
          timer: 3000, showConfirmButton: false, timerProgressBar: true,
        }).then(() => this.router.navigate(['/student/bookings']));
        this.pusherBeamsService.publishNotification(`tutor-${this.tutor!.id}`, 'New booking request', `You have ${total} pending booking(s) — check your dashboard.`).catch(() => {});
        return;
      }
      this.bookingService.createBooking(bookings[index]).subscribe({
        next: () => { completed++; this.packSubmitProgress = Math.round((completed / total) * 100); createNext(index + 1); },
        error: () => {
          this.submitting = false;
          swalBase.fire({ icon: 'error', title: 'Erreur', html: `Erreur à la session <strong>${index + 1}</strong>. ${completed} créée(s) sur ${total}.` });
        }
      });
    };
    createNext(0);
  }

  isPackFormValid(): boolean {
    return !!(this.selectedPack && this.packStartDate && this.packSelectedSlot && this.scheduledSessions.length > 0);
  }

  calculateSlotDuration(slot: { startTime: string; endTime: string }): number {
    const normalize = (t: string) => t.length === 8 ? t.substring(0, 5) : t;
    const start = new Date(`1970-01-01T${normalize(slot.startTime)}:00`);
    const end   = new Date(`1970-01-01T${normalize(slot.endTime)}:00`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  calculateDuration(): number { return this.selectedSlot ? this.calculateSlotDuration(this.selectedSlot) : 0; }
  calculateTotal(): number { return this.tutor ? (this.tutor.hourlyRate ?? 0) * this.calculateDuration() : 0; }
  getPackTotalOriginal(): number   { return this.scheduledSessions.reduce((s, x) => s + x.priceOriginal, 0); }
  getPackTotalDiscounted(): number { return this.scheduledSessions.reduce((s, x) => s + x.priceDiscounted, 0); }
  getPackSavings(): number         { return this.getPackTotalOriginal() - this.getPackTotalDiscounted(); }

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  formatDateShort(d: string): string {
    if (!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  }
}
