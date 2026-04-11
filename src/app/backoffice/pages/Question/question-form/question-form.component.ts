import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Question, Answer } from '../../models/question';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule
  ],
  templateUrl: './question-form.component.html',
  styleUrls: ['./question-form.component.scss']
})
export class QuestionFormComponent implements OnChanges, OnInit, OnDestroy {
  @Input() question: Question | null = null;
  @Input() visible = false;
  @Input() quizId: number | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<Partial<Question>>();
  @Output() cancelled = new EventEmitter<void>();

  // message d'erreur général
  errorMessage: string = '';

  // Données du formulaire
  formData: {
    id?: number;
    quizId: number;
    text: string;
    orderIndex: number;
    points: number;
    answers: Answer[];
  } = {
    quizId: 0,
    text: '',
    orderIndex: 0,
    points: 10,
    answers: []
  };

  saving = false;
  maxPosition = 20; // Nombre maximum de positions disponibles
  private keyboardListener: (e: KeyboardEvent) => void;

  // Getters pour le template (évite les erreurs "undefined")
  get answersLength(): number {
    return this.formData.answers?.length || 0;
  }

  get hasAnswers(): boolean {
    return this.answersLength > 0;
  }

  get points(): number {
    return this.formData.points || 10;
  }

  get canAddAnswer(): boolean {
    return this.answersLength < 10;
  }

  get canRemoveAnswer(): boolean {
    return this.answersLength > 2;
  }

  get answersProgress(): number {
    return (this.answersLength / 10) * 100;
  }

  constructor() {
    this.keyboardListener = this.handleKeyboard.bind(this);
  }

  ngOnInit(): void {
    document.addEventListener('keydown', this.keyboardListener);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.keyboardListener);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Mise à jour du quizId si fourni
    if (changes['quizId'] && this.quizId) {
      this.formData.quizId = this.quizId;
    }

    // Chargement de la question en mode édition
    if (changes['question'] && this.question) {
      this.loadQuestion(this.question);
    } 
    // Réinitialisation en mode création quand le formulaire devient visible
    else if (changes['visible'] && this.visible && !this.question) {
      this.resetForm();
    }
  }

  private loadQuestion(question: Question): void {
    this.formData = {
      id: question.id,
      quizId: question.quizId,
      text: question.text || '',
      orderIndex: question.orderIndex || 0,
      points: question.points || 10,
      answers: question.answers ? 
        [...question.answers]
          .map(a => ({ 
            id: a.id,
            questionId: a.questionId,
            text: a.text || '', 
            isCorrect: a.isCorrect || false, 
            orderIndex: a.orderIndex 
          }))
          .sort((a, b) => a.orderIndex - b.orderIndex) 
        : this.getDefaultAnswers()
    };
  }

  private resetForm(): void {
    this.formData = {
      quizId: this.quizId || 0,
      text: '',
      orderIndex: 0,
      points: 10,
      answers: this.getDefaultAnswers()
    };
  }

  private getDefaultAnswers(): Answer[] {
    return [
      { text: '', isCorrect: false, orderIndex: 0 },
      { text: '', isCorrect: false, orderIndex: 1 }
    ];
  }

  private handleKeyboard(e: KeyboardEvent): void {
    if (!this.visible) return;

    // Sauvegarde : Cmd+Enter ou Ctrl+Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (this.isFormValid()) {
        this.onSave();
      }
    }

    // Fermeture : Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      this.onClose();
    }
  }

  onSave(): void {
    // validation avec message
    const validationError = this.getValidationError();
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    this.saving = true;

    // Préparer les données avec ordre mis à jour
    const questionToSave: Partial<Question> = {
      id: this.formData.id,
      quizId: this.formData.quizId,
      text: this.formData.text.trim(),
      orderIndex: this.formData.orderIndex,
      points: this.formData.points,
      answers: this.formData.answers.map((answer, index) => ({
        id: answer.id,
        questionId: this.formData.id,
        text: answer.text.trim(),
        isCorrect: answer.isCorrect,
        orderIndex: index
      }))
    };

    // Simuler un délai d'enregistrement
    setTimeout(() => {
      this.saved.emit(questionToSave);
      this.saving = false;
      this.onClose();
    }, 500);
  }

  onClose(): void {
    this.visibleChange.emit(false);
    this.cancelled.emit();
    this.errorMessage = '';
  }

  // Gestion des réponses
  addAnswer(): void {
    if (this.canAddAnswer) {
      const newAnswer: Answer = {
        text: '',
        isCorrect: false,
        orderIndex: this.answersLength
      };
      this.formData.answers = [...this.formData.answers, newAnswer];
    }
  }

  removeAnswer(index: number): void {
    if (this.canRemoveAnswer) {
      const answers = [...this.formData.answers];
      answers.splice(index, 1);
      
      // Réordonner
      this.formData.answers = answers.map((ans, idx) => ({
        ...ans,
        orderIndex: idx
      }));
    }
  }

  duplicateAnswer(index: number): void {
    if (this.canAddAnswer) {
      const original = this.formData.answers[index];
      const duplicate: Answer = {
        ...original,
        id: undefined,
        text: original.text + ' (copie)',
        orderIndex: this.answersLength
      };
      this.formData.answers = [...this.formData.answers, duplicate];
    }
  }

  toggleCorrect(index: number): void {
    const correctCount = this.getCorrectAnswersCount();
    const isCurrentlyCorrect = this.formData.answers[index].isCorrect;

    // Si c'est une réponse à choix unique et qu'on veut changer
    if (!this.hasMultipleCorrectAnswers() && !isCurrentlyCorrect && correctCount === 1) {
      // Désactiver l'ancienne réponse correcte
      this.formData.answers = this.formData.answers.map((answer, i) => ({
        ...answer,
        isCorrect: i === index
      }));
    } else {
      // Basculer normalement
      this.formData.answers[index].isCorrect = !isCurrentlyCorrect;
    }
  }

  // Drag & Drop
  onAnswerDrop(event: CdkDragDrop<Answer[]>): void {
    moveItemInArray(this.formData.answers, event.previousIndex, event.currentIndex);
    
    // Mettre à jour les orderIndex
    this.formData.answers = this.formData.answers.map((answer, index) => ({
      ...answer,
      orderIndex: index
    }));
  }

  // Ajustement des points
  adjustPoints(delta: number): void {
    const newPoints = this.points + delta;
    if (newPoints >= 1 && newPoints <= 100) {
      this.formData.points = newPoints;
    }
  }

  // Validations
  isFormValid(): boolean {
    return this.getValidationError() === null;
  }

  /**
   * Retourne un message d'erreur approprié ou null si tout va bien.
   */
  private getValidationError(): string | null {
    if (!this.formData.quizId) {
      return 'Identifiant du quiz manquant.';
    }
    if (!this.formData.text || this.formData.text.trim() === '') {
      return 'Le texte de la question est requis.';
    }
    if (this.answersLength < 2) {
      return 'Au moins deux réponses sont nécessaires.';
    }
    if (!this.hasAtLeastOneCorrectAnswer()) {
      return 'Sélectionnez au moins une réponse correcte.';
    }
    if (this.formData.answers.some(a => !a.text || a.text.trim() === '')) {
      return 'Toutes les réponses doivent contenir un texte.';
    }
    if (this.points < 1 || this.points > 100) {
      return 'Les points doivent être compris entre 1 et 100.';
    }
    return null;
  }

  hasAtLeastOneCorrectAnswer(): boolean {
    return this.formData.answers?.some(a => a.isCorrect) || false;
  }

  hasMultipleCorrectAnswers(): boolean {
    return this.getCorrectAnswersCount() > 1;
  }

  getCorrectAnswersCount(): number {
    return this.formData.answers?.filter(a => a.isCorrect).length || 0;
  }

  // TrackBy pour optimiser le rendering
  trackByIndex(index: number): number {
    return index;
  }

  trackByAnswerId(index: number, answer: Answer): number | undefined {
    return answer.id || index;
  }
}