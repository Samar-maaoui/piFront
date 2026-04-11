export interface Quiz {
    id?: number;
    title: string;
    description?: string;
    level?: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    passingScore?: number;
    tutorId?: number;
    questions?: any[];
    duration?: number;
    maxAttempts?: number;
    isAdaptive?: boolean;
    createdBy?: number;
    createdAt?: string;
    updatedAt?: string;
}
