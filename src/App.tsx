import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, limit, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { Question, Exam, ExamResult, Page, UserAccount, PaymentSlip, ExamRoutine } from './types';
import Navbar from './components/Navbar';
import AdminPanel from './components/AdminPanel';
import ExamEngine from './components/ExamEngine';
import HistoryDashboard from './components/HistoryDashboard';
import StudentRoutines from './components/StudentRoutines';
import FAQSection from './components/FAQSection';
import HomePage from './components/HomePage';
import { downloadResultPDF } from './utils/pdfGenerator';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, History as HistoryIcon, PlayCircle, Loader2, AlertCircle, ShieldCheck, CheckCircle, User, Key, LogIn, Phone, Mail, School, CreditCard, ChevronRight, X, Printer, Sparkles, BookOpen, Clock, Tag, Edit2, Download, HelpCircle, Copy, ExternalLink, Globe } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    if (typeof window !== 'undefined') {
      const savedPage = localStorage.getItem('currentPage');
      if (savedPage) return savedPage as Page;
    }
    return 'home';
  });
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [history, setHistory] = useState<ExamResult[]>([]);
  const [isAdminAuth, setIsAdminAuth] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isAdminAuth') === 'true';
    }
    return false;
  });
  const [activeAdminUsername, setActiveAdminUsername] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeAdminUsername') || '';
    }
    return '';
  });
  const [routines, setRoutines] = useState<ExamRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentAuth, setStudentAuthRaw] = useState<UserAccount | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('studentAuth');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Error parsing studentAuth from localStorage", e);
        }
      }
    }
    return null;
  });

  // Safe wrapper to prevent circular references and complex structures from storing in state
  const setStudentAuth = (user: UserAccount | null) => {
    if (!user) {
      setStudentAuthRaw(null);
      return;
    }
    const sanitized: any = {};
    if (user.id) sanitized.id = String(user.id);
    if (user.userId) sanitized.userId = String(user.userId);
    if (user.name) sanitized.name = String(user.name);
    if (user.phone) sanitized.phone = String(user.phone);
    if (user.email) sanitized.email = String(user.email);
    if (user.institution) sanitized.institution = String(user.institution);
    if (user.password !== undefined) sanitized.password = String(user.password);
    if (user.isPaidUser !== undefined) sanitized.isPaidUser = Boolean(user.isPaidUser);
    
    if (Array.isArray(user.purchasedExamIds)) {
      sanitized.purchasedExamIds = user.purchasedExamIds.map((id: any) => String(id));
    } else {
      sanitized.purchasedExamIds = [];
    }

    if (user.createdAt) {
      if (typeof user.createdAt.toDate === 'function') {
        try {
          const d = user.createdAt.toDate();
          sanitized.createdAt = { seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 };
        } catch (e) {
          sanitized.createdAt = null;
        }
      } else if (typeof user.createdAt === 'object' && user.createdAt !== null) {
        const sec = (user.createdAt as any).seconds !== undefined ? Number((user.createdAt as any).seconds) : Math.floor(Date.now() / 1000);
        const nano = (user.createdAt as any).nanoseconds !== undefined ? Number((user.createdAt as any).nanoseconds) : 0;
        sanitized.createdAt = { seconds: sec, nanoseconds: nano };
      } else {
        sanitized.createdAt = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
      }
    } else {
      sanitized.createdAt = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
    }
    
    setStudentAuthRaw(sanitized as UserAccount);
  };

  // Sync state changes with localStorage safely without circular references
  useEffect(() => {
    if (studentAuth) {
      try {
        const safeString = JSON.stringify(studentAuth);
        localStorage.setItem('studentAuth', safeString);
      } catch (err) {
        console.error("Failed to stringify studentAuth safely:", err);
        try {
          const fallbackCopy = { ...studentAuth };
          delete (fallbackCopy as any).createdAt;
          localStorage.setItem('studentAuth', JSON.stringify(fallbackCopy));
        } catch (fallbackErr) {
          console.error("Fallback stringification also failed:", fallbackErr);
        }
      }
    } else {
      localStorage.removeItem('studentAuth');
    }
  }, [studentAuth]);

  useEffect(() => {
    localStorage.setItem('isAdminAuth', String(isAdminAuth));
    localStorage.setItem('activeAdminUsername', activeAdminUsername);
  }, [isAdminAuth, activeAdminUsername]);

  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  // Dark Mode states & persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // User Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    email: '',
    institution: '',
    password: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Registration Mode toggle
  const [isRegistering, setIsRegistering] = useState(false);
  const [authDomainError, setAuthDomainError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Student Register Form Fields
  const [regForm, setRegForm] = useState({
    name: '',
    phone: '',
    email: '',
    institution: '',
    userId: '',
    password: ''
  });

  // Active Exam setup
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeExamQuestions, setActiveExamQuestions] = useState<Question[]>([]);
  const [lastResult, setLastResult] = useState<ExamResult | null>(null);

  // Checkout and BKash verification states
  const [activeCheckoutExam, setActiveCheckoutExam] = useState<Exam | null>(null);
  const [bkashTrxId, setBkashTrxId] = useState('');
  const [paymentLoader, setPaymentLoader] = useState(false);
  const [paymentSuccessSlip, setPaymentSuccessSlip] = useState<PaymentSlip | null>(null);
  const [studentPayments, setStudentPayments] = useState<PaymentSlip[]>([]);

  // Global Branding Settings State
  const [logoSettings, setLogoSettings] = useState({
    logoType: 'text' as 'text' | 'image' | 'both',
    logoText: 'ICT MCQ TEST',
    logoUrl: '',
    heroImageUrl: '',
    paidExamNotice: '৫০ টাকায় সারামাস পেইড এক্সাম (২০ টি)',
  });

  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isAdminUnlocked') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('isAdminUnlocked', String(isAdminUnlocked));
  }, [isAdminUnlocked]);

  const [headerClicks, setHeaderClicks] = useState(0);
  const [footerClicks, setFooterClicks] = useState(0);

  useEffect(() => {
    const checkAdminUrl = () => {
      const path = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;
      if (path.endsWith('/admin-l') || search.includes('admin-l') || hash.includes('admin-l') || hash === '#admin-l') {
        setIsAdminUnlocked(true);
        setCurrentPage('admin');
      }
    };

    checkAdminUrl();

    window.addEventListener('popstate', checkAdminUrl);
    window.addEventListener('hashchange', checkAdminUrl);

    const interval = setInterval(checkAdminUrl, 1000);

    return () => {
      window.removeEventListener('popstate', checkAdminUrl);
      window.removeEventListener('hashchange', checkAdminUrl);
      clearInterval(interval);
    };
  }, []);

  const handleHeaderBrandClick = () => {
    setHeaderClicks(prev => {
      const current = prev + 1;
      if (current >= 5) {
        setIsAdminUnlocked(true);
        setCurrentPage('admin');
        return 0;
      }
      return current;
    });
  };

  const handleFooterBrandClick = () => {
    setFooterClicks(prev => {
      const current = prev + 1;
      if (current >= 5) {
        setIsAdminUnlocked(true);
        setCurrentPage('admin');
        return 0;
      }
      return current;
    });
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        signInAnonymously(auth).catch(err => {
          console.warn("Anonymous auth restricted, continuing as guest:", err.message);
        });
      }
      setLoading(false);
    });

    // Global listener for settings / branding
    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLogoSettings({
          logoType: data.logoType || 'text',
          logoText: data.logoText || 'ICT MCQ',
          logoUrl: data.logoUrl || '',
          heroImageUrl: data.heroImageUrl || '',
          paidExamNotice: data.paidExamNotice || '৫০ টাকায় সারামাস পেইড এক্সাম (২০ টি)',
        });
      }
    }, (err) => {
      console.warn("Settings snapshot listener error:", err.message);
    });

    // Global listener for Questions
    const unsubQ = onSnapshot(collection(db, 'questions'), (snap) => {
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
    }, (err) => {
      console.warn("Questions snapshot listener error:", err.message);
    });

    // Global listener for MCQ Exams
    const unsubExams = onSnapshot(collection(db, 'exams'), (snap) => {
      setExams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Exam)));
    }, (err) => {
      console.warn("Exams snapshot listener error:", err.message);
    });

    // Global listener for Exam Routines
    const routinesQuery = query(collection(db, 'exam_routines'));
    const unsubRoutines = onSnapshot(routinesQuery, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamRoutine));
      const sortedData = data.sort((a, b) => {
        const timeA = (a.createdAt as any)?.seconds || 0;
        const timeB = (b.createdAt as any)?.seconds || 0;
        return timeB - timeA;
      });
      setRoutines(sortedData);
    }, (err) => {
      console.warn("Routines snapshot listener error:", err.message);
    });

    return () => {
      unsubAuth();
      unsubSettings();
      unsubQ();
      unsubExams();
      unsubRoutines();
    };
  }, []);

  // Sync Student's collection state in real-time
  useEffect(() => {
    if (!studentAuth?.id) return;
    const unsubUser = onSnapshot(doc(db, 'users', studentAuth.id), (docSnap) => {
      if (docSnap.exists()) {
        setStudentAuth({ id: docSnap.id, ...docSnap.data() } as UserAccount);
      }
    });
    return () => unsubUser();
  }, [studentAuth?.id]);

  // Prefill profile edit fields
  useEffect(() => {
    if (studentAuth && isEditingProfile) {
      setProfileForm({
        name: studentAuth.name || '',
        phone: studentAuth.phone || '',
        email: studentAuth.email || '',
        institution: studentAuth.institution || '',
        password: studentAuth.password || '',
      });
    }
  }, [studentAuth, isEditingProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentAuth?.id) return;
    if (!profileForm.name.trim() || !profileForm.password.trim()) {
      alert("Please provide at least a name and a login password.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', studentAuth.id), {
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
        email: profileForm.email.trim(),
        institution: profileForm.institution.trim(),
        password: profileForm.password.trim(),
      });
      alert("Your student profile has been refreshed and updated successfully!");
      setIsEditingProfile(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update student profile. Check internet connectivity settings.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Sync Student's payments in real-time to monitor pending or verified statuses
  useEffect(() => {
    if (!studentAuth) {
      setStudentPayments([]);
      return;
    }
    const qPayments = query(
      collection(db, 'payments'),
      where('userId', '==', studentAuth.userId)
    );
    const unsubPay = onSnapshot(qPayments, (snap) => {
      setStudentPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentSlip)));
    });
    return () => unsubPay();
  }, [studentAuth?.userId]);

  // Dedicated Student History Listener
  useEffect(() => {
    if (!studentAuth) {
      setHistory([]);
      return;
    }

    const qHistory = query(
      collection(db, 'exam_results'), 
      where('studentId', '==', studentAuth.userId),
      limit(100)
    );

    const unsubH = onSnapshot(qHistory, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamResult));
      // Manual client-side sort to avoid requiring a composite index
      const sortedData = data.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });
      setHistory(sortedData);
    });

    return () => unsubH();
  }, [studentAuth]);

  // Handle Exam Launch 
  const handleLaunchExam = async (exam: Exam) => {
    if (!studentAuth) {
      setCurrentPage('login');
      return;
    }
    const isPurchased = exam.price === 0 || studentAuth.isPaidUser === true || studentAuth.purchasedExamIds?.includes(exam.id || '');
    if (!isPurchased) {
      setActiveCheckoutExam(exam);
      return;
    }

    setLoading(true);
    try {
      // Lazy fetch questions from the subcollection in case some questions are only available in mcq_pool
      const poolQuery = query(collection(db, 'exams', exam.id || '', 'mcq_pool'));
      const poolSnap = await getDocs(poolQuery);
      const poolQuestions = poolSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
      
      const mergedQuestions = [...(exam.questions || [])];
      poolQuestions.forEach(pq => {
        if (!mergedQuestions.some(mq => mq.text === pq.text)) {
          mergedQuestions.push(pq);
        }
      });

      // Shuffle the exam's custom questions
      const shuffled = mergedQuestions.sort(() => Math.random() - 0.5);
      setActiveExam(exam);
      setActiveExamQuestions(shuffled);
      setCurrentPage('exam');
    } catch (err) {
      console.warn("Could not lazily pull subcollection MCQs, falling back to static questions:", err);
      setActiveExam(exam);
      const shuffled = [...(exam.questions || [])].sort(() => Math.random() - 0.5);
      setActiveExamQuestions(shuffled);
      setCurrentPage('exam');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      if (!googleUser.email) {
        alert("Google account has no valid email address.");
        return;
      }

      // Check if email already registered in users
      const q = query(collection(db, 'users'), where('email', '==', googleUser.email));
      const snap = await getDocs(q);

      if (!snap.empty) {
        // Log in existing student
        const userData = { id: snap.docs[0].id, ...snap.docs[0].data() } as UserAccount;
        setStudentAuth(userData);
        setCurrentPage('setup');
        alert(`Authentication successful! Welcome back, ${userData.name}.`);
      } else {
        // Switch to registration mode and prefill
        const displayUserId = googleUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 900);
        setRegForm({
          name: googleUser.displayName || '',
          email: googleUser.email,
          phone: '',
          institution: '',
          userId: displayUserId,
          password: 'google-oauth-' + Math.random().toString(36).substring(2, 8)
        });
        setIsRegistering(true);
        alert("গুগল দিয়ে অথেনটিকেশন সফল হয়েছে! অনুগ্রহ করে নিচের ফর্মে আপনার ফোন নম্বর এবং শিক্ষা প্রতিষ্ঠান পূরণ করে রেজিস্ট্রেশন শেষ করুন।");
      }
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setAuthDomainError(window.location.hostname);
      } else if (err.code !== 'auth/popup-closed-by-user') {
        alert("Google Sign-In failed: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Student Sign-In Handler
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const loginId = (document.getElementById('stu-id') as HTMLInputElement).value;
    const loginPass = (document.getElementById('stu-pass') as HTMLInputElement).value;

    if (!loginId || !loginPass) return;

    try {
      setLoading(true);
      const q = query(collection(db, 'users'), where('userId', '==', loginId), where('password', '==', loginPass));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const userData = { id: snap.docs[0].id, ...snap.docs[0].data() } as UserAccount;
        setStudentAuth(userData);
        setCurrentPage('setup');
      } else {
        setLoginError('আপনার আইডি/পাসওয়ার্ড ভুল হয়েছে। অনুগ্রহ করে সঠিক তথ্য দিয়ে চেষ্টা করুন।');
      }
    } catch (err) {
      console.error(err);
      setLoginError('লগইন করার সময় একটি সমস্যা হয়েছে। দয়া করে ইন্টারনেট কানেকশন চেক করুন।');
    } finally {
      setLoading(false);
    }
  };

  // Student registration submission logic
  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    if (!regForm.name || !regForm.phone || !regForm.email || !regForm.institution || !regForm.userId || !regForm.password) {
      setRegisterError("রেজিস্ট্রেশন সম্পূর্ণ করতে সবগুলো ফিল্ড পূরণ করা আবশ্যক!");
      return;
    }

    try {
      setLoading(true);

      // Verify duplicate phone number
      const phoneQuery = query(collection(db, 'users'), where('phone', '==', regForm.phone));
      const phoneSnap = await getDocs(phoneQuery);
      if (!phoneSnap.empty) {
        setRegisterError("দুঃখিত, এই ফোন নম্বরটি ইতিমধ্যেই ডাটাবেজে রয়েছে। অনুগ্রহ করে অন্য ফোন নম্বর ব্যবহার করুন!");
        setLoading(false);
        return;
      }

      // Verify duplicate userId
      const dupQuery = query(collection(db, 'users'), where('userId', '==', regForm.userId));
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        setRegisterError("দুঃখিত, এই ইউজার আইডিটি ইতিমধ্যেই ডাটাবেজে রয়েছে। অনুগ্রহ করে অন্য ইউজার আইডি ব্যবহার করুন!");
        setLoading(false);
        return;
      }

      // Verify duplicate email
      const emailQuery = query(collection(db, 'users'), where('email', '==', regForm.email));
      const emailSnap = await getDocs(emailQuery);
      if (!emailSnap.empty) {
        setRegisterError("দুঃখিত, এই ইমেইল এড্রেসটি ইতিমধ্যেই রেজিস্টার্ড। দয়া করে অন্য ইমেইল ব্যবহার করুন!");
        setLoading(false);
        return;
      }

      // Add to Firestore database
      const newUserDoc = {
        name: regForm.name,
        phone: regForm.phone,
        email: regForm.email,
        institution: regForm.institution,
        userId: regForm.userId,
        password: regForm.password,
        purchasedExamIds: [],
        createdAt: serverTimestamp()
      };

      const ref = await addDoc(collection(db, 'users'), newUserDoc);
      // Auto Login
      setStudentAuth({ id: ref.id, ...newUserDoc } as UserAccount);
      alert("Student Registration Successful! Session Authorized.");
      
      // Reset state and redirect
      setRegForm({ name: '', phone: '', email: '', institution: '', userId: '', password: '' });
      setIsRegistering(false);
      setCurrentPage('setup');
    } catch (err) {
      console.error(err);
      setRegisterError("রেজিস্ট্রেশন সার্ভারে যুক্ত হতে বিঘ্ন ঘটেছে। দয়া করে পুনরায় চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  // Automatic verification simulator for BKash Payments
  const handleVerifyBkashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bkashTrxId.trim()) {
      alert("Please enter a valid bKash Transaction ID (TRXID)!");
      return;
    }
    if (!activeCheckoutExam || !studentAuth) return;

    setPaymentLoader(true);
    try {
      // Create payment slip transaction with 'pending' status
      const newPayment: PaymentSlip = {
        userId: studentAuth.userId,
        studentName: studentAuth.name,
        examId: activeCheckoutExam.id || '',
        examTitle: activeCheckoutExam.subject,
        amount: activeCheckoutExam.price,
        trxId: bkashTrxId.toUpperCase(),
        status: 'pending',
        timestamp: serverTimestamp() as any
      };

      const paymentRef = await addDoc(collection(db, 'payments'), {
        ...newPayment,
        timestamp: serverTimestamp()
      });

      setPaymentSuccessSlip({ id: paymentRef.id, ...newPayment });
      alert("পেমেন্ট রিকোয়েস্ট সফলভাবে সাবমিট করা হয়েছে! অ্যাডমিন আপনার bKash TRXID যাচাই করে অ্যাপ্রুভ করলে পরীক্ষাটি আনলক হবে।");
    } catch (err) {
      console.error(err);
      alert("Payment confirmation failed. Check connectivity parameters.");
    } finally {
      setPaymentLoader(false);
    }
  };

  const handleLogout = () => {
    setStudentAuth(null);
    setCurrentPage('login');
  };

  const handleFinishExam = (result: ExamResult) => {
    setLastResult({
      ...result,
      examId: activeExam?.id || 'manual',
      examTitle: activeExam ? activeExam.subject : 'Global MCQ Assessment'
    });
    setCurrentPage('result');
    setActiveExam(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-accent" size={48} />
        <p className="text-text-dim font-bold animate-pulse">BOOTSTRAPPING ICT MCQ INFRASTRUCTURE...</p>
      </div>
    );
  }

  // Filter exams that are published for the student view
  const publishedExams = exams.filter(e => e.isPublished);
  const isGoogleAuthLinked = regForm.password ? regForm.password.startsWith('google-oauth-') : false;

  return (
    <div className="min-h-screen bg-bg font-sans selection:bg-accent/30 flex flex-col justify-between">
      <div>
        <Navbar 
          currentPage={currentPage} 
          onNavigate={setCurrentPage} 
          logoSettings={logoSettings} 
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
          isAdminUnlocked={isAdminUnlocked}
          onBrandClick={handleHeaderBrandClick}
        />

        <main className="container max-w-7xl mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            {/* HOMEPAGE VIEW LIKE www.mcqexamtest.com */}
            {currentPage === 'home' && (
              <motion.div 
                key="home-view" 
                initial={{ opacity: 0, y: 12 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -12 }}
              >
                <HomePage 
                  exams={exams} 
                  onNavigate={setCurrentPage} 
                  isAuthenticated={studentAuth !== null}
                  logoSettings={logoSettings}
                />
              </motion.div>
            )}

            {/* STUDENT SIGN IN / REGISTER FLOW */}
            {currentPage === 'login' && (
              <motion.div 
                key="login-view" 
                initial={{ opacity: 0, y: 12 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -12 }}
                className="max-w-md mx-auto py-8 px-4"
              >
                <div className="text-center mb-8 space-y-3">
                  <div className="w-16 h-16 bg-accent/8 rounded-2xl flex items-center justify-center mx-auto border border-accent/15 shadow-sm">
                    <User className="text-accent" size={28} />
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-text-main text-sans">{logoSettings.logoText} Student Portal</h1>
                  <p className="text-text-dim text-[11px] font-bold uppercase tracking-widest">
                    {isRegistering ? 'Create student profile' : 'Sign in to access exams'}
                  </p>
                </div>

                <div className="bg-surface border border-border/80 p-8 rounded-3xl shadow-sm space-y-6 relative overflow-hidden">
                  {/* Mode switcher tabs */}
                  <div className="grid grid-cols-2 p-1 bg-surface-hover border border-border/60 rounded-xl">
                    <button
                      onClick={() => setIsRegistering(false)}
                      className={`py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${!isRegistering ? 'bg-surface text-accent font-extrabold shadow-sm border border-border/20' : 'text-text-dim hover:text-text-main'}`}
                    >
                      Login Profile
                    </button>
                    <button
                      onClick={() => setIsRegistering(true)}
                      className={`py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${isRegistering ? 'bg-surface text-accent font-extrabold shadow-sm border border-border/20' : 'text-text-dim hover:text-text-main'}`}
                    >
                      Registration Portal
                    </button>
                  </div>

                  {/* Google OAuth Login Button */}
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="w-full bg-surface hover:bg-surface-hover border border-border/80 text-text-main font-bold py-3 px-4 rounded-xl transition-all shadow-sm active:scale-[0.98] text-xs flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.66-.35-1.36-.35-2.09z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Google Account দিয়ে লগইন করুন</span>
                    </button>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-border/50"></div>
                      <span className="flex-shrink mx-4 text-[10px] text-text-dim uppercase tracking-wider font-bold">অথবা আইডি/পাসওয়ার্ড দিন</span>
                      <div className="flex-grow border-t border-border/50"></div>
                    </div>
                  </div>

                  {!isRegistering ? (
                    /* SIGN IN FORM */
                    <form onSubmit={handleStudentLogin} className="space-y-4">
                      {loginError && (
                        <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-xs font-bold rounded-2xl flex items-start gap-2.5 shadow-sm animate-pulse">
                          <AlertCircle size={16} className="shrink-0 mt-0.5 text-danger" />
                          <span className="leading-relaxed text-danger font-bold">{loginError}</span>
                        </div>
                      )}

                      <div className="space-y-1.55">
                        <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Student User ID (ইউজার আইডি)</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim/80" size={16} />
                          <input 
                            id="stu-id"
                            type="text" 
                            placeholder="Enter login ID" 
                            className="w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 pl-10 h-11 outline-none focus:border-accent text-sm font-semibold transition-all focus:ring-2 focus:ring-accent/10 focus:bg-surface font-mono" 
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Password (সিকিউরিটি পাসওয়ার্ড)</label>
                        <div className="relative">
                          <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim/80" size={16} />
                          <input 
                            id="stu-pass"
                            type="password" 
                            placeholder="••••••••" 
                            className="w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 pl-10 h-11 outline-none focus:border-accent text-sm font-semibold transition-all focus:ring-2 focus:ring-accent/10 focus:bg-surface font-mono" 
                            required
                          />
                        </div>
                      </div>
                      <button 
                        type="submit"
                        className="w-full bg-accent hover:bg-accent2 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm shadow-accent/10 active:scale-[0.98] uppercase tracking-wider text-xs flex items-center justify-center gap-2 mt-2 cursor-pointer"
                      >
                        <LogIn size={15} /> Authorize Exam Session
                      </button>
                    </form>
                  ) : (
                    /* REGISTER / SIGN UP FORM */
                    <form onSubmit={handleStudentRegister} className="space-y-3.5">
                      {registerError && (
                        <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-xs font-bold rounded-2xl flex items-start gap-2.5 shadow-sm animate-pulse">
                          <AlertCircle size={16} className="shrink-0 mt-0.5 text-danger" />
                          <span className="leading-relaxed text-danger font-bold">{registerError}</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Full Name (ছাত্রের নাম)</label>
                          {isGoogleAuthLinked && (
                            <span className="text-[9px] bg-accent/8 text-accent font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider">Google Profile</span>
                          )}
                        </div>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim/80" size={15} />
                          <input 
                            type="text" 
                            value={regForm.name}
                            onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                            placeholder="Full Name" 
                            className="w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 pl-10 h-11 outline-none focus:border-accent text-xs font-semibold transition-all focus:ring-2 focus:ring-accent/10 focus:bg-surface" 
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Phone No (মোবাইল নম্বর)</label>
                          <div className="relative">
                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim/80" size={15} />
                            <input 
                              type="text" 
                              value={regForm.phone}
                              onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
                              placeholder="01712345678" 
                              className="w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 pl-10 h-11 outline-none focus:border-accent text-xs font-mono font-bold transition-all focus:ring-2 focus:ring-accent/10 focus:bg-surface" 
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Email Address (ইমেইল)</label>
                            {isGoogleAuthLinked && (
                              <span className="text-[9px] bg-accent/8 text-accent font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider">গুগল লিংকড</span>
                            )}
                          </div>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim/80" size={15} />
                            <input 
                              type="email" 
                              value={regForm.email}
                              onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                              placeholder="student@gmail.com" 
                              className={`w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 pl-10 h-11 outline-none focus:border-accent text-xs font-semibold transition-all focus:ring-2 focus:ring-accent/10 focus:bg-surface ${
                                isGoogleAuthLinked ? 'opacity-70 cursor-not-allowed bg-surface-hover' : ''
                              }`}
                              required
                              readOnly={isGoogleAuthLinked}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Institution (শিক্ষা প্রতিষ্ঠান)</label>
                        <div className="relative">
                          <School className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim/80" size={15} />
                          <input 
                            type="text" 
                            value={regForm.institution}
                            onChange={e => setRegForm({ ...regForm, institution: e.target.value })}
                            placeholder="College, University, School..." 
                            className="w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 pl-10 h-11 outline-none focus:border-accent text-xs font-semibold transition-all focus:ring-2 focus:ring-accent/10 focus:bg-surface" 
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">User login ID (ইউজার আইডি)</label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim/80" size={15} />
                            <input 
                              type="text" 
                              value={regForm.userId}
                              onChange={e => setRegForm({ ...regForm, userId: e.target.value })}
                              placeholder="e.g., abir123" 
                              className="w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 pl-10 h-11 outline-none focus:border-accent text-xs font-mono font-bold transition-all focus:ring-2 focus:ring-accent/10 focus:bg-surface" 
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Password (পাসওয়ার্ড)</label>
                          <div className="relative">
                            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim/80" size={15} />
                            <input 
                              type="password" 
                              value={regForm.password}
                              onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                              placeholder="••••••••" 
                              className="w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 pl-10 h-11 outline-none focus:border-accent text-xs font-mono font-bold transition-all focus:ring-2 focus:ring-accent/10 focus:bg-surface" 
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full bg-success hover:bg-success/90 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm shadow-success/10 active:scale-[0.98] uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 mt-4 cursor-pointer"
                      >
                        <Sparkles size={14} /> Register Student Card
                      </button>
                    </form>
                  )}
                </div>
              </motion.div>
            )}

            {/* ADMIN CONSOLE VIEW */}
            {currentPage === 'admin' && (
              <div key="admin-view">
                {!isAdminAuth ? (
                  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm mx-auto py-16 px-4">
                    <div className="bg-surface border border-border p-8 rounded-3xl shadow-sm space-y-6">
                      <div className="text-center space-y-2 mb-6">
                        <div className="p-3.5 bg-accent/10 border border-accent/20 rounded-2xl w-12 h-12 flex items-center justify-center mx-auto text-accent shadow-sm">
                          <ShieldCheck size={22} />
                        </div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-text-main">Admin Access Port</h2>
                        <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest">Verify security credentials</p>
                      </div>
                      <div className="space-y-3.5">
                        <input 
                          id="admin-user" 
                          type="text" 
                          placeholder="Username" 
                          className="w-full bg-surface-hover/50 border border-border/80 rounded-xl p-3 h-11 outline-none text-sm font-semibold transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 focus:bg-surface font-mono" 
                        />
                        <input 
                          id="admin-pass" 
                          type="password" 
                          placeholder="Password" 
                          className="w-full bg-surface-hover/50 border border-border/80 rounded-xl p-3 h-11 outline-none text-sm font-semibold transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 focus:bg-surface font-mono" 
                        />
                        <button 
                          onClick={async () => {
                            const uInput = document.getElementById('admin-user') as HTMLInputElement | null;
                            const pInput = document.getElementById('admin-pass') as HTMLInputElement | null;
                            if (!uInput || !pInput) return;
                            const u = uInput.value.trim();
                            const p = pInput.value;

                            if (!u || !p) {
                              alert("Please enter both username and password!");
                              return;
                            }

                            // rakib custom superadmin
                            if (u.toLowerCase() === 'rkb_bitbox' && p === 'rkb580') {
                              setIsAdminAuth(true);
                              setActiveAdminUsername('rkb_bitBox');
                              return;
                            }

                            try {
                              const adminsQuery = query(collection(db, 'admins'), where('username', '==', u));
                              const adminsSnap = await getDocs(adminsQuery);
                              if (!adminsSnap.empty) {
                                const docData = adminsSnap.docs[0].data();
                                if (docData.password === p) {
                                  setIsAdminAuth(true);
                                  setActiveAdminUsername(docData.username || u);
                                  return;
                                }
                              }
                              alert('Unauthorized security credentials or invalid password.');
                            } catch (err) {
                              console.error(err);
                              alert('Error connecting to authentication ledger.');
                            }
                          }}
                          className="w-full bg-accent hover:bg-accent2 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm shadow-accent/10 hover:shadow-md uppercase tracking-wider text-xs cursor-pointer mt-2"
                        >
                          Verify credentials
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <AdminPanel 
                    activeAdminUsername={activeAdminUsername}
                    onLogout={() => {
                      setIsAdminAuth(false);
                      setActiveAdminUsername('');
                    }} 
                  />
                )}
              </div>
            )}

            {/* MAIN STUDENT USER PORTAL / EXAMS DASHBOARD */}
            {currentPage === 'setup' && (
              <motion.div key="setup-dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 py-6 max-w-5xl mx-auto">
                {!studentAuth ? (
                  <div className="bg-surface border border-border p-10 rounded-[2.5rem] shadow-2xl text-center space-y-6 max-w-md mx-auto">
                    <AlertCircle size={48} className="text-danger mx-auto" />
                    <h2 className="text-xl font-bold">Session Restrained</h2>
                    <p className="text-text-dim text-sm">You must enter your student credentials first to synchronize available examinations.</p>
                    <button onClick={() => setCurrentPage('login')} className="w-full bg-accent text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest">Route to login portal</button>
                  </div>
                ) : (
                  <>
                    <div className="bg-surface border border-border/80 p-6 md:p-8 rounded-3xl shadow-sm gap-6 flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-success/8 border border-success/15 text-success text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md">Active Student Profile</span>
                          <span className="text-[10px] text-text-dim font-bold uppercase font-mono bg-surface-hover px-2 py-0.5 rounded border border-border/60">ID: {studentAuth.userId}</span>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-text-main">
                          Welcome, {studentAuth.name}
                        </h1>
                        <p className="text-text-dim text-xs font-medium">
                          Institution: <span className="text-accent font-semibold">{studentAuth.institution}</span> <span className="mx-1.5 opacity-40">|</span> Phone: <span className="font-mono">{studentAuth.phone}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2.5 pt-2 md:pt-0">
                        <button 
                          onClick={() => setIsEditingProfile(true)}
                          className="bg-accent/8 hover:bg-accent/15 border border-accent/10 text-accent font-bold px-4.5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                        >
                          <Edit2 size={13} /> Update Profile
                        </button>
                        <button 
                          onClick={() => setCurrentPage('faq')}
                          className="bg-gold/8 hover:bg-gold/15 border border-gold/15 text-gold font-bold px-4.5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                        >
                          <HelpCircle size={13} className="opacity-80" /> FAQ & Guides
                        </button>
                        <button 
                          onClick={() => setCurrentPage('history')}
                          className="bg-surface hover:bg-surface-hover/80 border border-border/80 text-text-main hover:text-accent font-bold px-4.5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                        >
                          <HistoryIcon size={13} className="opacity-80" /> My Records
                        </button>
                        <button 
                          onClick={handleLogout} 
                          className="bg-danger/8 hover:bg-danger/15 text-danger border border-danger/10 font-bold px-4.5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Log out
                        </button>
                      </div>
                    </div>

                    {/* SUBJECT AND TOPIC-WISE EXAMS GRID */}
                    <div className="space-y-12">
                      {/* FREE EXAMS SECTION */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                          <h2 className="text-xl font-black tracking-tight text-text-main flex items-center gap-2.5">
                            <BookOpen className="text-success" size={20} /> 
                            <span>ফ্রি লাইভ পরীক্ষা (Free MCQ Exams)</span>
                          </h2>
                          <span className="bg-success/8 border border-success/15 text-success font-black text-[10px] px-3.5 py-1.5 rounded-full uppercase tracking-wider font-mono">
                            {publishedExams.filter(e => e.price === 0).length} Available
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {publishedExams.filter(e => e.price === 0).map((exam) => {
                            const isPurchased = true;
                            const hasPendingPayment = false;
                            return (
                              <div key={exam.id} className="bg-surface border border-border/80 hover:border-accent/30 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
                                <div className="space-y-3.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="bg-success/8 border border-success/15 text-success text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-md tracking-wider">Free Access</span>
                                    <span className="bg-success/8 border border-success/15 text-success text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-md tracking-wider flex items-center gap-1">
                                      <CheckCircle size={10} /> Unlocked (উন্মুক্ত)
                                    </span>
                                  </div>

                                  <div className="space-y-1">
                                    <h3 className="text-xl font-bold tracking-tight text-text-main group-hover:text-accent transition-colors leading-snug">
                                      {exam.subject}
                                    </h3>
                                    <p className="text-xs text-text-dim/90 font-medium">Topic: {exam.topic || 'Subject-wise MCQ assessment'}</p>
                                  </div>

                                  <div className="flex items-center gap-4 bg-surface-hover/60 border border-border/40 p-3.5 rounded-xl text-xs font-medium">
                                    <div className="flex items-center gap-2 text-text-dim">
                                      <Tag size={14} className="text-accent" />
                                      <span>Total: <strong className="text-text-main font-semibold font-mono">{exam.questions?.length || 0} MCQs</strong></span>
                                    </div>
                                    <span className="text-border/80">|</span>
                                    <div className="flex items-center gap-1.5 text-text-dim">
                                      <Clock size={14} className="text-accent" />
                                      <span>Timer: <strong className="text-text-main font-semibold font-mono">{exam.timeLimit || 30} mins</strong></span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/50 mt-auto">
                                  <div>
                                    <p className="text-[9px] font-bold uppercase text-text-dim/70 leading-none mb-1">Registration Charge</p>
                                    <h4 className="text-xl font-bold font-mono text-text-main">
                                      <span className="text-success text-[14px] font-bold uppercase">Free / সম্পূর্ণ ফ্রি</span>
                                    </h4>
                                  </div>

                                  <button
                                    onClick={() => handleLaunchExam(exam)}
                                    className="px-4.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 bg-accent hover:bg-accent2 text-white"
                                  >
                                    Participate <ChevronRight size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {publishedExams.filter(e => e.price === 0).length === 0 && (
                            <div className="col-span-full py-12 text-center text-text-dim border border-dashed border-border/80 rounded-3xl bg-surface/50">
                              <BookOpen size={36} className="opacity-15 mx-auto mb-2" />
                              <p className="font-bold text-xs uppercase tracking-wider text-text-main">No Free Exams</p>
                              <p className="text-xs italic max-w-xs mx-auto mt-1">বর্তমানে কোনো ফ্রি পরীক্ষা অ্যাভেলেবল নেই।</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* PREMIUM/PAID EXAMS SECTION */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                          <h2 className="text-xl font-black tracking-tight text-text-main flex items-center gap-2.5">
                            <Sparkles className="text-amber-500" size={20} /> 
                            <span>পেইড লাইভ পরীক্ষা (Premium Paid MCQ Exams)</span>
                          </h2>
                          <span className="bg-amber-500/8 border border-amber-500/15 text-amber-600 font-black text-[10px] px-3.5 py-1.5 rounded-full uppercase tracking-wider font-mono">
                            {publishedExams.filter(e => e.price > 0).length} Premium Live
                          </span>
                        </div>

                        {/* Top Highlights Notice Banner (পেইড এক্সাম নোটিশ) */}
                        {logoSettings.paidExamNotice && (
                          <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/12 via-accent/12 to-amber-500/12 border border-amber-500/40 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full" />
                            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-accent/20 blur-2xl rounded-full" />
                            <div className="flex items-center gap-4 relative z-10">
                              <div className="hidden sm:flex bg-gradient-to-tr from-amber-500 to-amber-600 p-3.5 rounded-2xl text-white shadow-md animate-bounce">
                                <Sparkles size={24} />
                              </div>
                              <div className="space-y-1.5">
                                <span className="bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-500 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md tracking-wider inline-block">OFFICIAL NOTICE / পেইড এক্সাম অফার</span>
                                <h3 className="text-lg md:text-2xl font-black text-text-main leading-tight font-sans tracking-wide">
                                  {logoSettings.paidExamNotice}
                                </h3>
                              </div>
                            </div>
                            <div className="relative z-10 shrink-0">
                              <span className="bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-500 font-black text-[10px] px-4 py-2 rounded-xl uppercase tracking-wider block text-center min-w-[120px] shadow-sm">
                                Limited Offer
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {publishedExams.filter(e => e.price > 0).map((exam) => {
                            const isPurchased = studentAuth.isPaidUser === true || studentAuth.purchasedExamIds?.includes(exam.id || '');
                            const hasPendingPayment = !isPurchased && studentPayments.some(p => p.examId === exam.id && p.status === 'pending');
                            return (
                              <div key={exam.id} className="bg-surface border border-border/80 hover:border-accent/30 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
                                <div className="space-y-3.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="bg-accent/8 border border-accent/15 text-accent text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-md tracking-wider">Premium MCQ Exam</span>
                                    {isPurchased ? (
                                      <span className="bg-success/8 border border-success/15 text-success text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-md tracking-wider flex items-center gap-1">
                                        <CheckCircle size={10} /> Purchased (সংযুক্ত)
                                      </span>
                                    ) : hasPendingPayment ? (
                                      <span className="bg-amber-500/8 border border-amber-500/15 text-amber-700 text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-md tracking-wider flex items-center gap-1">
                                        <Clock size={10} className="animate-spin text-amber-500" /> Pending Approval / পেন্ডিং
                                      </span>
                                    ) : (
                                      <span className="bg-warning/8 border border-warning/15 text-warning text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-md tracking-wider">
                                        Premium Lock / লক করা
                                      </span>
                                    )}
                                  </div>

                                  <div className="space-y-1">
                                    <h3 className="text-xl font-bold tracking-tight text-text-main group-hover:text-accent transition-colors leading-snug">
                                      {exam.subject}
                                    </h3>
                                    <p className="text-xs text-text-dim/90 font-medium">Topic: {exam.topic || 'Subject-wise MCQ assessment'}</p>
                                  </div>

                                  <div className="flex items-center gap-4 bg-surface-hover/60 border border-border/40 p-3.5 rounded-xl text-xs font-medium">
                                    <div className="flex items-center gap-2 text-text-dim">
                                      <Tag size={14} className="text-accent" />
                                      <span>Total: <strong className="text-text-main font-semibold font-mono">{exam.questions?.length || 0} MCQs</strong></span>
                                    </div>
                                    <span className="text-border/80">|</span>
                                    <div className="flex items-center gap-1.5 text-text-dim">
                                      <Clock size={14} className="text-accent" />
                                      <span>Timer: <strong className="text-text-main font-semibold font-mono">{exam.timeLimit || 30} mins</strong></span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/50 mt-auto">
                                  <div>
                                    <p className="text-[9px] font-bold uppercase text-text-dim/70 leading-none mb-1">Registration Charge</p>
                                    <h4 className="text-xl font-bold font-mono text-text-main">
                                      ৳{exam.price} BDT
                                    </h4>
                                  </div>

                                  <button
                                    onClick={() => {
                                      if (hasPendingPayment) {
                                        alert("আপনার পেমেন্ট রিকোয়েস্ট ইতিমধ্যে সাবমিট করা হয়েছে। অ্যাডমিন চেক করে অ্যাপ্রুভ করলে পরীক্ষাটি দিতে পারবেন।");
                                        return;
                                      }
                                      handleLaunchExam(exam);
                                    }}
                                    className={`px-4.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 ${isPurchased ? 'bg-accent hover:bg-accent2 text-white' : hasPendingPayment ? 'bg-[#b3135b]/10 text-[#b3135b] border border-[#b3135b]/15 opacity-80 cursor-not-allowed' : 'bg-[#b3135b] hover:bg-[#a01052] text-white'}`}
                                  >
                                    {isPurchased ? (
                                      <>Participate <ChevronRight size={13} /></>
                                    ) : hasPendingPayment ? (
                                      <>Pending <Clock size={12} className="animate-pulse" /></>
                                    ) : (
                                      <>Pay & Unlock ৳</>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {publishedExams.filter(e => e.price > 0).length === 0 && (
                            <div className="col-span-full py-12 text-center text-text-dim border border-dashed border-border/80 rounded-3xl bg-surface/50">
                              <Sparkles size={36} className="opacity-15 mx-auto mb-2 text-amber-500" />
                              <p className="font-bold text-xs uppercase tracking-wider text-text-main">No Premium Exams Available</p>
                              <p className="text-xs italic max-w-xs mx-auto mt-1">সব প্রিমিয়াম পরীক্ষাগুলো পরবর্তীতে চালু করা হবে।</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* EXAM TEST MODULE RUNNER */}
            {currentPage === 'exam' && (
              <motion.div key="active-exam-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ExamEngine 
                  questions={activeExamQuestions}
                  studentName={studentAuth?.name || 'Anonymous'}
                  studentId={studentAuth?.userId || 'anonymous'}
                  totalQuestions={activeExamQuestions.length}
                  timeLimitMinutes={activeExam?.timeLimit || 30}
                  examId={activeExam?.id || 'manual'}
                  examTitle={activeExam ? activeExam.subject : 'Global MCQ Assessment'}
                  onFinish={handleFinishExam}
                />
              </motion.div>
            )}

            {/* RECORDS SHEET */}
            {currentPage === 'history' && (
              <motion.div key="history-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {!studentAuth ? (
                  <div className="max-w-md mx-auto py-20 text-center space-y-6 bg-surface border border-border rounded-[2.5rem] shadow-2xl">
                    <AlertCircle size={48} className="text-danger mx-auto" />
                    <h2 className="text-xl font-bold">Access Restrained</h2>
                    <p className="text-text-dim text-sm">Please log in as a student to trace your historic assessment precision sheet.</p>
                    <button onClick={() => setCurrentPage('login')} className="bg-accent text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-xs">Route to portal</button>
                  </div>
                ) : (
                  <HistoryDashboard 
                    history={history} 
                    onViewDetails={(res) => {
                      setLastResult(res);
                      setCurrentPage('result');
                    }}
                    logoSettings={logoSettings}
                  />
                )}
              </motion.div>
            )}

            {/* ROUTINES SHEET */}
            {currentPage === 'routines' && (
              <motion.div key="routines-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <StudentRoutines routines={routines} />
              </motion.div>
            )}

            {/* FAQ PORTAL */}
            {currentPage === 'faq' && (
              <motion.div key="faq-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <FAQSection />
              </motion.div>
            )}

            {/* ASSESSMENT REPORT (RESULT REVIEW) */}
            {currentPage === 'result' && (
              <motion.div key="result-view" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto py-10 space-y-10">
                <div className="bg-surface border border-border p-12 rounded-[3.5rem] shadow-2xl text-center space-y-8 relative overflow-hidden group">
                  <motion.div 
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="absolute -top-20 -left-20 opacity-5 pointer-events-none"
                  >
                    <Trophy size={300} />
                  </motion.div>
                  
                  <Trophy className="mx-auto text-gold transition-all duration-500 group-hover:scale-125 group-hover:rotate-12" size={100} />
                  
                  <div className="space-y-4">
                    <h1 className="text-3xl font-black tracking-tight">{lastResult?.examTitle || 'Global MCQ Assessment'}</h1>
                    <h2 className="text-7xl font-black text-gold tracking-tighter drop-shadow-2xl">
                      {lastResult?.score} <span className="text-2xl text-text-dim -ml-2">/ {lastResult?.total}</span>
                    </h2>
                    <div className="space-y-1">
                      <p className="text-text-dim font-black uppercase tracking-[0.3em] text-xs">Precision Assessment Ratio</p>
                      <p className="text-success font-bold font-mono text-lg">{lastResult?.percentage}% score</p>
                    </div>
                  </div>

                  <div className="pt-10 flex flex-col gap-4 max-w-sm mx-auto">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button 
                        onClick={() => setCurrentPage('setup')}
                        className="flex-1 bg-accent hover:bg-accent2 text-white font-black py-4 rounded-2xl transition-all shadow-md active:scale-95 uppercase tracking-widest text-[10px] cursor-pointer"
                      >
                        Exams Board
                      </button>
                      <button 
                        onClick={() => setCurrentPage('history')}
                        className="flex-1 bg-surface-hover border border-border text-text-dim hover:text-text-main font-bold py-4 rounded-2xl transition-all text-[10px] uppercase tracking-wider cursor-pointer"
                      >
                        View All Records
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (lastResult) {
                          downloadResultPDF(lastResult, logoSettings);
                        }
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4.5 rounded-2xl transition-all shadow-lg active:scale-95 uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download size={14} /> Download Formal PDF Report
                    </button>
                  </div>
                </div>

                {lastResult?.questions && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-black italic flex items-center gap-3 px-4">
                      <ShieldCheck className="text-accent" /> ANSWER KEY AUDIT
                    </h3>
                    <div className="space-y-4">
                      {lastResult.questions.map((q, idx) => {
                        const userAns = lastResult.answers[idx];
                        const isCorrect = userAns === q.answer;
                        return (
                          <div key={idx} className={`bg-surface border-2 rounded-3xl p-6 transition-all ${isCorrect ? 'border-success/20' : 'border-danger/20'}`}>
                            <div className="flex items-start gap-4 mb-6">
                              <span className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center font-black text-sm ${isCorrect ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                                {idx + 1}
                              </span>
                              <h4 className="text-lg font-bold pt-1">{q.text}</h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(['A', 'B', 'C', 'D'] as const).map(key => {
                                const isOptionCorrect = q.answer === key;
                                const isOptionUser = userAns === key;
                                
                                let statusClass = "bg-surface-hover border-border/50 text-text-dim";
                                if (isOptionCorrect) statusClass = "bg-success/15 border-success text-success font-bold";
                                if (isOptionUser && !isOptionCorrect) statusClass = "bg-danger/15 border-danger text-danger font-bold";

                                return (
                                  <div key={key} className={`flex items-center gap-3 p-4 border-2 rounded-2xl ${statusClass}`}>
                                    <span className="text-xs font-black uppercase opacity-60">
                                      {key === 'A' ? 'ক' : key === 'B' ? 'খ' : key === 'C' ? 'গ' : 'ঘ'}
                                    </span>
                                    <span className="text-sm font-semibold">{q.options[key]}</span>
                                    {isOptionCorrect && <CheckCircle size={14} className="ml-auto text-success" />}
                                    {isOptionUser && !isOptionCorrect && <AlertCircle size={14} className="ml-auto text-danger" />}
                                  </div>
                                );
                              })}
                            </div>
                            {!isCorrect && (
                              <div className="mt-4 p-3 bg-danger/5 border border-danger/10 rounded-xl text-xs font-bold text-danger text-center">
                                Correct option: {q.answer === 'A' ? 'ক' : q.answer === 'B' ? 'খ' : q.answer === 'C' ? 'গ' : 'ঘ'} ({q.answer})
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* FOOTER */}
      <footer className="relative mt-24 mb-10 px-4 md:px-8">
        <div className="absolute inset-x-0 -top-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="max-w-6xl mx-auto bg-surface-hover/30 border border-border/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 shadow-xl space-y-10 relative overflow-hidden">
          {/* Subtle neon corner glows */}
          <div className="absolute -top-12 -left-12 w-24 h-24 bg-accent/5 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl" />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative z-10">
            
            {/* Column 1: Brand & Creation Info */}
            <div className="md:col-span-4 space-y-4 text-center md:text-left">
              <div onClick={handleFooterBrandClick} className="flex items-center justify-center md:justify-start gap-2.5 cursor-pointer select-none active:scale-95 transition-transform" title="Secure Solutions">
                <div className="w-3 h-3 bg-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--accent),0.5)]"></div>
                <span className="text-sm font-black text-text-main tracking-widest uppercase font-mono">
                  {logoSettings.logoText || "ICT MCQ TEST"}
                </span>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-black text-text-main tracking-wider uppercase">
                  © 2026 | bitBox®
                </p>
                <p className="text-[11px] text-text-dim leading-relaxed font-medium">
                  Leading the frontier of secure, premium, and reliable assessment architectures.
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 bg-bg/85 border border-border/50 px-3.5 py-1.5 rounded-xl text-[11px] text-text-dim shadow-inner">
                <span className="font-semibold">Created by:</span>
                <span className="text-accent font-black tracking-wide uppercase font-mono">bitBox Team</span>
              </div>
            </div>

            {/* Column 2: Connections & Verified Resources */}
            <div className="md:col-span-5 flex flex-col items-center justify-center space-y-4 px-2">
              <div className="w-full max-w-sm flex items-center gap-3.5 bg-bg/80 border border-border/75 px-4.5 py-3 rounded-2xl transition-all hover:border-accent shadow-sm">
                <div className="p-2 bg-accent/8 border border-accent/15 text-accent rounded-xl">
                  <Mail size={16} />
                </div>
                <div className="text-left">
                  <span className="text-[9px] font-extrabold text-text-dim uppercase tracking-wider block">SUPPORT HELPDESK</span>
                  <a href="mailto:bitboxbd580@gmail.com" className="text-xs font-black text-text-main hover:text-accent transition-colors font-mono">
                    bitboxbd580@gmail.com
                  </a>
                </div>
              </div>

              {/* Action Buttons Capsule Row */}
              <div className="w-full max-w-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Membership Verification */}
                <a 
                  href="https://membership-1zaq.onrender.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group flex flex-col justify-between bg-accent/8 border border-accent/20 hover:bg-accent/12 hover:border-accent/35 p-3 rounded-2xl transition-all shadow-sm cursor-pointer text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-extrabold text-accent uppercase tracking-widest block">Authorization</span>
                    <div className="w-1.5 h-1.5 bg-success rounded-full animate-ping"></div>
                  </div>
                  <span className="text-xs font-black text-text-main group-hover:text-accent transition-colors uppercase mt-2.5 flex items-center justify-between">
                    Membership <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </a>

                {/* bitBox Book Order */}
                <a 
                  href="https://bitboxbd.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group flex flex-col justify-between bg-amber-500/8 border border-amber-500/20 hover:bg-amber-500/12 hover:border-amber-500/35 p-3 rounded-2xl transition-all shadow-sm cursor-pointer text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-extrabold text-amber-500 uppercase tracking-widest block">Official Store</span>
                    <BookOpen size={13} className="text-amber-500 animate-pulse" />
                  </div>
                  <span className="text-xs font-black text-text-main group-hover:text-amber-500 transition-colors uppercase mt-2.5 flex items-center justify-between">
                    Book Order <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </a>
              </div>
            </div>

            {/* Column 3: Global Social Channels */}
            <div className="md:col-span-3 flex flex-col items-center md:items-end justify-center space-y-4">
              <div className="text-center md:text-right space-y-1">
                <span className="text-[10px] font-extrabold text-text-dim uppercase tracking-widest block font-mono">SOCIAL CHANNELS</span>
                <p className="text-[10px] text-text-dim/80">Join our dynamic communities</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Facebook Group */}
                <a 
                  href="https://www.facebook.com/groups/biboxitjobsolution" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="Facebook Community Group"
                  className="w-12 h-12 rounded-2xl bg-bg border border-border flex items-center justify-center text-text-dim hover:text-white hover:bg-[#1877F2] hover:border-[#1877F2] transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-[#1877F2]/10"
                >
                  <svg className="w-5.5 h-5.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                  </svg>
                </a>

                {/* WhatsApp Channel */}
                <a 
                  href="https://wa.me/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="Official WhatsApp Assistance"
                  className="w-12 h-12 rounded-2xl bg-bg border border-border flex items-center justify-center text-text-dim hover:text-white hover:bg-[#25D366] hover:border-[#25D366] transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-[#25D366]/10"
                >
                  <svg className="w-5.5 h-5.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.022-.015-.022-.015-.4-.2l-1.802-.9c-.198-.1-.4-.1-.58 0l-1 1c-.1.1-.3.2-.5.1-.3-.1-1.3-.5-2.4-1.5-1-.9-1.6-2.1-1.8-2.4-.2-.3-.1-.5.1-.7l.6-.7c.1-.1.1-.2.2-.4s0-.4-.1-.6L8.4 6.8c-.2-.4-.4-.5-.6-.5h-.6c-.3 0-.7.1-1 .4-.4.4-.9 1-.9 2.5 0 2 1 4 1.3 4.4 1 1.4 3 4.4 7 5.8 1 .4 1.8.6 2.4.8 1 .3 2 .3 2.7.2.8-.1 1.8-.7 2.1-1.5.3-.8.3-1.4.2-1.5h-.028zm2.4-10.4c-2.4-2.4-5.6-3.8-9-3.8-7 0-12.7 5.7-12.7 12.7 0 2.2.6 4.4 1.7 6.2L0 24l5.3-1.4c1.8 1 3.9 1.5 6 1.5 7 0 12.7-5.7 12.7-12.7 0-3.4-1.3-6.6-3.8-9z"/>
                  </svg>
                </a>

                {/* Telegram Channel */}
                <a 
                  href="https://t.me/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="Official Telegram Channel"
                  className="w-12 h-12 rounded-2xl bg-bg border border-border flex items-center justify-center text-text-dim hover:text-white hover:bg-[#229ED9] hover:border-[#229ED9] transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-[#229ED9]/10"
                >
                  <svg className="w-5.5 h-5.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.66-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.97-.74 3.79-1.65 6.32-2.73 7.57-3.25 3.61-1.48 4.36-1.74 4.85-1.75.11 0 .35.03.5.16.13.12.17.29.18.41-.01.07-.01.15-.02.22z"/>
                  </svg>
                </a>
              </div>
            </div>

          </div>

          {/* Bottom subtle divider and disclaimer */}
          <div className="pt-6 border-t border-border/40 text-center text-[10px] text-text-dim/80 font-medium">
            This platform uses end-to-end military-grade assessment validations. Managed with dedication.
          </div>
        </div>
      </footer>

      {/* PREMIUM AUTOMATIC BKASH CHECKOUT FLOW SIMULATION MODAL */}
      <AnimatePresence>
        {activeCheckoutExam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-surface border-4 border border-border p-0 max-w-md w-full rounded-[2rem] shadow-2xl relative overflow-hidden"
            >
              {/* bKash Theme Header banner */}
              <div className="bg-[#b3135b] text-white p-6 relative flex flex-col items-center justify-center space-y-2">
                <button 
                  onClick={() => {
                    setActiveCheckoutExam(null);
                    setBkashTrxId('');
                    setPaymentSuccessSlip(null);
                  }}
                  className="absolute right-4 top-4 hover:bg-black/10 text-white rounded-full p-1 transition-all"
                >
                  <X size={18} />
                </button>
                <div className="bg-white/10 px-3 py-1 rounded-full uppercase text-[9px] font-black tracking-widest border border-white/20">bKash Payment Gateway</div>
                <h3 className="text-xl font-bold tracking-tight uppercase italic flex items-center gap-1.5 font-sans">
                  <span>bKash</span> <span className="text-white/80 text-sm not-italic">Checkout</span>
                </h3>
              </div>

              {!paymentSuccessSlip ? (
                /* INSTRUCTION & INPUT FORM */
                <form onSubmit={handleVerifyBkashPayment} className="p-8 space-y-6">
                  <div className="bg-bg/60 border border-border p-4.5 rounded-2xl text-center space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#b3135b]">Instructions (পেমেন্ট নিয়মাবলী)</p>
                    <p className="text-xs text-text-main leading-relaxed font-semibold">
                      Please sent money of <strong className="text-accent font-black">৳{activeCheckoutExam.price} BDT</strong> from your bKash to my personal account number:
                    </p>
                    <div className="bg-[#b3135b]/10 border border-[#b3135b]/20 text-[#b3135b] py-2 px-4 rounded-xl font-mono font-black text-sm tracking-wider inline-block">
                      01725675580 (Send Money)
                    </div>
                    <p className="text-[10px] text-text-dim italic leading-snug">
                      After payment, copy & paste your bkash Transation ID (TRXID) below to activate automatic validation ledger.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#b3135b] uppercase tracking-wider block">BKASH TRANSACTION ID (TRXID)</label>
                    <input
                      type="text"
                      value={bkashTrxId}
                      onChange={e => setBkashTrxId(e.target.value)}
                      placeholder="e.g. TRXR820XP4"
                      className="w-full bg-bg border-2 border-border focus:border-[#b3135b] rounded-xl p-4 outline-none font-mono font-black tracking-widest text-center uppercase"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={paymentLoader}
                    className="w-full bg-[#b3135b] hover:bg-[#b01057] text-white font-black py-4.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-[#b3135b]/10 flex items-center justify-center gap-2"
                  >
                    {paymentLoader ? (
                      <><Loader2 size={16} className="animate-spin" /> Querying bKash API...</>
                    ) : (
                      <>Verify Automatic Payment ৳</>
                    )}
                  </button>
                </form>
              ) : (
                /* SUCCESS RECEIPT */
                <div className="p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 bg-warning/15 border border-warning/30 text-warning rounded-full flex items-center justify-center mx-auto">
                      <Clock size={32} className="animate-pulse" />
                    </div>
                    <h4 className="text-lg font-black uppercase text-warning">পেমেন্ট পেন্ডিং</h4>
                    <p className="text-[10px] text-text-dim uppercase tracking-wider font-bold">REQ LOGGED. UNLOCK PENDING ADMIN VERIFICATION</p>
                  </div>

                  <div className="bg-bg border border-border p-4.5 rounded-2xl space-y-2.5 font-mono text-[11px] leading-relaxed">
                    <div className="flex justify-between border-b border-border pb-1.5">
                      <span className="text-text-dim">Invoice Code:</span>
                      <span className="text-text-main font-black">INV-{paymentSuccessSlip.id?.substring(0,6).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-1.5">
                      <span className="text-text-dim">Subject Exam:</span>
                      <span className="text-text-main font-black">{activeCheckoutExam.subject}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-1.5">
                      <span className="text-text-dim">Transaction ID:</span>
                      <span className="text-success font-black">{paymentSuccessSlip.trxId}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-text-dim">Total Paid BDT:</span>
                      <span className="text-accent font-black">৳{paymentSuccessSlip.amount} BDT</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex-1 bg-accent hover:bg-accent2 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all inline-flex items-center justify-center gap-1.5"
                    >
                      <Printer size={13} /> Print Slip
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCheckoutExam(null);
                        setBkashTrxId('');
                        setPaymentSuccessSlip(null);
                      }}
                      className="bg-bg border border-border hover:bg-surface text-text-main font-black px-5 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all"
                    >
                      Close Gateway
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STUDENT PROFILE UPDATE MODAL */}
      <AnimatePresence>
        {isEditingProfile && studentAuth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-surface border border-border/85 max-w-md w-full rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-accent/8 rounded-xl flex items-center justify-center border border-accent/15">
                    <User className="text-accent" size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-text-main uppercase tracking-wider">Update Your Profile</h3>
                    <p className="text-[10px] text-text-dim uppercase tracking-wider font-semibold">Live Account Credentials Manager</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="text-text-dim hover:text-text-main p-1.5 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form content */}
              <form onSubmit={handleUpdateProfile} className="space-y-4 mt-6">
                {/* User ID - readonly/disabled */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Student Login ID (Immutable)</label>
                  <input
                    type="text"
                    disabled
                    value={studentAuth.userId}
                    className="w-full bg-surface-hover/80 border border-border/40 text-text-dim cursor-not-allowed rounded-xl p-3 h-11 text-xs font-mono font-bold outline-none"
                  />
                  <p className="text-[9px] text-amber-600 font-semibold uppercase leading-none">Your unique Student Login ID is locked and cannot be changed.</p>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Your Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full bg-surface-hover/40 border border-border/80 rounded-xl p-3 h-11 text-xs font-bold outline-none focus:border-accent focus:ring-1 focus:ring-accent/15 focus:bg-surface"
                    placeholder="Enter full name"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Login Password</label>
                  <input
                    type="text"
                    required
                    value={profileForm.password}
                    onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                    className="w-full bg-surface-hover/40 border border-border/80 rounded-xl p-3 h-11 text-xs font-mono font-bold outline-none focus:border-accent focus:ring-1 focus:ring-accent/15 focus:bg-surface"
                    placeholder="Enter login password"
                  />
                  <p className="text-[9px] text-text-dim leading-none">This password is used to log back into your assessment panel.</p>
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Phone Number</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full bg-surface-hover/40 border border-border/80 rounded-xl p-3 h-11 text-xs font-mono font-bold outline-none focus:border-accent focus:ring-1 focus:ring-accent/15 focus:bg-surface"
                    placeholder="Mobile number"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Email Address</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full bg-surface-hover/40 border border-border/80 rounded-xl p-3 h-11 text-xs font-semibold outline-none focus:border-accent focus:ring-1 focus:ring-accent/15 focus:bg-surface"
                    placeholder="student@example.com"
                  />
                </div>

                {/* Institution */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Institution Name</label>
                  <input
                    type="text"
                    value={profileForm.institution}
                    onChange={(e) => setProfileForm({ ...profileForm, institution: e.target.value })}
                    className="w-full bg-surface-hover/40 border border-border/80 rounded-xl p-3 h-11 text-xs font-bold outline-none focus:border-accent focus:ring-1 focus:ring-accent/15 focus:bg-surface"
                    placeholder="College or Varsity Name"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2.5 pt-4">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex-1 bg-accent hover:bg-accent2 text-white font-extrabold h-11 rounded-xl text-xs uppercase tracking-widest cursor-pointer transition-all disabled:opacity-50 inline-flex items-center justify-center animate-pulse"
                  >
                    {savingProfile ? 'SAVING DATA...' : 'SAVE CHANGES'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="bg-surface border border-border/80 hover:bg-surface-hover text-text-main font-bold h-11 px-5 rounded-xl text-xs uppercase cursor-pointer transition-colors"
                  >
                    DISCARD
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GOOGLE AUTH DOMAIN AUTHORIZATION OVERLAY MODAL */}
      <AnimatePresence>
        {authDomainError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-left font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-surface border-4 border-danger/60 border-double max-w-lg w-full rounded-[2rem] p-6 md:p-8 shadow-2xl relative space-y-6 overflow-hidden"
            >
              {/* Corner ambient warning glows */}
              <div className="absolute -top-12 -left-12 w-24 h-24 bg-danger/5 rounded-full blur-2xl" />
              <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-accent/5 rounded-full blur-2xl" />

              {/* Close Button */}
              <button 
                onClick={() => setAuthDomainError(null)}
                className="absolute right-6 top-6 text-text-dim hover:text-text-main p-2 rounded-xl hover:bg-surface-hover/50 transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>

              <div className="space-y-2 text-center">
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-2xl w-12 h-12 flex items-center justify-center mx-auto text-danger shadow-sm">
                  <ShieldCheck size={22} className="animate-pulse" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-text-main uppercase">Firebase Auth Domain Configuration Required</h3>
                <p className="text-[10px] text-danger font-bold uppercase tracking-widest leading-relaxed">
                  গুগল লগইন করার জন্য এই ডোমেইনটি অথরাইজড করা আবশ্যক
                </p>
              </div>

              <div className="bg-bg/60 border border-border/80 rounded-2xl p-4.5 space-y-4 shadow-sm">
                <div>
                  <span className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Your App Domain (আপনার ডোমেইন)</span>
                  <div className="flex items-center justify-between gap-3 bg-surface border border-border/60 rounded-xl px-4 py-2.5 mt-1.5 font-mono text-xs select-all text-text-main font-bold">
                    <span className="truncate">{authDomainError}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(authDomainError);
                        alert("Domain name copied! জিমেইল লগইন চালুর জন্য ডোমেইনটি কপি করা হয়েছে।");
                      }}
                      className="text-accent hover:text-accent2 p-1.5 rounded-lg hover:bg-accent/10 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      title="Copy Domain Name"
                    >
                      <Copy size={13} />
                      <span className="text-[10px] font-bold uppercase">Copy</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-text-dim leading-relaxed space-y-2.5 font-medium border-t border-border/40 pt-4">
                  <p className="text-text-main font-bold">লগইন চালু করার সহজ উপায় (Easy step-by-step setup):</p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-[11px] font-semibold">
                    <li>
                      <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-accent underline inline-flex items-center gap-1 hover:text-accent2">
                        Firebase Console <ExternalLink size={10} />
                      </a> এ প্রবেশ করে আপনার প্রজেক্টটি সিলেক্ট করুন।
                    </li>
                    <li>বামে <strong>Authentication</strong> মেনু থেকে <strong>Settings</strong> ট্যাবে যান।</li>
                    <li><strong>Authorized domains</strong> এ ক্লিক করে <strong>Add domain</strong> বাটন চাপুন।</li>
                    <li>কপি করা ডোমেইন <code>{authDomainError}</code> পেস্ট করে <strong>Add</strong> করুন।</li>
                  </ol>
                  <p className="text-[10px] bg-accent/8 border border-accent/15 text-text-main p-2.5 rounded-xl block leading-normal mt-3 font-semibold">
                    💡 <strong>Pro Tip:</strong> dynamic development testing এর জন্য আপনার settings এ local domain এবং dynamically তৈরি করা hosted links ও Add করে রাখুন।
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAuthDomainError(null)}
                  className="flex-1 bg-accent hover:bg-accent2 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer text-center"
                >
                  GOT IT, PLEASE EXAMINATE AGAIN
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
