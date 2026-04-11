// tutor-students.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-tutor-students',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="container mt-4">
      <h2>My Students</h2>
      <p class="text-muted">This page is under construction.</p>
      <div class="alert alert-info">
        Here you will be able to see the list of students you have sessions with, track their progress, and send them messages.
      </div>
    </div>
  `,
    styles: [`
    .container {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
  `]
})
export class TutorStudentsComponent implements OnInit {

    constructor() { }

    ngOnInit(): void {
    }
}
