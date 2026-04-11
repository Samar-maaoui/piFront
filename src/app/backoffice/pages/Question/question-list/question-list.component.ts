import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Question, Answer } from '../../models/question';
import { QuestionService } from '../services/question.service';
import { QuizService } from '../../../../backoffice/pages/Quiz/quiz.service';
import { QuestionFormComponent } from '../question-form/question-form.component';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    QuestionFormComponent,
    ConfirmDialogModule,
    ToastModule,
    DragDropModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './question-list.component.html',
  styleUrls: ['./question-list.component.scss']
})
export class QuestionListComponent implements OnInit, OnDestroy {
  questions: Question[] = [];
  filteredQuestions: Question[] = [];
  showForm = false;
  editingQuestion: Question | null = null;
  loading = false;

  // Identifiants
  quizId: number | null = null;
  quizTitle: string = '';

  // États d'expansion
  expandedQuestionId: number | null = null;

  // Filtres et recherche
  searchTerm: string = '';
  pointsFilter: string = 'all';
  correctFilter: string = 'all';

  // Pagination
  currentPage: number = 0;
  pageSize: number = 10;
  totalPages: number = 1;

  // Statistiques
  totalPoints: number = 0;
  totalAnswers: number = 0;

  // Abonnements
  private subscriptions: Subscription[] = [];

  constructor(
    private questionService: QuestionService,
    private quizService: QuizService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Récupérer l'ID du quiz depuis l'URL
    this.route.params.subscribe(params => {
      const id = params['quizId'];
      if (id) {
        this.quizId = +id;
        this.loadQuizInfo();
        this.loadQuestions();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Charger les informations du quiz
  loadQuizInfo(): void {
    if (!this.quizId) return;

    this.quizService.getById(this.quizId).subscribe({
      next: (quiz) => {
        this.quizTitle = quiz?.title || 'Quiz inconnu';
      },
      error: (err: any) => {
        console.error('Erreur chargement quiz', err);
      }
    });
  }

  // Charger les questions
  loadQuestions(): void {
    this.loading = true;

    const obs = this.quizId
      ? this.questionService.getByQuizId(this.quizId)
      : this.questionService.getAll();

    obs.subscribe({
      next: (data) => {
        // when we receive questions make sure each object has the extra properties
        this.questions = data
          ?.sort((a, b) => a.orderIndex - b.orderIndex)
          .map(q => ({
            ...q,
            showAnswerForm: false,
            newAnswerText: '',
            newAnswerCorrect: false
          })) || [];
        this.calculateStats();
        this.applyFilters();
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        console.error('Erreur chargement questions', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message ?? 'Impossible de charger les questions.'
        });
      }
    });
  }

  // Calculer les statistiques
  private calculateStats(): void {
    this.totalPoints = this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
    this.totalAnswers = this.questions.reduce((sum, q) => sum + (q.answers?.length || 0), 0);
  }

  // Appliquer les filtres
  applyFilters(): void {
    let filtered = [...this.questions];

    // Filtre par recherche
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(q =>
        q.text.toLowerCase().includes(term) ||
        q.answers?.some((a: any) => a.text.toLowerCase().includes(term))
      );
    }

    // Filtre par points
    if (this.pointsFilter !== 'all') {
      const points = parseInt(this.pointsFilter);
      filtered = filtered.filter(q => q.points === points);
    }

    // Filtre par type de réponse
    if (this.correctFilter !== 'all') {
      filtered = filtered.filter(q => {
        const correctCount = q.answers?.filter((a: any) => a.isCorrect).length || 0;
        return this.correctFilter === 'single' ? correctCount === 1 : correctCount > 1;
      });
    }

    this.filteredQuestions = filtered;
    this.totalPages = Math.ceil(this.filteredQuestions.length / this.pageSize);
    this.currentPage = 0;
  }

  // Réinitialiser les filtres
  clearFilters(): void {
    this.searchTerm = '';
    this.pointsFilter = 'all';
    this.correctFilter = 'all';
    this.applyFilters();
  }

  // Pagination
  changePage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
    }
  }

  get paginatedQuestions(): Question[] {
    const start = this.currentPage * this.pageSize;
    return this.filteredQuestions.slice(start, start + this.pageSize);
  }

  // Ouvrir le formulaire de création
  openCreate(): void {
    if (!this.quizId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Attention',
        detail: 'Veuillez sélectionner un quiz d\'abord.'
      });
      return;
    }
    this.editingQuestion = null;
    this.showForm = true;
  }

  // Ouvrir le formulaire d'édition
  openEdit(question: Question): void {
    this.editingQuestion = question;
    this.showForm = true;
  }

  // Dupliquer une question
  duplicateQuestion(question: Question): void {
    const duplicate: Partial<Question> = {
      quizId: question.quizId,
      text: question.text + ' (copie)',
      orderIndex: this.questions.length,
      points: question.points,
      answers: question.answers?.map((a: any) => ({
        text: a.text,
        isCorrect: a.isCorrect,
        orderIndex: a.orderIndex
      }))
    };

    this.questionService.create(duplicate).subscribe({
      next: () => {
        this.loadQuestions();
        this.messageService.add({
          severity: 'success',
          summary: 'Question dupliquée',
          detail: 'La question a été dupliquée avec succès.'
        });
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message ?? 'Impossible de dupliquer la question.'
        });
      }
    });
  }

  // Sauvegarde d'une question
  onSaved(data: Partial<Question>): void {
    const saveOperation = data.id
      ? this.questionService.update(data.id, data)
      : this.questionService.create(data);

    saveOperation.subscribe({
      next: () => {
        this.loadQuestions();
        this.messageService.add({
          severity: 'success',
          summary: data.id ? 'Question mise à jour' : 'Question créée',
          detail: data.id
            ? 'Les modifications ont été enregistrées.'
            : 'La nouvelle question a été ajoutée.'
        });
        this.showForm = false;
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message ?? 'Impossible de sauvegarder la question.'
        });
      }
    });
  }

  // Annulation du formulaire
  onFormCancelled(): void {
    this.showForm = false;
  }

  // Confirmation de suppression
  confirmDelete(question: Question, event: Event): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `Supprimer la question « ${question.text.substring(0, 50)}${question.text.length > 50 ? '...' : ''} » ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        if (!question.id) return;

        this.questionService.delete(question.id).subscribe({
          next: () => {
            this.loadQuestions();
            this.messageService.add({
              severity: 'info',
              summary: 'Question supprimée',
              detail: 'La question a été supprimée.'
            });
          },
          error: (err: any) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: err?.error?.message ?? 'Impossible de supprimer la question.'
            });
          }
        });
      }
    });
  }

  // Drag & drop pour réorganiser
  onQuestionDrop(event: CdkDragDrop<Question[]>): void {
    if (this.searchTerm) return; // Pas de drag pendant la recherche

    const questions = [...this.questions];
    moveItemInArray(questions, event.previousIndex, event.currentIndex);

    // Mettre à jour les orderIndex
    const updatedQuestions = questions.map((q, index) => ({
      ...q,
      orderIndex: index
    }));

    this.questions = updatedQuestions;
    this.applyFilters();

    // Sauvegarder le nouvel ordre
    this.questionService.reorderQuestions(
      updatedQuestions.map(q => ({ id: q.id!, orderIndex: q.orderIndex }))
    ).subscribe({
      error: (err: any) => {
        console.error('Erreur réorganisation', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de réorganiser les questions.'
        });
        this.loadQuestions(); // Recharger l'état original
      }
    });
  }

  // Toggle expansion
  toggleExpand(questionId: number): void {
    if (this.expandedQuestionId === questionId) {
      // closing the details: reset any open answer form for that question
      const q = this.questions.find(q => q.id === questionId);
      if (q) {
        q.showAnswerForm = false;
        q.newAnswerText = '';
        q.newAnswerCorrect = false;
      }
      this.expandedQuestionId = null;
    } else {
      this.expandedQuestionId = questionId;
    }
  }

  // Vérifier si une question a plusieurs réponses correctes
  hasMultipleCorrectAnswers(question: Question): boolean {
    return (question.answers?.filter((a: any) => a.isCorrect).length || 0) > 1;
  }

  // ---------------------------------------------------
  // gestion individuelle des réponses
  // ---------------------------------------------------
  openAnswerForm(question: Question, event: Event): void {
    // prevent the click from bubbling up to the question header which toggles expansion
    event.stopPropagation();

    if (!question.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Attention',
        detail: 'Veuillez enregistrer la question avant d\'ajouter des réponses.'
      });
      return;
    }

    // reset fields when opening
    question.newAnswerText = '';
    question.newAnswerCorrect = false;
    question.showAnswerForm = true;
  }

  addAnswer(question: Question): void {
    // make sure the form is actually visible and contains text
    if (!question.id || !question.showAnswerForm || !question.newAnswerText?.trim()) {
      return;
    }

    const newAnswer: Partial<Answer> = {
      questionId: question.id,
      text: question.newAnswerText.trim(),
      isCorrect: question.newAnswerCorrect ?? false,
      orderIndex: question.answers?.length || 0
    };

    this.questionService.addAnswer(question.id, newAnswer).subscribe({
      next: (ans) => {
        question.answers = question.answers ?? [];
        question.answers.push(ans);
        question.showAnswerForm = false;
        question.newAnswerText = '';
        question.newAnswerCorrect = false;
        this.calculateStats();
        this.messageService.add({
          severity: 'success',
          summary: 'Réponse ajoutée',
          detail: 'La réponse a été créée.'
        });
      },
      error: (err) => {
        console.error('Erreur ajout réponse', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message ?? 'Impossible d\'ajouter la réponse.'
        });
      }
    });
  }

  updateAnswer(answer: Answer): void {
    if (!answer.id) return;
    this.questionService.updateAnswer(answer.id, answer).subscribe({
      next: (ans) => {
        Object.assign(answer, ans);
        this.messageService.add({
          severity: 'success',
          summary: 'Réponse mise à jour',
          detail: 'Les modifications ont été enregistrées.'
        });
      },
      error: (err) => {
        console.error('Erreur mise à jour réponse', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message ?? 'Impossible de mettre à jour la réponse.'
        });
      }
    });
  }

  deleteAnswer(question: Question, answer: Answer): void {
    if (!answer.id) return;
    this.confirmationService.confirm({
      message: 'Supprimer cette réponse ?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.questionService.deleteAnswer(answer.id!).subscribe({
          next: () => {
            question.answers = question.answers?.filter((a: any) => a.id !== answer.id);
            this.calculateStats();
            this.messageService.add({
              severity: 'info',
              summary: 'Réponse supprimée',
              detail: 'La réponse a été supprimée.'
            });
          },
          error: (err) => {
            console.error('Erreur suppression réponse', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: err?.error?.message ?? 'Impossible de supprimer la réponse.'
            });
          }
        });
      }
    });
  }

  toggleAnswerCorrect(question: Question, index: number): void {
    const answers = question.answers || [];
    const isCurrently = answers[index].isCorrect;
    const correctCount = answers.filter((a: any) => a.isCorrect).length;

    if (!this.hasMultipleCorrectAnswers(question) && !isCurrently && correctCount === 1) {
      // unique choice: uncheck others
      answers.forEach((a: any, i: number) => a.isCorrect = i === index);
    } else {
      answers[index].isCorrect = !isCurrently;
    }

    if (answers[index].id) {
      this.updateAnswer(answers[index]);
    }
  }

  onAnswerDrop(question: Question, event: CdkDragDrop<Answer[]>): void {
    if (!question.answers) return;
    moveItemInArray(question.answers, event.previousIndex, event.currentIndex);
    question.answers = question.answers.map((ans: any, idx: number) => ({
      ...ans,
      orderIndex: idx
    }));

    if (question.id) {
      const order = question.answers
        .filter((a: any) => a.id != null)
        .map((a: any) => ({ id: a.id!, orderIndex: a.orderIndex }));
      this.questionService.reorderAnswers(question.id, order).subscribe({
        error: (err) => {
          console.error('Erreur réorganisation réponses', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de réorganiser les réponses.'
          });
          this.loadQuestions();
        }
      });
    }
  }

  // Obtenir la lettre pour une réponse (A, B, C, etc.)
  getLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  // Retour à la liste des quiz
  goBack(): void {
    // route name is "quizzes" not "quiz"
    this.router.navigate(['/backoffice/quizzes']);
  }

  // Getter pour afficher le bouton retour
  get showBackButton(): boolean {
    return !!this.quizId;
  }

  // Méthode appelée par le template pour appliquer les filtres
  filterQuestions(): void {
    this.applyFilters();
  }
}