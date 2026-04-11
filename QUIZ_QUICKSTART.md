# Tutor Quiz Management - Quick Start Guide

## What's Been Implemented ✅

### 1. **Complete Quiz Management System**
   - ✅ Create quiz with questions and answers (all saved together)
   - ✅ Edit quiz, questions, and answers
   - ✅ Delete quiz with authorization check
   - ✅ View list of tutors own quizzes
   - ✅ Proper validation on all operations
   - ✅ Authorization checks (only creator can edit/delete)

### 2. **Features**
   - **Create Quiz**: Add title, description, level, duration, etc.
   - **Add Questions**: Add multiple questions to a quiz
   - **Add Answers**: Add answer options for each question (min 2 questions)
   - **Mark Correct**: Mark which answer is correct
   - **Edit Everything**: Modify quiz, questions, or answers anytime
   - **Delete Quiz**: Remove quiz with one click confirmation
   - **Success/Error Messages**: Clear feedback on all operations
   - **Authorization**: Only quiz creator can edit/delete their quizzes

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Angular 17+ | Standalone components |
| HTTP | HttpClient | API communication |
| Forms | Reactive Forms | Form management |
| Routing | Angular Router | Navigation |
| State | RxJS (Observables) | Async operations |

## File Structure

```
src/app/
├── frontoffice/jungle/tutor/Quiz/
│   ├── Tutor quiz form.component.ts       ← Form logic
│   ├── Tutor quiz form.component.html     ← Form template
│   ├── Tutor quiz form.component.css      ← Form styles
│   ├── Tutor quiz list.component.ts       ← List logic
│   ├── Tutor quiz list.component.html     ← List template
│   └── Tutor quiz list.component.css      ← List styles
│
├── backoffice/services/
│   ├── quiz.service.ts                    ← Quiz API calls
│   └── question.service.ts                ← Question/Answer API calls
│
└── core/
    ├── models/
    │   ├── quiz.ts                        ← Quiz interface
    │   └── question.ts                    ← Question/Answer interfaces
    └── services/
        └── auth.service.ts                ← User authentication
```

## API Endpoints Used

### Quiz Endpoints
```
POST   /api/quizzes              → Create quiz
GET    /api/quizzes              → Get all quizzes
GET    /api/quizzes/{id}         → Get quiz by ID
PUT    /api/quizzes/{id}         → Update quiz
DELETE /api/quizzes/{id}         → Delete quiz
```

### Question Endpoints
```
GET    /api/questions/quiz/{quizId}    → Get questions for quiz
GET    /api/questions/{id}              → Get question by ID
POST   /api/questions                   → Create question
POST   /api/questions/with-answers      → Create question with answers
PUT    /api/questions/{id}              → Update question
DELETE /api/questions/{id}              → Delete question
```

### Answer Endpoints
```
POST   /api/answers                      → Create answer
PUT    /api/answers/{id}                 → Update answer
DELETE /api/answers/{id}                 → Delete answer
```

## Component Details

### TutorQuizFormComponent
**Purpose**: Create and edit quizzes with questions and answers

**Key Properties**:
- `quiz` - Current quiz being edited
- `isEditMode` - Whether in create or edit mode
- `canEdit` - Whether current user can edit this quiz
- `currentUserId` - ID of logged-in user

**Key Methods**:
- `loadQuiz()` - Load quiz and questions
- `save()` - Validate and save quiz with questions
- `createQuizWithQuestions()` - Create flow
- `updateQuizWithQuestions()` - Update flow
- `addQuestion()` - Add new question to form
- `removeQuestion()` - Remove question from form
- `addAnswer()` - Add answer option
- `removeAnswer()` - Remove answer option

**Validation Rules**:
- ✓ Quiz title required
- ✓ At least 1 question required
- ✓ Question text required
- ✓ At least 2 answers per question
- ✓ At least 1 correct answer per question

### TutorQuizListComponent
**Purpose**: Display and manage tutors quizzes

**Key Properties**:
- `quizzes` - Array of quizzes
- `currentUserId` - ID of logged-in user

**Key Methods**:
- `loadQuizzes()` - Load quizzes (filtered by user)
- `canEditQuiz()` - Check if user can edit quiz
- `editQuiz()` - Navigate to edit page
- `deleteQuiz()` - Delete quiz with confirmation
- `createQuiz()` - Navigate to create page

## User Workflows

### Workflow 1: Create Quiz from Scratch

```
Tutor navigates to /tutor/quiz
        ↓
Clicks "New Quiz" button
        ↓
Form appears with empty fields
        ↓
Fills in quiz details:
  - Title: "English Grammar Quiz"
  - Description: "Test your grammar knowledge"
  - Level: "B1"
  - Duration: 30 minutes
  - Max Attempts: 3
        ↓
Clicks "Add Question" button
        ↓
Adds question 1: "What is the past tense of 'go'?"
        ↓
Adds 4 answer options:
  - "gone" (correct)
  - "goed"
  - "go'd"
  - "went" (also correct)
        ↓
Adds question 2, 3, etc.
        ↓
Validates everything is filled
        ↓
Clicks "Save" button
        ↓
System:
  1. Creates quiz record
  2. Creates question 1 with answers
  3. Creates question 2 with answers
  4. Shows success message
        ↓
Redirects to quiz list showing new quiz
```

### Workflow 2: Edit Existing Quiz

```
Tutor views quiz list
        ↓
Clicks edit button on their quiz
        ↓
System:
  1. Loads quiz details
  2. Loads all questions and answers
  3. Displays form populated with data
        ↓
Tutor modifies:
  - Changes title
  - Adds new question
  - Removes a question
  - Updates answer text
        ↓
Clicks "Save"
        ↓
System updates everything:
  1. Updates quiz
  2. Updates modified questions
  3. Creates new questions
  4. Updates/adds answers
        ↓
Shows success message
        ↓
Redirects to quiz list
```

### Workflow 3: Delete Quiz

```
Tutor views quiz list
        ↓
Clicks delete button (trash icon)
        ↓
System verifies tutor is quiz creator
        ↓
Shows confirmation dialog:
  "Delete quiz 'English Grammar Quiz'?"
        ↓
Tutor confirms
        ↓
System:
  1. Deletes quiz
  2. Cascade deletes all questions
  3. Cascade deletes all answers
        ↓
Shows success message
        ↓
Reloads quiz list
```

## Code Examples

### Create Quiz Request
```typescript
// Quiz creation
POST /api/quizzes
{
  "title": "English Grammar Quiz",
  "description": "Test grammar knowledge",
  "level": "B1",
  "duration": 30,
  "maxAttempts": 3,
  "passingScore": 70,
  "status": "DRAFT"
}

Response: {
  "id": 1,
  "title": "English Grammar Quiz",
  ...
}

// Create question with answers
POST /api/questions/with-answers
{
  "quizId": 1,
  "text": "What is the past tense of 'go'?",
  "orderIndex": 0,
  "points": 10,
  "answers": [
    { "text": "gone", "isCorrect": true, "orderIndex": 0 },
    { "text": "goed", "isCorrect": false, "orderIndex": 1 },
    { "text": "go'd", "isCorrect": false, "orderIndex": 2 }
  ]
}

Response: {
  "id": 1,
  "quizId": 1,
  "text": "What is the past tense of 'go'?",
  ...
}
```

### Edit Question
```typescript
// Update question
PUT /api/questions/1
{
  "quizId": 1,
  "text": "What is the past tense of 'go'? (CORRECTED)",
  "orderIndex": 0,
  "points": 15
}

// Update answer
PUT /api/answers/1
{
  "text": "went",
  "isCorrect": true,
  "orderIndex": 0
}

// Add new answer
POST /api/answers
{
  "questionId": 1,
  "text": "goeth",
  "isCorrect": false,
  "orderIndex": 3
}
```

## Testing the Feature

### Test Case 1: Create Quiz
1. Navigate to `/tutor/quiz`
2. Click "New Quiz"
3. Fill in all fields
4. Add 3 questions with 4 answers each
5. Mark correct answers
6. Click Save
7. **Expected**: Success message, quiz appears in list

### Test Case 2: Edit Quiz
1. Click edit on existing quiz
2. Change title
3. Add new question
4. Modify answer text
5. Click Save
6. **Expected**: Changes saved, success message

### Test Case 3: Delete Quiz
1. Click delete on quiz
2. Confirm deletion
3. **Expected**: Quiz removed from list

### Test Case 4: Authorization
1. Create quiz as Tutor A
2. Login as Tutor B
3. Try to access edit URL directly
4. **Expected**: Error message "No permission"

### Test Case 5: Validation
1. Try to save quiz without title
2. **Expected**: Error "Title is required"

3. Try to save question without text
4. **Expected**: Error "Question text required"

5. Try to save question with only 1 answer
6. **Expected**: Error "At least 2 answers required"

7. Try to save question with no correct answer
8. **Expected**: Error "At least 1 correct answer required"

## Backend Requirements

Your backend needs to support:

1. **Question Creation with Answers**
   - POST `/api/questions/with-answers`
   - Accept question with nested answers array
   - Create all in single transaction
   - Return created question with IDs

2. **Order Management**
   - Maintain `orderIndex` for display order
   - Update order when items deleted

3. **Authorization**
   - Verify `createdBy` or `tutorId` on updates/deletes
   - Return 403 Forbidden if unauthorized

4. **Cascade Deletes**
   - Delete all questions when quiz deleted
   - Delete all answers when question deleted

## Troubleshooting

### Issue: Quiz not saving
- **Check**: Network tab in DevTools
- **Check**: Console for errors
- **Check**: Backend API is running on port 8081
- **Check**: All validation messages passed

### Issue: Questions not loading on edit
- **Check**: Quiz ID in URL is correct
- **Check**: Questions endpoint returns results
- **Check**: Backend has questions for this quiz

### Issue: User can edit other peoples quizzes
- **Check**: `createdBy` field is set on quiz creation
- **Check**: Backend validates authorization

### Issue: "You do not have permission"
- **Check**: You are logged in
- **Check**: You are the quiz creator
- **Check**: User ID matches `createdBy`

## Performance Considerations

1. **Multiple API calls**: When updating quiz with 10 questions and 40 answers, that's ~50 API calls
   - **Solution**: Batch operations or create endpoint that handles full update

2. **Large forms**: Many nested inputs can slow down Angular
   - **Solution**: Implement virtual scrolling for large question lists

3. **Image uploads**: If questions have images
   - **Solution**: Implement separate image upload endpoint

## Security Checklist

- ✅ Authorization checks on edit/delete
- ✅ Input validation on frontend
- ✅ Backend should validate again
- ✅ No sensitive data in localStorage
- ✅ CSRF protection (if needed)
- ✅ Rate limiting (recommend on backend)

## Next Steps

1. **Test the feature** with various scenarios
2. **Verify backend** endpoints work correctly
3. **Add additional validations** as needed
4. **Implement image support** for questions
5. **Add question templates** for faster creation
6. **Implement question banking** for question reuse

## Support

For issues or questions:
1. Check console for errors
2. Review API responses in Network tab
3. Verify backend is running
4. Check authorization in user profile
5. Test with fresh data if needed

---

**Last Updated**: 2026-03-03  
**Version**: 1.0.0
