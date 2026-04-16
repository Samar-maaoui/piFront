import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  Participation,
  ParticipationStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../../../core/models/participation.model';
import { ParticipationService } from '../../../../core/services/participation.service';
import { SessioneventService } from '../../../../core/services/sessionevent.service';

@Component({
  selector: 'app-participation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './participation-form.component.html',
  styleUrls: ['./participation-form.component.css'],
})
export class ParticipationFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  submitError: string | null = null;
  loading = false;

  statusOptions = Object.values(ParticipationStatus);
  paymentMethodOptions = Object.values(PaymentMethod);
  paymentStatusOptions = Object.values(PaymentStatus);

  participationId?: number;

  // ✅ Sessions dropdown (create) / readonly (edit)
  sessions: any[] = [];
  sessionsLoading = false;
  linkedSessionLabel = '';

  private _participation: any = null;

  constructor(
    private fb: FormBuilder,
    private participationService: ParticipationService,
    private sessionService: SessioneventService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.participationId = this.route.snapshot.params['id'];
    this.isEdit = !!this.participationId;

    this.form = this.fb.group({
      registrationDate: ['', Validators.required],
      status: ['', Validators.required],
      paymentMethod: ['', Validators.required],
      paymentStatus: ['', Validators.required],
      amountPaid: [0, [Validators.min(0)]],
      userId: [null, Validators.required],
      sessionId: [null, Validators.required],
    });

    if (this.isEdit) {
      this.form.get('sessionId')?.disable();
      this.loadSessions();
      this.loadParticipation();
    } else {
      this.loadSessions();
    }
  }

  get f() {
    return this.form.controls;
  }

  loadSessions(): void {
    this.sessionsLoading = true;
    this.sessionService.getAllSessions().subscribe({
      next: (data) => {
        this.sessions = data;
        this.sessionsLoading = false;
        this.tryResolveSessionLabel();
      },
      error: () => {
        this.sessionsLoading = false;
      },
    });
  }

  loadParticipation(): void {
    if (!this.participationId) return;
    this.loading = true;
    this.participationService
      .getParticipationById(this.participationId)
      .subscribe({
        next: (data) => {
          this._participation = data;
          this.form.patchValue(data);
          this.loading = false;
          this.tryResolveSessionLabel();
        },
        error: (err) => {
          this.submitError = err.message || 'Error loading participation';
          this.loading = false;
        },
      });
  }

  tryResolveSessionLabel(): void {
    if (!this._participation || this.sessions.length === 0) return;
    const sessionId = this._participation.sessionId;
    const session = this.sessions.find((s) => s.id === sessionId);
    this.linkedSessionLabel = session
      ? `${session.date} — ${session.type} — ${session.room}`
      : `ID ${sessionId}`;
  }

  getSessionLabel(s: any): string {
    return `${s.date} — ${s.type} — ${s.room}`;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const participation: Participation = this.form.getRawValue();

    if (this.isEdit && this.participationId) {
      this.participationService
        .updateParticipation(this.participationId, participation)
        .subscribe({
          next: () => this.router.navigate(['/admin/participations']),
          error: (err) => {
            this.submitError = err.message || 'Error updating participation';
            this.loading = false;
          },
        });
    } else {
      this.participationService.addParticipation(participation).subscribe({
        next: () => this.router.navigate(['/admin/participations']),
        error: (err) => {
          this.submitError = err.message || 'Error creating participation';
          this.loading = false;
        },
      });
    }
  }
}
