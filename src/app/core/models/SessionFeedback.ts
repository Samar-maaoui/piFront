export interface SessionFeedback {
  id?: number;
  sessionId?: number;       // si l'API renvoie sessionId directement
  session?: { id?: number }; // si l'API renvoie session comme objet imbriqué
  studentId?: number;
  rating: number;           // 1 à 5
  comment?: string;
  createdAt?: string;
}