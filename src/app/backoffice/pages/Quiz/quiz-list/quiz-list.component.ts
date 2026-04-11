import { Component, OnInit } from '@angular/core';
import { Quiz } from '../../Quiz/quiz';
import { QuizService } from '../quiz.service';
import { Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-student-quiz-list',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, ButtonModule],
  templateUrl: './quiz-list.component.html',
  styleUrls: ['./quiz-list.component.scss']
})
export class QuizListComponent implements OnInit {
  quizzes: Quiz[] = [];
  loading = false;

  constructor(
    private quizService: QuizService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadQuizzes();
  }

  loadQuizzes(): void {
    this.loading = true;
    this.quizService.getAll().subscribe({
      next: (data: Quiz[]) => {
        // filter to published only
        this.quizzes = (data ?? []).filter((q: Quiz) => q.status === 'PUBLISHED');
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        console.error('Erreur chargement quizzes', err);
      }
    });
  }

  takeQuiz(quiz: Quiz): void {
    if (quiz.id != null) {
      this.router.navigate(['/quiz', quiz.id]);
    }
  }
}
