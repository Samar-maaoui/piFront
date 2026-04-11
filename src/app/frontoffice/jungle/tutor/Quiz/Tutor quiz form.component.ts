import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Quiz } from '../../../../core/models/quiz';
import { Question, Answer } from '../../../../core/models/question';
import { QuizService } from '../../../../backoffice/pages/Quiz/quiz.service';
import { QuestionService } from '../../../../backoffice/services/question.service';
import { AuthService } from '../../../../core/services/auth.service';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-tutor-quiz-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './Tutor quiz form.component.html',
    styleUrls: ['./Tutor quiz form.component.css']
})
export class TutorQuizFormComponent implements OnInit {

    quiz: Partial<Quiz> = {
        title:        '',
        description:  '',
        level:        'A1',
        status:       'DRAFT',
        passingScore: 60,
        duration:     30,
        maxAttempts:  1,
        isAdaptive:   false,
        questions:    []
    };

    isEditMode              = false;
    quizId: number | null   = null;
    loading                 = false;
    saving                  = false;
    errorMessage            = '';
    successMessage          = '';
    canEdit                 = false;
    currentUserId: number | null = null;

    levels = ['A1', 'A2', 'B1', 'B2', 'C1'];

    constructor(
        private quizService: QuizService,
        private questionService: QuestionService,
        private authService: AuthService,
        private route: ActivatedRoute,
        private router: Router,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {}

    ngOnInit(): void {
        if (isPlatformBrowser(this.platformId)) {
            const user = this.authService.getCurrentUser();
            this.currentUserId = user?.id ? Number(user.id) : null;
        }

        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode = true;
            this.quizId     = +id;
            this.loadQuiz();
        } else {
            this.canEdit = true;
        }
    }

    // ── Load quiz ──────────────────────────────────

    loadQuiz(): void {
        if (!this.quizId) return;
        this.loading = true;

        this.quizService.getById(this.quizId).pipe(
            switchMap((quizData) => {
                this.quiz    = { ...quizData, questions: [] };
                this.canEdit = Number(this.currentUserId) === Number(quizData.createdBy)
                            || Number(this.currentUserId) === Number(quizData.tutorId);

                if (!this.canEdit) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Access Denied',
                        text: 'You do not have permission to edit this quiz.',
                        confirmButtonColor: '#e74c3c'
                    });
                    this.loading = false;
                    return of(null);
                }
                return this.questionService.getByQuizId(this.quizId!);
            })
        ).subscribe({
            next: (questions) => {
                if (questions) this.quiz.questions = questions as any[];
                this.loading = false;
            },
            error: () => {
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load quiz.',
                    confirmButtonColor: '#e74c3c'
                });
            }
        });
    }

    // ── Questions ──────────────────────────────────

    addQuestion(): void {
        if (!this.quiz.questions) this.quiz.questions = [];
        this.quiz.questions.push({
            text:       '',
            points:     10,
            orderIndex: this.quiz.questions.length,
            answers: [
                { text: '', isCorrect: false, orderIndex: 0 },
                { text: '', isCorrect: false, orderIndex: 1 }
            ]
        } as any);
    }

    removeQuestion(index: number): void {
        Swal.fire({
            icon: 'warning',
            title: 'Remove this question?',
            text: 'This question and its answers will be deleted.',
            showCancelButton: true,
            confirmButtonText: 'Yes, remove',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#aaa'
        }).then(result => {
            if (result.isConfirmed && this.quiz.questions) {
                this.quiz.questions.splice(index, 1);
                this.quiz.questions.forEach((q, i) => { if (q) q.orderIndex = i; });
            }
        });
    }

    // ── Answers ────────────────────────────────────

    addAnswer(qIndex: number): void {
        const q = this.quiz.questions?.[qIndex];
        if (q?.answers) {
            q.answers.push({ text: '', isCorrect: false, orderIndex: q.answers.length } as any);
        }
    }

    removeAnswer(qIndex: number, aIndex: number): void {
        const q = this.quiz.questions?.[qIndex];
        if (q?.answers) {
            q.answers.splice(aIndex, 1);
            q.answers.forEach((a: Answer, i: number) => { if (a) a.orderIndex = i; });
        }
    }

    setCorrectAnswer(qIndex: number, aIndex: number): void {
        const q = this.quiz.questions?.[qIndex];
        if (q?.answers) {
            q.answers.forEach((a: Answer, i: number) => { a.isCorrect = (i === aIndex); });
        }
    }

    // ── Validation ─────────────────────────────────

    private validate(): boolean {
        if (!this.quiz.title?.trim()) {
            Swal.fire({ icon: 'warning', title: 'Validation Error', text: 'Title is required.', confirmButtonColor: '#f39c12' });
            return false;
        }
        if (!this.quiz.questions || this.quiz.questions.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Validation Error', text: 'At least one question is required.', confirmButtonColor: '#f39c12' });
            return false;
        }
        for (const [i, q] of this.quiz.questions.entries()) {
            if (!q.text?.trim()) {
                Swal.fire({ icon: 'warning', title: `Question ${i + 1}`, text: 'Question text is required.', confirmButtonColor: '#f39c12' });
                return false;
            }
            if (!q.answers || q.answers.length < 2) {
                Swal.fire({ icon: 'warning', title: `Question ${i + 1}`, text: 'At least 2 answers are required.', confirmButtonColor: '#f39c12' });
                return false;
            }
            if (q.answers.some((a: any) => !a.text?.trim())) {
                Swal.fire({ icon: 'warning', title: `Question ${i + 1}`, text: 'All answers must have text.', confirmButtonColor: '#f39c12' });
                return false;
            }
            if (!q.answers.some((a: any) => a.isCorrect)) {
                Swal.fire({ icon: 'warning', title: `Question ${i + 1}`, text: 'Mark at least one correct answer.', confirmButtonColor: '#f39c12' });
                return false;
            }
        }
        return true;
    }

    // ── Save ───────────────────────────────────────

    save(): void {
        if (!this.validate()) return;
        this.saving = true;

        if (this.isEditMode && this.quizId) {
            this.updateQuizWithQuestions();
        } else {
            this.createQuizWithQuestions();
        }
    }

    // ── CREATE ─────────────────────────────────────

    private createQuizWithQuestions(): void {
        const questions = [...(this.quiz.questions || [])];
        const quizPayload: Partial<Quiz> = {
            ...this.quiz,
            questions: [],
            createdBy: this.currentUserId ?? undefined
        };

        this.quizService.create(quizPayload).pipe(
            switchMap((createdQuiz) => {
                if (!questions.length) return of(createdQuiz);
                const tasks = questions.map((q: any, index: number) =>
                    this.questionService.saveWithAnswers({
                        quizId:     createdQuiz.id,
                        text:       q.text,
                        orderIndex: index,
                        points:     q.points ?? 10,
                        answers:    (q.answers || []).map((a: any, ai: number) => ({
                            text:       a.text,
                            isCorrect:  a.isCorrect,
                            orderIndex: ai
                        }))
                    })
                );
                return forkJoin(tasks);
            })
        ).subscribe({
            next: () => {
                this.saving = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Quiz created successfully.',
                    confirmButtonColor: '#2db4a0'
                }).then(() => this.router.navigate(['/tutor/quiz']));
            },
            error: (err) => {
                this.saving = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to create quiz. Please try again.',
                    confirmButtonColor: '#e74c3c'
                });
                console.error('CREATE ERROR:', err);
            }
        });
    }

    // ── UPDATE ─────────────────────────────────────

    private updateQuizWithQuestions(): void {
        if (!this.quizId) return;

        const questions = [...(this.quiz.questions || [])];
        const quizPayload: Partial<Quiz> = {
            ...this.quiz,
            questions: [],
            createdBy: this.currentUserId ?? undefined
        };

        this.quizService.update(this.quizId, quizPayload).pipe(
            switchMap((updatedQuiz) => {
                if (!questions.length) return of(updatedQuiz);
                const tasks = questions.map((q: any, index: number) => {
                    if (q.id) {
                        return this.questionService.update(q.id, {
                            quizId:     this.quizId!,
                            text:       q.text,
                            orderIndex: index,
                            points:     q.points ?? 10
                        }).pipe(
                            switchMap((updatedQ) => {
                                if (!q.answers?.length) return of(updatedQ);
                                const answerTasks = q.answers.map((a: any, ai: number) => {
                                    const ansPayload: Partial<Answer> = {
                                        text:       a.text,
                                        isCorrect:  a.isCorrect,
                                        orderIndex: ai
                                    };
                                    return a.id
                                        ? this.questionService.updateAnswer(a.id, ansPayload)
                                        : this.questionService.addAnswer(q.id, ansPayload);
                                });
                                return forkJoin(answerTasks);
                            })
                        );
                    } else {
                        return this.questionService.saveWithAnswers({
                            quizId:     this.quizId!,
                            text:       q.text,
                            orderIndex: index,
                            points:     q.points ?? 10,
                            answers:    (q.answers || []).map((a: any, ai: number) => ({
                                text:       a.text,
                                isCorrect:  a.isCorrect,
                                orderIndex: ai
                            }))
                        });
                    }
                });
                return forkJoin(tasks);
            })
        ).subscribe({
            next: () => {
                this.saving = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Updated!',
                    text: 'Quiz updated successfully.',
                    confirmButtonColor: '#2db4a0'
                }).then(() => this.router.navigate(['/tutor/quiz']));
            },
            error: (err) => {
                this.saving = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to update quiz. Please try again.',
                    confirmButtonColor: '#e74c3c'
                });
                console.error('UPDATE ERROR:', err);
            }
        });
    }

    cancel(): void {
        Swal.fire({
            icon: 'question',
            title: 'Cancel?',
            text: 'Unsaved changes will be lost.',
            showCancelButton: true,
            confirmButtonText: 'Yes, cancel',
            cancelButtonText: 'Stay',
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#2db4a0'
        }).then(result => {
            if (result.isConfirmed) {
                this.router.navigate(['/tutor/quiz']);
            }
        });
    }
}