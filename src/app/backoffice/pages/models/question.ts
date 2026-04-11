export interface Question {
    id?: number;
    quizId: number;
    text: string;
    orderIndex: number;
    points: number;
    answers?: Answer[];
    showAnswerForm?: boolean;
    newAnswerText?: string;
    newAnswerCorrect?: boolean;
}

export interface Answer {
    id?: number;
    questionId?: number;
    text: string;
    isCorrect: boolean;
    orderIndex: number;
}
