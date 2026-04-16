import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Session } from '../../../../core/models/sessionevent.model';
import { SessioneventService } from '../../../../core/services/sessionevent.service';
import {
  EventService,
  EventModel,
} from '../../../../core/services/event.service';

@Component({
  selector: 'app-session-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './session-form.component.html',
  styleUrls: ['./session-form.component.css'],
})
export class SessionFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  submitError: string | null = null;
  loading = false;
  sessionTypes = ['ONLINE', 'PRESENTIEL', 'HYBRID'];
  sessionId?: number;

  // ── Event parent ─────────────────────────────────────────────────────
  eventId!: number;
  parentEvent: EventModel | null = null;
  parentEventLoading = true;

  constructor(
    private fb: FormBuilder,
    private sessionService: SessioneventService,
    private eventService: EventService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  // ── Getters pour les champs conditionnels ────────────────────────────

  /** Afficher Room + Maps si l'event parent est Présentiel ou Hybride */
  get showRoom(): boolean {
    const format = this.parentEvent?.format || '';
    return format === 'Présentiel' || format === 'Hybride';
  }

  /** Afficher MeetingLink si l'event parent est En Ligne ou Hybride */
  get showMeetingLink(): boolean {
    const format = this.parentEvent?.format || '';
    return format === 'En Ligne' || format === 'Hybride';
  }

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    // ── Lire eventId et sessionId depuis la route ─────────────────────
    // Route : /admin/events/:eventId/sessions/add
    //         /admin/events/:eventId/sessions/edit/:id
    this.eventId = +this.route.snapshot.params['eventId'];
    this.sessionId = this.route.snapshot.params['id']
      ? +this.route.snapshot.params['id']
      : undefined;
    this.isEdit = !!this.sessionId;

    this.form = this.fb.group({
      date: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      type: ['', Validators.required],
      availableSeats: [0, [Validators.required, Validators.min(1)]],
      room: [''],
      meetingLink: [''],
    });

    // ── Charger l'event parent pour les champs conditionnels ─────────
    this.eventService.getById(this.eventId).subscribe({
      next: (data) => {
        this.parentEvent = data;
        this.parentEventLoading = false;
        this.updateSessionValidators(data.format || '');

        // Pré-remplir le type de session selon le format de l'event
        if (!this.isEdit) {
          this.preselectSessionType(data.format || '');
        }

        if (this.isEdit && this.sessionId) {
          this.loadSession();
        }
      },
      error: () => {
        this.parentEventLoading = false;
        this.submitError = "Impossible de charger l'événement parent.";
      },
    });
  }

  private preselectSessionType(format: string): void {
    const typeMap: Record<string, string> = {
      Présentiel: 'PRESENTIEL',
      'En Ligne': 'ONLINE',
      Hybride: 'HYBRID',
    };
    const preselected = typeMap[format];
    if (preselected) {
      this.form.patchValue({ type: preselected });
    }
  }

  private updateSessionValidators(format: string): void {
    const roomCtrl = this.form.get('room')!;
    const meetCtrl = this.form.get('meetingLink')!;

    if (format === 'Présentiel') {
      roomCtrl.setValidators([Validators.required]);
      meetCtrl.clearValidators();
    } else if (format === 'En Ligne') {
      roomCtrl.clearValidators();
      meetCtrl.setValidators([Validators.required]);
    } else if (format === 'Hybride') {
      roomCtrl.setValidators([Validators.required]);
      meetCtrl.setValidators([Validators.required]);
    } else {
      roomCtrl.clearValidators();
      meetCtrl.clearValidators();
    }

    roomCtrl.updateValueAndValidity();
    meetCtrl.updateValueAndValidity();
  }

  loadSession(): void {
    if (!this.sessionId) return;
    this.loading = true;
    this.sessionService.getSessionById(this.sessionId).subscribe({
      next: (data: Session) => {
        this.form.patchValue(data);
        this.loading = false;
      },
      error: (err) => {
        this.submitError =
          err.message || 'Erreur lors du chargement de la session';
        this.loading = false;
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    // Toujours inclure l'eventId dans la session
    const session: Session = {
      ...this.form.getRawValue(),
      eventId: this.eventId,
    };

    if (this.isEdit && this.sessionId) {
      this.sessionService.updateSession(this.sessionId, session).subscribe({
        next: () =>
          this.router.navigate(['/admin/events', this.eventId, 'sessions']),
        error: (err) => {
          this.submitError = err.message || 'Erreur lors de la mise à jour';
          this.loading = false;
        },
      });
    } else {
      this.sessionService.addSession(session).subscribe({
        next: () =>
          this.router.navigate(['/admin/events', this.eventId, 'sessions']),
        error: (err) => {
          this.submitError = err.message || 'Erreur lors de la création';
          this.loading = false;
        },
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/events', this.eventId, 'sessions']);
  }
}
