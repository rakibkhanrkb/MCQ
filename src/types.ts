import { Timestamp } from 'firebase/firestore';

export interface Question {
  id?: string;
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: 'A' | 'B' | 'C' | 'D';
  marks: number;
  createdAt?: Timestamp;
}

export interface Exam {
  id?: string;
  subject: string;
  topic: string;
  timeLimit: number;
  price: number;
  isPublished: boolean;
  questions: Question[];
  createdAt?: Timestamp;
}

export interface ExamResult {
  id?: string;
  studentId: string;
  studentName: string;
  examId?: string;
  examTitle?: string;
  score: number;
  total: number;
  percentage: string;
  timestamp: Timestamp;
  answers: Record<number, string>;
  questions: Question[];
}

export interface UserAccount {
  id?: string;
  userId: string;
  password?: string;
  name: string;
  phone: string;
  email: string;
  institution: string;
  purchasedExamIds?: string[];
  createdAt?: Timestamp;
}

export interface AdminAccount {
  id?: string;
  username: string;
  password?: string;
  name: string;
  role: 'admin' | 'superadmin';
  createdAt?: Timestamp;
}

export interface PaymentSlip {
  id?: string;
  userId: string;
  studentName: string;
  examId: string;
  examTitle: string;
  amount: number;
  trxId: string;
  status: 'pending' | 'verified';
  timestamp?: Timestamp;
}

export interface ExamRoutine {
  id?: string;
  title: string;
  description?: string;
  routineType: 'text' | 'image' | 'pdf';
  fileUrl?: string; // external or base64
  createdAt?: Timestamp;
}

export type Page = 'home' | 'login' | 'register' | 'admin' | 'setup' | 'exam' | 'history' | 'result' | 'payments' | 'routines' | 'faq';

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}
