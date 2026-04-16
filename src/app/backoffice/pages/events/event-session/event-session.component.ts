import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  EventService,
  EventModel,
} from '../../../../core/services/event.service';
import { SessioneventService } from '../../../../core/services/sessionevent.service';
import { Session } from '../../../../core/models/sessionevent.model';

@Component({
  selector: 'app-event-session',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './event-session.component.html',
  styleUrl: './event-session.component.css',
})
export class EventSessionComponent implements OnInit {
  eventId!: number;
  event: EventModel | null = null;
  sessions: Session[] = [];
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private sessionService: SessioneventService,
  ) {}

  ngOnInit(): void {
    this.eventId = +this.route.snapshot.params['id'];
    // Guard against NaN — redirect back to events list
    if (!this.eventId || isNaN(this.eventId)) {
      this.router.navigate(['/admin/events']);
      return;
    }
    this.loadEvent();
    this.loadSessions();
  }

  loadEvent(): void {
    this.eventService.getById(this.eventId).subscribe({
      next: (data) => {
        this.event = data;
      },
      error: () => {
        this.error = "Impossible de charger l'événement.";
      },
    });
  }

  loadSessions(): void {
    this.loading = true;
    this.sessionService.getSessionsByEvent(this.eventId).subscribe({
      next: (data) => {
        this.sessions = data;
        this.loading = false;
      },
      error: () => {
        this.sessions = [];
        this.loading = false;
      },
    });
  }

  addSession(): void {
    this.router.navigate(['/admin/events', this.eventId, 'sessions', 'add']);
  }

  editSession(sessionId: number): void {
    this.router.navigate([
      '/admin/events',
      this.eventId,
      'sessions',
      'edit',
      sessionId,
    ]);
  }

  deleteSession(sessionId: number): void {
    if (!confirm('Supprimer cette session ?')) return;
    this.sessionService.deleteSession(sessionId).subscribe({
      next: () => this.loadSessions(),
      error: () => {
        this.error = 'Erreur lors de la suppression.';
      },
    });
  }
  save(): void {
    this.router.navigate(['/admin/events']);
  }

  skip(): void {
    this.router.navigate(['/admin/events']);
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'ONLINE':
        return '🌐 En ligne';
      case 'PRESENTIEL':
        return '📍 Présentiel';
      case 'HYBRID':
        return '🔀 Hybride';
      default:
        return type;
    }
  }
}
