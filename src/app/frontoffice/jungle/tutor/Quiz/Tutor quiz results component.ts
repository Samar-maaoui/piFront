import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { QuizService } from '../../../../backoffice/pages/Quiz/quiz.service';
import { QuestionService } from '../../../../backoffice/pages/Question/services/question.service';

export interface StudentResult {
    studentName: string;
    score: number;
    passed: boolean;
    date?: string;
}

@Component({
    selector: 'app-tutor-quiz-results',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './Tutor quiz results.component.html',
    styleUrls: ['./Tutor quiz results.component.css']
})
export class TutorQuizResultsComponent implements OnInit {
    quizId: number | null = null;
    quizTitle = '';
    quizPassingScore = 60;
    questionCount = 0;
    loading = false;
    errorMessage = '';

    // Placeholder results — in a real app, these would come from a dedicated endpoint
    results: StudentResult[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private quizService: QuizService,
        private questionService: QuestionService
    ) { }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.quizId = +id;
            this.loadQuizInfo();
        }
    }

    loadQuizInfo(): void {
        if (!this.quizId) return;
        this.loading = true;
        this.quizService.getById(this.quizId).subscribe({
            next: (quiz) => {
                this.quizTitle = quiz.title;
                this.quizPassingScore = quiz.passingScore ?? 60;
                this.loading = false;
            },
            error: (err) => {
                this.errorMessage = 'Failed to load quiz information.';
                this.loading = false;
                console.error(err);
            }
        });

        this.questionService.getByQuizId(this.quizId).subscribe({
            next: (questions) => (this.questionCount = questions.length),
            error: () => { }
        });
    }

    get averageScore(): number {
        if (this.results.length === 0) return 0;
        return Math.round(this.results.reduce((sum, r) => sum + r.score, 0) / this.results.length);
    }

    get passedCount(): number {
        return this.results.filter(r => r.passed).length;
    }

    goBack(): void {
        this.router.navigate(['/tutor/quiz']);
    }
}