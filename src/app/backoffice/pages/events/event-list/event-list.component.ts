import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  EventService,
  EventModel,
} from '../../../../core/services/event.service';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss'],
})
export class EventListComponent implements OnInit {
  events: EventModel[] = [];
  loading = true;
  error: string = '';

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.eventService.getAll().subscribe({
      next: (data) => {
        this.events = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      },
    });
  }
  // event-list.component.ts
  formatLabel(format: string): string {
    return format === 'En Ligne' ? '🌐 En ligne' : '📍 Présentiel';
  }

  delete(id: number): void {
    if (!confirm('Supprimer cet événement ?')) return;
    this.eventService.delete(id).subscribe(() => this.load());
  }
}
