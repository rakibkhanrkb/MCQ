# Security Specification for MCQ Exam System

## Data Invariants
1. A question must have 4 non-empty options and a valid correct answer (A, B, C, D).
2. Marks for a question must be a positive number.
3. Exam results must include a student name, score, and total.
4. Only administrators can add, edit, or delete questions.

## The Dirty Dozen Payloads

### Question Collection (Admin Only)
1. **Unauthorized Write**: Attempting to add a question as a non-admin.
2. **Missing Fields**: Adding a question without `text` or `answer`.
3. **Invalid Answer**: Setting `answer` to 'E'.
4. **Invalid Marks**: Setting `marks` to -1.
5. **ID Poisoning**: Injecting a 1MB string as a document ID.
6. **Shadow Update**: Adding a field `internal_metadata` to a question during update.

### Exam Results Collection (Public Create)
7. **Score Mismatch**: Setting a score higher than total (requires server-side verification usually, but we'll enforce type safety).
8. **Malicious ID**: Using a custom ID for results to overwrite existing results.
9. **Spam Creation**: Creating 10,000 results in a loop (Rate limiting not possible in rules alone, but we validate strictly).
10. **Shadow Result**: Adding `isValidated: true` to a result document.
11. **Negative Score**: Setting `score` to -50.
12. **Null Values**: Sending `studentName: null`.

## The Test Runner (Mock Logic)
We will verify that these payloads return `PERMISSION_DENIED` using our rules.
