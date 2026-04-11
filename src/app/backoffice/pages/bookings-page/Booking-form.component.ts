// booking-form.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BookingService } from './services/booking.service';
import { AvailabilityService } from '../../ReservationSession/Availability/services/availability.service';
import { Booking } from '../../../core/models/booking';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './booking-form.component.html',
})
export class BookingFormComponent implements OnInit {

  booking: any = {
    studentId: 1,   // ← remplacer par l'id depuis auth
    tutorId: '',
    type: 'ONE_TO_ONE',
    sessionDate: '',
    startTime: '',
    endTime: '',
    notes: ''
  };

  isEdit      = false;
  isLoading   = false;
  isEditable  = true;
  isStudent   = true;
  today       = new Date().toISOString().split('T')[0];

  availableSlots: { start: string; end: string }[] = [];
  selectedSlot: any = null;

  tutors = [
    { id: 1, name: 'Sarah Johnson', rating: 4.9 },
    { id: 2, name: 'Mark Williams', rating: 4.7 },
    { id: 3, name: 'Emily Davis',   rating: 4.8 },
    { id: 4, name: 'Tuteur Statique', rating: 5.0 } // <-- Tuteur ajouté
  ];

  sessionTypes = [
    { value: 'ONE_TO_ONE',   label: 'One-to-One',   icon: '👤' },
    { value: 'GROUP',        label: 'Group',         icon: '👥' },
    { value: 'INFO_SESSION', label: 'Info Session',  icon: 'ℹ️' },
  ];

  // ✅ Mapping JS DayOfWeek → Java DayOfWeek
  private dayMap: { [key: string]: string } = {
    'Sunday':    'SUNDAY',
    'Monday':    'MONDAY',
    'Tuesday':   'TUESDAY',
    'Wednesday': 'WEDNESDAY',
    'Thursday':  'THURSDAY',
    'Friday':    'FRIDAY',
    'Saturday':  'SATURDAY',
  };

  constructor(
    private bookingService: BookingService,
    private availabilityService: AvailabilityService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEdit = true;
      this.bookingService.getById(+id).subscribe(data => {
        this.booking = data;
        // ✅ Recharger les slots si on édite
        if (this.booking.tutorId && this.booking.sessionDate) {
          this.loadAvailableSlots();
        }
      });
    }
  }

  onTutorChange(): void {
    // ✅ Reset les slots quand on change de tuteur
    this.availableSlots = [];
    this.selectedSlot   = null;
    this.booking.startTime = '';
    this.booking.endTime   = '';

    if (this.booking.tutorId && this.booking.sessionDate) {
      this.loadAvailableSlots();
    }
  }

  loadAvailableSlots(): void {
    // ✅ Vérifier que tutorId ET sessionDate sont définis
    if (!this.booking.tutorId || !this.booking.sessionDate) {
      this.availableSlots = [];
      return;
    }

    // ✅ Convertir la date en jour de semaine Java
    const date = new Date(this.booking.sessionDate);
    const jsDay  = date.toLocaleString('en-US', { weekday: 'long' }); // "Monday"
    const javaDay = this.dayMap[jsDay];                                // "MONDAY"

    console.log('Loading slots for tutor:', this.booking.tutorId, 'day:', javaDay);

    this.availabilityService.getByTutor(+this.booking.tutorId).subscribe({
      next: (slots: any[]) => {
        console.log('All slots from API:', slots);

        // ✅ Filtrer par jour ET disponible = true
        const filtered = slots.filter(s =>
          s.dayOfWeek === javaDay && s.available === true
        );

        console.log('Filtered slots:', filtered);

        // ✅ Formater les heures (enlever les secondes si "09:00:00" → "09:00")
        this.availableSlots = filtered.map(s => ({
          start: this.formatTime(s.startTime),
          end:   this.formatTime(s.endTime)
        }));

        console.log('Available slots:', this.availableSlots);
      },
      error: (err) => {
        console.error('Error loading slots:', err);
        this.availableSlots = [];
      }
    });
  }

  // ✅ Formater "09:00:00" → "09:00"
  formatTime(time: string): string {
    if (!time) return '';
    return time.length === 8 ? time.substring(0, 5) : time;
  }

  selectSlot(slot: { start: string; end: string }): void {
    this.selectedSlot      = slot;
    this.booking.startTime = slot.start;
    this.booking.endTime   = slot.end;
  }

  onSubmit(): void {
    if (!this.booking.tutorId) {
      alert('Please select a tutor');
      return;
    }
    if (!this.booking.sessionDate) {
      alert('Please select a date');
      return;
    }
    if (!this.booking.startTime || !this.booking.endTime) {
      alert('Please select a time slot');
      return;
    }

    this.isLoading = true;

    const action = this.isEdit
      ? this.bookingService.update(this.booking.id, this.booking)
      : this.bookingService.create(this.booking);

    action.subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/admin/bookings']);
      },
      error: (err) => {
        this.isLoading = false;
        alert(err.error?.message || 'An error occurred. Please try again.');
      }
    });
  }
}








