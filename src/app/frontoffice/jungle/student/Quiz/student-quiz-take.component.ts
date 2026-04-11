import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';
import { TtsService } from '../../../../backoffice/services/Tts.service';
import { UnsplashService, UnsplashImage } from '../../../../backoffice/services/Unsplash.service';
import { LottieComponent, AnimationOptions } from 'ngx-lottie';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-student-quiz-take',
  standalone: true,
  imports: [CommonModule, LottieComponent],
  templateUrl: './student-quiz-take.component.html',
  styleUrls: ['./student-quiz-take.component.css']
})
export class StudentQuizTakeComponent implements OnInit, OnDestroy {

  quiz: any = null;
  questions: any[] = [];
  loading = true;

  currentIndex = 0;
  selectedAnswerIndex = -1;

  showFeedback = false;
  lastAnswerCorrect = false;
  lastXpEarned = 0;
  isSubmittingAnswer = false;

  livesRemaining = 3;
  livesArray = [0, 1, 2];

  timeLeft = 0;
  private timerInterval: any;

  showResult = false;
  isGameOver = false;
  score = 0;
  xpEarned = 0;
  durationSeconds = 0;
  canRetry = false;
  private startTime = 0;

  attemptId: number | null = null;
  currentUserId: number | null = null;

  currentImage: UnsplashImage | null = null;
  imageLoading = false;

  // ── Lottie animations ──
  lottieStart:   AnimationOptions = { path: 'assets/animations/start.json',   loop: false };
  lottieCorrect: AnimationOptions = { path: 'assets/animations/correct.json', loop: false };
  lottieWrong:   AnimationOptions = { path: 'assets/animations/wrong.json',   loop: false };
  lottieTrophy:  AnimationOptions = { path: 'assets/animations/trophy.json',  loop: false };
  lottieFail:    AnimationOptions = { path: 'assets/animations/fail.json',    loop: false };

  showStartAnim   = false;
  showCorrectAnim = false;
  showWrongAnim   = false;

  private api = 'http://localhost:8081/api';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    public ttsService: TtsService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private unsplashService: UnsplashService
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const user = this.authService.getCurrentUser();
      this.currentUserId = user?.id ?? null;
    }

    const quizId = +this.route.snapshot.params['id'];
    if (!quizId) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Quiz',
        text: 'Quiz ID is invalid.',
        confirmButtonColor: '#e74c3c'
      }).then(() => this.router.navigate(['/student/quiz']));
      this.loading = false;
      return;
    }

    this.loadQuiz(quizId);
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.ttsService.stop();
    this.ttsService.clearCache();
    this.unsplashService.clearCache();
  }

  get currentQuestion(): any {
    return this.questions[this.currentIndex];
  }

  loadQuiz(quizId: number): void {
    this.http.get<any>(`${this.api}/quizzes/${quizId}`).subscribe({
      next: (quiz) => {
        this.quiz = quiz;
        this.timeLeft = (quiz.duration || 10) * 60;

        this.http.get<any[]>(`${this.api}/questions/quiz/${quizId}`).subscribe({
          next: (questions) => {
            this.questions = questions;
            this.loading = false;
            if (!questions.length) {
              Swal.fire({
                icon: 'warning',
                title: 'No Questions',
                text: 'This quiz has no questions yet.',
                confirmButtonColor: '#f39c12'
              }).then(() => this.router.navigate(['/student/quiz']));
              return;
            }
            this.startTime = Date.now();
            this.startAttempt(quizId);
            this.startTimer();
            this.loadImageForCurrentQuestion();
            this.showStartAnim = true;
            setTimeout(() => this.showStartAnim = false, 3000);
          },
          error: () => {
            this.loading = false;
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Failed to load questions.',
              confirmButtonColor: '#e74c3c'
            }).then(() => this.router.navigate(['/student/quiz']));
          }
        });
      },
      error: () => {
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load quiz.',
          confirmButtonColor: '#e74c3c'
        }).then(() => this.router.navigate(['/student/quiz']));
      }
    });
  }

  private startAttempt(quizId: number): void {
    if (!this.currentUserId) return;
    this.http.post<any>(`${this.api}/quiz-attempts/start`, {}, {
      params: { quizId: quizId.toString(), studentId: this.currentUserId.toString() }
    }).subscribe({
      next: (attempt) => { this.attemptId = attempt.id; },
      error: (err) => {
        this.stopTimer();
        const isMaxAttempts = err.status === 429 || err.status === 400 ||
          err.error?.message?.toLowerCase().includes('maximum attempts');
        if (isMaxAttempts) {
          Swal.fire({
            icon: 'warning',
            title: 'No Attempts Left',
            text: 'You have reached the maximum number of attempts for this quiz.',
            confirmButtonColor: '#f39c12',
            confirmButtonText: 'View My Results'
          }).then(() => this.router.navigate(['/student/results']));
        } else {
          console.warn('Attempt not created:', err);
        }
      }
    });
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.stopTimer();
        this.handleTimeout();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private handleTimeout(): void {
    Swal.fire({
      icon: 'warning',
      title: "Time's Up! ⏰",
      text: 'You ran out of time!',
      confirmButtonColor: '#f39c12',
      timer: 3000,
      timerProgressBar: true
    });
    if (this.attemptId) {
      this.http.patch(`${this.api}/quiz-attempts/${this.attemptId}/timeout`, {})
        .subscribe({
          next: (result: any) => this.showFinalResult(result),
          error: () => this.showFinalResult(null)
        });
    } else this.showFinalResult(null);
  }

  selectAnswer(index: number): void {
    if (this.showFeedback) return;
    this.selectedAnswerIndex = index;
  }

  submitAnswer(): void {
    if (this.selectedAnswerIndex === -1 || this.isSubmittingAnswer) return;
    const q = this.currentQuestion;
    const selectedAnswer = q.answers?.[this.selectedAnswerIndex];
    const responseTimeSec = Math.floor((Date.now() - this.startTime) / 1000);
    this.isSubmittingAnswer = true;

    const fallback = () => {
      this.lastAnswerCorrect = selectedAnswer?.isCorrect ?? false;
      this.showFeedback = true;
      this.isSubmittingAnswer = false;
      this.triggerAnswerAnimation(this.lastAnswerCorrect);
      if (!this.lastAnswerCorrect) this.livesRemaining--;
      if (this.livesRemaining <= 0) {
        this.stopTimer();
        setTimeout(() => this.handleGameOver(null), 1200);
      } else setTimeout(() => this.nextQuestion(), 1200);
    };

    if (this.attemptId && selectedAnswer?.id) {
      this.http.post<any>(`${this.api}/quiz-attempts/${this.attemptId}/answer`, {}, {
        params: {
          questionId: q.id.toString(),
          selectedAnswerId: selectedAnswer.id.toString(),
          responseTimeSec: responseTimeSec.toString()
        }
      }).subscribe({
        next: (result) => {
          this.lastAnswerCorrect = result.isCorrect;
          this.lastXpEarned = result.xpEarned || 0;
          this.livesRemaining = result.livesRemaining ?? this.livesRemaining;
          this.showFeedback = true;
          this.isSubmittingAnswer = false;
          this.triggerAnswerAnimation(result.isCorrect);
          if (result.gameOver) {
            this.stopTimer();
            setTimeout(() => this.handleGameOver(result), 1200);
          } else setTimeout(() => this.nextQuestion(), 1200);
        },
        error: fallback
      });
    } else fallback();
  }

  private nextQuestion(): void {
    this.ttsService.stop();
    this.showFeedback = false;
    this.selectedAnswerIndex = -1;

    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.loadImageForCurrentQuestion();
    } else {
      this.stopTimer();
      this.completeQuiz();
    }
  }

  private completeQuiz(): void {
    if (this.attemptId) {
      this.http.patch<any>(`${this.api}/quiz-attempts/${this.attemptId}/complete`, {})
        .subscribe({ next: (res) => this.showFinalResult(res), error: () => this.showFinalResult(null) });
    } else this.showFinalResult(null);
  }

  private handleGameOver(result: any): void {
    this.isGameOver = true;
    Swal.fire({
      icon: 'error',
      title: 'Game Over! 💔',
      text: 'You lost all your lives.',
      confirmButtonColor: '#e74c3c',
      timer: 3000,
      timerProgressBar: true
    });
    this.showFinalResult(result);
  }

  private showFinalResult(result: any): void {
    this.durationSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    if (result) {
      this.score = result.percentage ?? 0;
      this.xpEarned = result.xpEarned ?? 0;
    } else {
      const correct = this.questions.filter((q, i) => {
        const ans = q.answers?.[this.selectedAnswerIndex];
        return ans?.isCorrect;
      }).length;
      this.score = Math.round((correct / this.questions.length) * 100);
    }
    this.canRetry = this.quiz?.maxAttempts ? (this.quiz.attemptsCount ?? 0) < this.quiz.maxAttempts - 1 : true;

    // ✅ Swal selon score
    setTimeout(() => {
      if (this.score >= (this.quiz?.passingScore ?? 60)) {
        Swal.fire({
          icon: 'success',
          title: '🎉 Congratulations!',
          text: `You passed with ${this.score}%! +${this.xpEarned} XP`,
          confirmButtonColor: '#2db4a0',
          timer: 4000,
          timerProgressBar: true
        });
      } else if (!this.isGameOver) {
        Swal.fire({
          icon: 'warning',
          title: 'Quiz Completed',
          text: `You scored ${this.score}%. Keep practicing!`,
          confirmButtonColor: '#f39c12',
          timer: 3000,
          timerProgressBar: true
        });
      }
    }, 500);

    this.showResult = true;
  }

  speakQuestion(): void {
    const q = this.currentQuestion;
    if (!q) return;
    const answers = q.answers?.map((a: any, i: number) => `${['A','B','C','D'][i]}: ${a.text}`).join('. ') || '';
    const fullText = `${q.text}. ${answers}`;
    this.ttsService.toggle(fullText);
  }

  loadImageForCurrentQuestion(): void {
    const q = this.currentQuestion;
    if (!q?.text) return;
    this.imageLoading = true;
    this.currentImage = null;
    this.unsplashService.getImageForQuestion(q.text).subscribe({
      next: (img) => { this.currentImage = img; this.imageLoading = false; },
      error: () => { this.imageLoading = false; }
    });
  }

  formatTime(seconds: number): string {
    if (!seconds || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2,'0')}`;
  }

  getAnswerLetter(index: number): string {
    return ['A','B','C','D','E','F'][index] || String(index + 1);
  }

  triggerAnswerAnimation(isCorrect: boolean): void {
    if (isCorrect) {
      this.showCorrectAnim = true;
      setTimeout(() => this.showCorrectAnim = false, 2000);
    } else {
      this.showWrongAnim = true;
      setTimeout(() => this.showWrongAnim = false, 2000);
    }
  }

  retry(): void {
    // Force reload by navigating away first, then back
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/student/quiz', this.quiz.id, 'take']);
    });
  }
  goToHistory(): void { this.router.navigate(['/student/results']); }
  goBack(): void { this.router.navigate(['/student/quiz']); }
}