import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Question, Answer } from '../models/question';

const QUESTION_API_URL = 'http://localhost:8080/api/questions';
const ANSWER_API_URL   = 'http://localhost:8080/api/answers';

interface QuestionRequestBody {
  id?:         number;
  quizId:      number;
  text:        string;
  orderIndex:  number;
  points:      number;
  answers?:    AnswerRequestBody[];
}

interface AnswerRequestBody {
  id?:          number;
  questionId?:  number;
  text:         string;
  isCorrect:    boolean;
  orderIndex:   number;
}

@Injectable({ providedIn: 'root' })
export class QuestionService {

  private apiUrl       = QUESTION_API_URL;
  private answerApiUrl = ANSWER_API_URL;

  constructor(private http: HttpClient) {}

  // GET /api/questions
  getAll(): Observable<Question[]> {
    return this.http.get<Question[]>(this.apiUrl);
  }

  // GET /api/questions/{id}
  getById(id: number): Observable<Question> {
    return this.http.get<Question>(`${this.apiUrl}/${id}`);
  }

  // GET /api/questions/quiz/{quizId}
  getByQuizId(quizId: number): Observable<Question[]> {
    return this.http.get<Question[]>(`${this.apiUrl}/quiz/${quizId}`);
  }

  // POST /api/questions
  create(question: Partial<Question>): Observable<Question> {
    return this.http.post<Question>(this.apiUrl, this.toQuestionBody(question));
  }

  // PUT /api/questions/{id}
  update(id: number, question: Partial<Question>): Observable<Question> {
    return this.http.put<Question>(`${this.apiUrl}/${id}`, this.toQuestionBody(question));
  }

  // DELETE /api/questions/{id}
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ✅ FIX — utilise POST /api/questions (pas /with-answers qui n'existe pas)
  // Le controller Spring Boot gère déjà les answers dans createQuestion()
  saveWithAnswers(question: Partial<Question>): Observable<Question> {
        console.log('📤 saveWithAnswers — quizId:', question.quizId); // ← ajoute ça

    return this.http.post<Question>(this.apiUrl, this.toQuestionBody(question));
  }

  // ── Answers ───────────────────────────────────

  // GET /api/answers/question/{questionId}
  getAnswersByQuestionId(questionId: number): Observable<Answer[]> {
    return this.http.get<Answer[]>(`${this.answerApiUrl}/question/${questionId}`);
  }

  // POST /api/answers
  addAnswer(questionId: number, answer: Partial<Answer>): Observable<Answer> {
    return this.http.post<Answer>(this.answerApiUrl, this.toAnswerBody({ ...answer, questionId }));
  }

  // PUT /api/answers/{id}
  updateAnswer(answerId: number, answer: Partial<Answer>): Observable<Answer> {
    return this.http.put<Answer>(`${this.answerApiUrl}/${answerId}`, this.toAnswerBody(answer));
  }

  // DELETE /api/answers/{id}
  deleteAnswer(answerId: number): Observable<void> {
    return this.http.delete<void>(`${this.answerApiUrl}/${answerId}`);
  }

  // ── Privé ─────────────────────────────────────

  private toQuestionBody(question: Partial<Question>): QuestionRequestBody {
    const body: QuestionRequestBody = {
      quizId:     question.quizId     ?? 0,
      text:       question.text       ?? '',
      orderIndex: question.orderIndex ?? 0,
      points:     question.points     ?? 10,
    };

    if (question.id !== undefined) body.id = question.id;

    // ✅ Inclure les answers dans le body — le controller Spring les gère
    if (question.answers && question.answers.length > 0) {
      body.answers = question.answers.map(a => this.toAnswerBody(a));
    }

    return body;
  }

  private toAnswerBody(answer: Partial<Answer>): AnswerRequestBody {
    const body: AnswerRequestBody = {
      text:       answer.text       ?? '',
      isCorrect:  answer.isCorrect  ?? false,
      orderIndex: answer.orderIndex ?? 0,
    };
    if (answer.id         !== undefined) body.id         = answer.id;
    if (answer.questionId !== undefined) body.questionId = answer.questionId;
    return body;
  }
}