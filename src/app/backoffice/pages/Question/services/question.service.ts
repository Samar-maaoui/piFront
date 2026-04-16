import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Question, Answer } from '../../models/question';

/** Base URL du microservice Question (Spring Boot) */
const QUESTION_API_URL = 'http://localhost:8080/api/questions';
const ANSWER_API_URL = 'http://localhost:8080/api/answers'; // AJOUTER CETTE LIGNE

// Interface pour le corps de la requête (type-safe)
interface QuestionRequestBody {
  id?: number;
  quizId: number;
  text: string;
  orderIndex: number;
  points: number;
  answers?: AnswerRequestBody[];
}

interface AnswerRequestBody {
  id?: number;
  questionId?: number;
  text: string;
  isCorrect: boolean;
  orderIndex: number;
}

@Injectable({
  providedIn: 'root'
})
export class QuestionService {

  private apiUrl = QUESTION_API_URL;
  private answerApiUrl = ANSWER_API_URL; // AJOUTER CETTE LIGNE

  constructor(private http: HttpClient) {}

  /**
   * Récupère toutes les questions
   * GET /api/questions
   */
  getAll(): Observable<Question[]> {
    return this.http.get<Question[]>(this.apiUrl);
  }

  /**
   * Récupère une question par son ID
   * GET /api/questions/{id}
   */
  getById(id: number): Observable<Question> {
    return this.http.get<Question>(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupère toutes les questions d'un quiz spécifique
   * GET /api/questions/quiz/{quizId}
   */
  getByQuizId(quizId: number): Observable<Question[]> {
    return this.http.get<Question[]>(`${this.apiUrl}/quiz/${quizId}`);
  }

  /**
   * Crée une nouvelle question
   * POST /api/questions
   */
  create(question: Partial<Question>): Observable<Question> {
    return this.http.post<Question>(this.apiUrl, this.toQuestionBody(question));
  }

  /**
   * Met à jour une question existante
   * PUT /api/questions/{id}
   */
  update(id: number, question: Partial<Question>): Observable<Question> {
    return this.http.put<Question>(`${this.apiUrl}/${id}`, this.toQuestionBody(question));
  }

  /**
   * Supprime une question
   * DELETE /api/questions/{id}
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Supprime plusieurs questions
   * DELETE /api/questions/bulk
   */
  deleteMultiple(ids: number[]): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/bulk`, { 
      body: { ids } 
    });
  }

  /**
   * Réorganise les questions
   * PATCH /api/questions/reorder
   */
  reorderQuestions(questionsOrder: { id: number; orderIndex: number }[]): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/reorder`, questionsOrder);
  }

  /**
   * Duplique une question
   * POST /api/questions/{id}/duplicate
   */
  duplicate(id: number): Observable<Question> {
    return this.http.post<Question>(`${this.apiUrl}/${id}/duplicate`, {});
  }

  /**
   * Compte les questions d'un quiz
   * GET /api/questions/quiz/{quizId}/count
   */
  countByQuizId(quizId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/quiz/${quizId}/count`);
  }

  /**
   * Vérifie si une question existe
   * GET /api/questions/{id}/exists
   */
  exists(id: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/${id}/exists`);
  }

  /**
   * Sauvegarde une question avec ses réponses
   * POST /api/questions/with-answers
   */
  saveWithAnswers(question: Partial<Question>): Observable<Question> {
    return this.http.post<Question>(`${this.apiUrl}/with-answers`, this.toQuestionBody(question));
  }

  /**
   * Importe plusieurs questions
   * POST /api/questions/bulk
   */
  importQuestions(questions: Partial<Question>[]): Observable<Question[]> {
    return this.http.post<Question[]>(`${this.apiUrl}/bulk`, 
      questions.map(q => this.toQuestionBody(q))
    );
  }

  // ========== MÉTHODES CORRIGÉES POUR LES RÉPONSES ==========

  /**
   * Récupère toutes les réponses d'une question
   * GET /api/answers/question/{questionId}
   */
  getAnswersByQuestionId(questionId: number): Observable<Answer[]> {
    return this.http.get<Answer[]>(`${this.answerApiUrl}/question/${questionId}`);
  }

  /**
   * Ajoute une réponse à une question
   * POST /api/answers
   */
  addAnswer(questionId: number, answer: Partial<Answer>): Observable<Answer> {
    const answerWithQuestionId = {
      ...answer,
      questionId: questionId
    };
    return this.http.post<Answer>(this.answerApiUrl, this.toAnswerBody(answerWithQuestionId));
  }

  /**
   * Met à jour une réponse
   * PUT /api/answers/{id}
   */
  updateAnswer(answerId: number, answer: Partial<Answer>): Observable<Answer> {
    return this.http.put<Answer>(`${this.answerApiUrl}/${answerId}`, this.toAnswerBody(answer));
  }

  /**
   * Supprime une réponse
   * DELETE /api/answers/{id}
   */
  deleteAnswer(answerId: number): Observable<void> {
    return this.http.delete<void>(`${this.answerApiUrl}/${answerId}`);
  }

  /**
   * Réorganise les réponses d'une question
   * PATCH /api/questions/{questionId}/answers/reorder
   * (modifiez si votre backend diffère)
   */
  reorderAnswers(questionId: number, answersOrder: { id: number; orderIndex: number }[]): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${questionId}/answers/reorder`, answersOrder);
  }

  // ========== MÉTHODES UTILITAIRES ==========

  /**
   * Convertit une question partielle au format attendu par Spring Boot
   */
  private toQuestionBody(question: Partial<Question>): QuestionRequestBody {
    const body: QuestionRequestBody = {
      quizId: question.quizId ?? 0,
      text: question.text ?? '',
      orderIndex: question.orderIndex ?? 0,
      points: question.points ?? 10
    };

    if (question.id !== undefined) {
      body.id = question.id;
    }

    if (question.answers && question.answers.length > 0) {
      body.answers = question.answers.map(answer => this.toAnswerBody(answer));
    }

    return body;
  }

  /**
   * Convertit une réponse au format attendu par Spring Boot
   */
  private toAnswerBody(answer: Partial<Answer>): AnswerRequestBody {
    const body: AnswerRequestBody = {
      text: answer.text ?? '',
      isCorrect: answer.isCorrect ?? false,
      orderIndex: answer.orderIndex ?? 0
    };

    if (answer.id !== undefined) {
      body.id = answer.id;
    }

    if (answer.questionId !== undefined) {
      body.questionId = answer.questionId;
    }

    return body;
  }

  /**
   * Valide une question avant envoi
   */
  private validateQuestion(question: Partial<Question>): boolean {
    if (!question.quizId) {
      console.error('Question validation failed: quizId is required');
      return false;
    }
    if (!question.text || question.text.trim() === '') {
      console.error('Question validation failed: text is required');
      return false;
    }
    if (question.points && (question.points < 1 || question.points > 100)) {
      console.error('Question validation failed: points must be between 1 and 100');
      return false;
    }
    return true;
  }

  /**
   * Crée une question avec validation
   */
  createWithValidation(question: Partial<Question>): Observable<Question> {
    if (!this.validateQuestion(question)) {
      throw new Error('Question invalide');
    }
    return this.create(question);
  }

  /**
   * Met à jour une question avec validation
   */
  updateWithValidation(id: number, question: Partial<Question>): Observable<Question> {
    if (!this.validateQuestion(question)) {
      throw new Error('Question invalide');
    }
    return this.update(id, question);
  }
}