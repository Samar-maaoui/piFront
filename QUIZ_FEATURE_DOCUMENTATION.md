# Tutor Quiz Management - Feature Documentation

## Overview
Tutors now have complete control over quiz creation, modification, and deletion with the ability to manage questions and answers within the same operation.

---

## Features Implemented

### 1. **Quiz Creation with Questions & Answers**
When a tutor creates a new quiz, they can:
- Add quiz metadata (title, description, level, duration, etc.)
- Add multiple questions to the quiz
- For each question, add multiple answer options
- Mark correct answers
- All data is saved to the database in one operation

**API Flow:**
1. `POST /api/quizzes` - Create quiz
2. `POST /api/questions/with-answers` - Create each question with its answers

### 2. **Quiz Modification**
Tutors can edit existing quizzes they created:
- Modify quiz properties (title, description, level, etc.)
- Edit, add, or remove questions
- Edit, add, or remove answers for each question
- Maintain proper order indices for questions and answers

**API Flow:**
1. `PUT /api/quizzes/{id}` - Update quiz
2. `PUT /api/questions/{id}` - Update existing questions
3. `POST /api/questions` - Create new questions
4. `PUT /api/answers/{id}` - Update existing answers
5. `POST /api/answers` - Add new answers

### 3. **Quiz Deletion**
Tutors can delete quizzes they created with confirmation:
- Only the quiz creator can delete
- Cascade deletion handled by backend
- User receives confirmation dialog before deletion
- Success message displayed after deletion

**API Call:**
- `DELETE /api/quizzes/{id}`

### 4. **Authorization & Permission Checks**
Access control implemented at multiple levels:
- **Quiz List**: Only shows quizzes created by the current tutor
- **Quiz Edit**: Verifies tutor is the quiz creator before allowing edit
- **Quiz Delete**: Verifies tutor is the quiz creator before deletion
- Uses `createdBy` and `tutorId` fields for verification

### 5. **Validation**
Comprehensive validation before saving:
- Quiz title is required
- At least one question is required
- All question text fields must be filled
- Each question must have at least 2 answers
- Each question must have at least 1 correct answer
- Validation errors are displayed to the user

---

## Modified Components

### TutorQuizFormComponent (`Tutor quiz form.component.ts`)
**Changes:**
- Added `QuestionService` injection
- Added `AuthService` injection
- Added authorization checks (canEdit property)
- Implemented `loadQuiz()` with question loading
- Implemented `createQuizWithQuestions()` - handles creation flow
- Implemented `updateQuizWithQuestions()` - handles update flow with partial updates
- Enhanced validation for questions and answers
- Added success message display
- Added proper order index management for questions and answers

**Key Methods:**
- `createQuizWithQuestions()` - Creates quiz then creates all questions with answers
- `updateQuizWithQuestions()` - Updates quiz and questions, handling both new and existing items
- `addQuestion()` - Adds a new question to the form
- `removeQuestion()` - Removes a question with proper index update
- `addAnswer()` - Adds a new answer option to a question
- `removeAnswer()` - Removes an answer with proper index update

### TutorQuizListComponent (`Tutor quiz list.component.ts`)
**Changes:**
- Added `AuthService` injection
- Added `currentUserId` property for authorization checks
- Implemented `canEditQuiz()` method
- Modified `loadQuizzes()` to filter by current user
- Added authorization check in `editQuiz()` method
- Added authorization check in `deleteQuiz()` method
- Added success message after deletion
- Added PLATFORM_ID injection for SSR safety

**Key Methods:**
- `canEditQuiz()` - Checks if current user is quiz creator
- `editQuiz()` - Validates permission before navigating
- `deleteQuiz()` - Validates permission before deletion

---

## Data Flow Diagrams

### Creation Flow
```
┌─────────────────┐
│ Tutor Form      │
│ (Title, Qs, As) │
└────────┬────────┘
         │
         ├──> Validate
         │
         └──> POST /api/quizzes (create quiz)
                    │
                    └──> for each question:
                              POST /api/questions/with-answers
                                   │
                                   └──> Success: Navigate to list
```

### Update Flow
```
┌─────────────────┐
│ Load Quiz       │
│ (with questions)│
└────────┬────────┘
         │
         └──> PUT /api/quizzes/{id}
                    │
         ┌──────────┴──────────┐
         │                     │
    For existing questions  For new questions
    PUT or DELETE           POST /api/questions
         │
         └──> for each answer:
              PUT (update) or POST (create)
                    │
                    └──> Success: Navigate to list
```

### Deletion Flow
```
┌──────────────────┐
│ Tutor clicks     │
│ Delete button    │
└────────┬─────────┘
         │
         ├──> Check canEditQuiz()
         │
         ├──> Confirmation dialog
         │
         └──> DELETE /api/quizzes/{id}
                    │
                    └──> Success: Reload quizzes list
```

---

## API Endpoints Required

### Quiz Service
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/quizzes` | Create new quiz |
| GET | `/api/quizzes` | Get all quizzes |
| GET | `/api/quizzes/{id}` | Get quiz details |
| PUT | `/api/quizzes/{id}` | Update quiz |
| DELETE | `/api/quizzes/{id}` | Delete quiz |

### Question Service
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/questions/quiz/{quizId}` | Get questions by quiz |
| POST | `/api/questions` | Create question |
| POST | `/api/questions/with-answers` | Create question with answers |
| PUT | `/api/questions/{id}` | Update question |
| DELETE | `/api/questions/{id}` | Delete question |

### Answer Service
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/answers` | Create answer |
| PUT | `/api/answers/{id}` | Update answer |
| DELETE | `/api/answers/{id}` | Delete answer |

---

## Database Models

### Quiz
```typescript
interface Quiz {
  id: number;
  title: string;
  description?: string;
  level?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  passingScore?: number;
  tutorId: number;
  createdBy: number;  // Authorization check
  duration?: number;
  maxAttempts?: number;
  createdAt: string;
  updatedAt: string;
}
```

### Question
```typescript
interface Question {
  id: number;
  quizId: number;
  text: string;
  orderIndex: number;
  points: number;
  answers?: Answer[];
}
```

### Answer
```typescript
interface Answer {
  id: number;
  questionId: number;
  text: string;
  isCorrect: boolean;
  orderIndex: number;
}
```

---

## User Experience Flow

### 1. Create Quiz
1. Tutor clicks "New Quiz" button
2. Form appears with empty fields
3. Tutor enters quiz metadata
4. Tutor adds questions one by one
5. For each question, tutor adds answer options (minimum 2)
6. Tutor marks correct answers with checkbox
7. Tutor clicks "Save"
8. System validates all data
9. System creates quiz and all questions/answers in database
10. Success message appears
11. Tutor is redirected to quiz list

### 2. Edit Quiz
1. Tutor views quiz list (filtered to their quizzes only)
2. Tutor clicks edit button on their quiz
3. Form loads with all quiz data and questions/answers
4. Tutor can modify any field, add/remove questions or answers
5. Tutor clicks "Save"
6. System validates changes
7. System updates quiz and handles question/answer changes
8. Success message appears
9. Tutor is redirected to quiz list

### 3. Delete Quiz
1. Tutor views quiz list
2. Tutor clicks delete button on their quiz
3. Confirmation dialog appears
4. Tutor confirms deletion
5. System sends DELETE request
6. Success message appears
7. Quiz list refreshes showing remaining quizzes

---

## Security Features

1. **Authorization**: Only quiz creators can edit/delete their quizzes
2. **Owned Filtering**: Quiz list only shows quizzes owned by the tutor
3. **SSR Safety**: All localStorage access checked with isPlatformBrowser
4. **Validation**: All inputs validated before API calls
5. **Cascade Protection**: Backend handles cascade deletes

---

## Error Handling

All operations include comprehensive error handling:
- Network errors are caught and displayed to user
- Validation errors prevent submission with clear messages
- Permission errors are displayed with appropriate messaging
- Success/error messages auto-clear after 2-3 seconds

---

## Testing Scenarios

### Scenario 1: Create Complete Quiz
1. Create quiz with title "English Grammar Quiz"
2. Add question "What is the past tense of 'go'?"
3. Add 4 answer options, mark one as correct
4. Add second question
5. Save - verify all data is saved in database

### Scenario 2: Modify Quiz
1. Load quiz created in Scenario 1
2. Change title
3. Add a third question
4. Modify first question text
5. Add new answer to first question
6. Save - verify changes are persisted

### Scenario 3: Permission Checks
1. Create quiz as Tutor A
2. Try to access edit as Tutor B - should see error
3. Try to delete as Tutor B - should see error
4. Only Tutor A can edit/delete

### Scenario 4: Validation Checks
1. Try to save quiz without title - error message
2. Try to save quiz without questions - error message
3. Try to save question with less than 2 answers - error message
4. Try to save question with no correct answer - error message

---

## Files Modified

- `src/app/frontoffice/jungle/tutor/Quiz/Tutor quiz form.component.ts` - Enhanced with question/answer management
- `src/app/frontoffice/jungle/tutor/Quiz/Tutor quiz form.component.html` - Updated UI messages
- `src/app/frontoffice/jungle/tutor/Quiz/Tutor quiz list.component.ts` - Added authorization
- `src/app/frontoffice/jungle/tutor/Quiz/Tutor quiz list.component.html` - Updated UI messages
- `src/app/backoffice/services/question.service.ts` - Already contains all required methods (no changes)
- `src/app/core/models/question.ts` - Already contains proper interfaces (no changes)
- `src/app/core/models/quiz.ts` - Already contains proper interfaces (no changes)

---

## Future Enhancements

1. **Bulk Operations**: Import questions from CSV/Excel
2. **Question Banking**: Reuse questions across quizzes
3. **Question Templates**: Pre-defined question types
4. **Media Support**: Add images/videos to questions and answers
5. **Question Analytics**: View which questions students struggle with
6. **A/B Testing**: Test different question variations
7. **Auto-Grading**: Support for essay and fill-in-the-blank questions

---

## Notes for Backend Developer

1. **POST /api/questions/with-answers** endpoint should:
   - Accept question with nested answers array
   - Create question and all answers in a single transaction
   - Return created question with IDs populated

2. **Answer Order Index**: 
   - Maintain orderIndex for display order
   - Update all orders when an answer is deleted

3. **Question Order Index**:
   - Maintain orderIndex for question sequence
   - Update all orders when a question is deleted

4. **Authorization**:
   - Backend should verify `createdBy` or `tutorId` matches current user on updates/deletes
   - Return 403 Forbidden if unauthorized

5. **Cascade Deletes**:
   - When quiz is deleted, delete all questions
   - When question is deleted, delete all its answers

---

## Version History

- **v1.0** (2026-03-03): Initial implementation with full CRUD for quizzes with questions and answers
