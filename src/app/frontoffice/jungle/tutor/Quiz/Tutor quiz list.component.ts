import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Quiz } from '../../../../core/models/quiz';
import { QuizService } from '../../../../backoffice/pages/Quiz/quiz.service';
import { AuthService } from '../../../../core/services/auth.service';
import Swal from 'sweetalert2';
import { ViewEncapsulation } from '@angular/core';


@Component({
     encapsulation: ViewEncapsulation.None,
    selector: 'app-tutor-quiz-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './Tutor quiz list.component.html',
    styleUrls: ['./Tutor quiz list.component.css']
})
export class TutorQuizListComponent implements OnInit {
    quizzes: Quiz[] = [];
    loading = false;
    currentUserId: number | null = null;

    constructor(
        private quizService: QuizService,
        private authService: AuthService,
        private router: Router,
        @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    ngOnInit(): void {
        if (isPlatformBrowser(this.platformId)) {
            const user = this.authService.getCurrentUser();
            this.currentUserId = user?.id ?? null;
        }
        this.loadQuizzes();
    }

    loadQuizzes(): void {
        this.loading = true;
        this.quizService.getAll().subscribe({
            next: (data) => {
                this.quizzes = (data ?? []).filter(q =>
                    q.createdBy === this.currentUserId || q.tutorId === this.currentUserId
                );
                this.loading = false;
            },
            error: (err) => {
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load quizzes.',
                    confirmButtonColor: '#e74c3c'
                });
                console.error(err);
            }
        });
    }

    createQuiz(): void {
        this.router.navigate(['/tutor/quiz/new']);
    }

    editQuiz(quiz: Quiz): void {
        if (!this.canEditQuiz(quiz)) {
            Swal.fire({
                icon: 'error',
                title: 'Access Denied',
                text: 'You do not have permission to edit this quiz.',
                confirmButtonColor: '#e74c3c'
            });
            return;
        }
        this.router.navigate(['/tutor/quiz/edit', quiz.id]);
    }

    viewResults(quiz: Quiz): void {
        this.router.navigate(['/tutor/quiz', quiz.id, 'results']);
    }

    viewStats(quiz: Quiz): void {
        this.router.navigate(['/tutor/quiz', quiz.id, 'stats']);
    }

    deleteQuiz(quiz: Quiz): void {
        if (!quiz.id) return;

        if (!this.canEditQuiz(quiz)) {
            Swal.fire({
                icon: 'error',
                title: 'Access Denied',
                text: 'You do not have permission to delete this quiz.',
                confirmButtonColor: '#e74c3c'
            });
            return;
        }

        Swal.fire({
            icon: 'warning',
            title: 'Delete this quiz?',
            text: `"${quiz.title}" will be permanently deleted.`,
            showCancelButton: true,
            confirmButtonText: 'Yes, delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#aaa'
        }).then(result => {
            if (result.isConfirmed) {
                this.quizService.delete(quiz.id!).subscribe({
                    next: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: `"${quiz.title}" has been deleted.`,
                            confirmButtonColor: '#2db4a0'
                        });
                        this.loadQuizzes();
                    },
                    error: (err) => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to delete quiz.',
                            confirmButtonColor: '#e74c3c'
                        });
                        console.error(err);
                    }
                });
            }
        });
    }

    canEditQuiz(quiz: Quiz): boolean {
        return quiz.createdBy === this.currentUserId || quiz.tutorId === this.currentUserId;
    }

    getStatusLabel(status?: string): string {
        switch (status) {
            case 'PUBLISHED': return 'Published';
            case 'DRAFT':     return 'Draft';
            case 'ARCHIVED':  return 'Archived';
            default:          return status ?? '';
        }
    }
}