import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Quiz } from '../../Quiz/quiz';
import { Question } from '../../models/question';
import { QuizService } from '../quiz.service';
import { QuestionService } from '../../Question/services/question.service';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-quiz-take',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, ButtonModule, RadioButtonModule],
  templateUrl: './quiz-take.component.html',
  styleUrls: ['./quiz-take.component.scss']
})
export class QuizTakeComponent implements OnInit {
  // Accept both backend QuizQuestion and BackOffice Question formats, so use any
  quiz: any = null;
  answers: number[] = [];
  score: number | null = null;
  loading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizService,
    private questionService: QuestionService
  ) { }

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id');
    const id = idStr ? +idStr : NaN;
    if (!isNaN(id)) {
      // Charger le quiz ET les questions en parallèle
      forkJoin({
        quiz: this.quizService.getById(id),
        questions: this.questionService.getByQuizId(id)
      }).subscribe({
        next: (result) => {
          // Si le quiz contient déjà les questions, les utiliser; sinon, utiliser celles du service
          // merge questions from quiz object or from separate request
          const questions: any[] =
            result.quiz.questions && result.quiz.questions.length > 0
              ? result.quiz.questions
              : result.questions || [];
          // cast to any to avoid strict typing mismatch between QuizQuestion and Question
          this.quiz = { ...result.quiz, questions: questions as any };

          console.log('✅ Quiz chargé du backend:', this.quiz);
          console.log('✅ Nombre de questions:', questions.length);

          if (!questions || questions.length === 0) {
            this.errorMessage = 'Aucune question trouvée pour ce quiz.';
          }
          if (questions) {
            this.answers = new Array(questions.length).fill(-1);
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement du quiz/questions:', err);

          // Fallback: essayer de charger juste le quiz
          this.quizService.getById(id).subscribe({
            next: (q: any) => {
              this.quiz = q;
              if (q.questions) {
                this.answers = new Array(q.questions.length).fill(-1);
              }
              if (!q.questions || q.questions.length === 0) {
                this.errorMessage = 'Aucune question trouvée pour ce quiz.';
              }
              this.loading = false;
              console.log('⚠️ Quiz chargé (fallback), questions incluses:', q.questions?.length || 0);
            },
            error: (fallbackErr: any) => {
              console.error('❌ Erreur fallback:', fallbackErr);
              this.errorMessage = 'Impossible de charger le quiz. Vérifiez que le serveur Spring Boot (http://localhost:8081) est bien lancé.';
              this.loading = false;
            }
          });
        }
      });
    } else {
      this.errorMessage = 'Quiz ID invalide.';
      this.loading = false;
    }
  }

  selectAnswer(qIndex: number, answerIndex: number): void {
    this.answers[qIndex] = answerIndex;
  }

  submit(): void {
    if (!this.quiz?.questions) return;
    let correct = 0;

    this.quiz.questions.forEach((q: any, i: number) => {
      // Gérer deux formats de questions possibles
      const correctAnswerIndex = q.correctAnswer !== undefined ? q.correctAnswer :
        (q.answers?.findIndex((a: any) => a.isCorrect) ?? -1);

      if (this.answers[i] === correctAnswerIndex) {
        correct++;
      }
    });

    this.score = Math.round((correct / this.quiz.questions.length) * 100);
  }

  backToList(): void {
    this.router.navigate(['/quizzes']);
  }
}
