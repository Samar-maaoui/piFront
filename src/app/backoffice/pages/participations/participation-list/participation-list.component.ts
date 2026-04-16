// src/app/participation-list/participation-list.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Participation } from '../../../../core/models/participation.model';
import { ParticipationService } from '../../../../core/services/participation.service';
@Component({
  selector: 'app-participation-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './participation-list.component.html',
  styleUrls: ['./participation-list.component.css'],
})
export class ParticipationListComponent implements OnInit {
  participations: Participation[] = [];
  loading = false;
  error: string | null = null;

  constructor(private participationService: ParticipationService) {}

  ngOnInit(): void {
    this.fetchParticipations();
  }

  fetchParticipations(): void {
    this.loading = true;
    this.participationService.getAllParticipations().subscribe({
      next: (data) => {
        this.participations = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Erreur lors du chargement';
        this.loading = false;
      },
    });
  }

  deleteParticipation(id: number): void {
    if (confirm('Voulez-vous vraiment supprimer cette participation ?')) {
      this.participationService.deleteParticipation(id).subscribe({
        next: () => {
          this.participations = this.participations.filter((p) => p.id !== id);
        },
        error: (err) => {
          alert('Erreur lors de la suppression : ' + (err.message || err));
        },
      });
    }
  }
}
