import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Session } from '../../../../core/models/sessionevent.model';
import { SessioneventService } from '../../../../core/services/sessionevent.service';
import {
  EventService,
  EventModel,
} from '../../../../core/services/event.service';

@Component({
  selector: 'app-session-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './session-list.component.html',
  styleUrls: ['./session-list.component.css'],
})
export class SessionListComponent implements OnInit {
  sessions: Session[] = [];
  events: EventModel[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private sessionService: SessioneventService,
    private eventService: EventService,
  ) {}

  ngOnInit(): void {
    this.fetchSessions();
    this.fetchEvents();
  }

  fetchSessions(): void {
    this.loading = true;
    this.error = null;
    this.sessionService.getAllSessions().subscribe({
      next: (data) => {
        this.sessions = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Erreur lors du chargement des sessions';
        this.loading = false;
      },
    });
  }

  fetchEvents(): void {
    this.eventService.getAll().subscribe({
      next: (data) => {
        this.events = data;
      },
      error: () => {},
    });
  }

  // ✅ Retourne le titre de l'événement à partir de son id
  getEventTitle(eventId: number | undefined): string {
    if (!eventId) return '—';
    const found = this.events.find((e) => e.id === eventId);
    return found ? found.title : `ID ${eventId}`;
  }

  deleteSession(id: number): void {
    if (!confirm('Voulez-vous vraiment supprimer cette session ?')) return;
    this.sessionService.deleteSession(id).subscribe({
      next: () => {
        this.sessions = this.sessions.filter((s) => s.id !== id);
      },
      error: (err) => {
        this.error = err.message || 'Erreur lors de la suppression';
      },
    });
  }
}
