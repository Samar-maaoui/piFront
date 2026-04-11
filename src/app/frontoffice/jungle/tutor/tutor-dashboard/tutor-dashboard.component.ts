import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { BookingService } from '../../../../backoffice/pages/bookings-page/services/booking.service';

@Component({
  selector: 'app-tutor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tutor-dashboard.component.html',
  styleUrls: ['./tutor-dashboard.component.css']
})
export class TutorDashboardComponent implements OnInit {
  pendingCount = 0;
  showNotif = false;

  constructor(
    public authService: AuthService,
    private bookingService: BookingService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  get user() { return this.authService.getCurrentUser(); }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return; // skip SSR

    const user = this.user;
    console.log('[Dashboard] user:', user);

    if (user?.id) {
      this.bookingService.getByTutor(user.id).subscribe({
        next: (bookings) => {
          console.log('[Dashboard] bookings:', bookings);
          this.pendingCount = bookings.filter(b => b.status === 'PENDING').length;
          console.log('[Dashboard] pendingCount:', this.pendingCount);
          if (this.pendingCount > 0) {
            this.showNotif = true;
          }
        },
        error: (err) => {
          console.error('[Dashboard] booking load error:', err);
        }
      });
    }
  }

  dismissNotif(): void {
    this.showNotif = false;
  }
}
