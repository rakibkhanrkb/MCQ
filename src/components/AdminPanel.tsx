import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, deleteDoc, doc, writeBatch, getDocs, limit, updateDoc, where, arrayUnion, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Question, Exam, UserAccount, PaymentSlip, ExamRoutine, AdminAccount } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { Trash2, Plus, Download, LogOut, ShieldCheck, Shield, Users, UserPlus, Search, History as HistoryIcon, Edit2, Check, X, CreditCard, Layers, Tag, Clock, DollarSign, Calendar, Eye, Sparkles, Settings, FileText, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  onLogout: () => void;
  activeAdminUsername: string;
}

export default function AdminPanel({ onLogout, activeAdminUsername }: AdminPanelProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [payments, setPayments] = useState<PaymentSlip[]>([]);
  const [routines, setRoutines] = useState<ExamRoutine[]>([]);
  const [activeTab, setActiveTab] = useState<'exams' | 'users' | 'results' | 'payments' | 'settings' | 'routines' | 'admins' | 'logs' | 'paid_users'>('exams');
  const [loading, setLoading] = useState(false);

  // Exam Publish set duration states
  const [selectedExamToPublish, setSelectedExamToPublish] = useState<Exam | null>(null);
  const [publishTimeLimit, setPublishTimeLimit] = useState<number>(30);

  // Admin management States
  const [adminsList, setAdminsList] = useState<AdminAccount[]>([]);
  const [adminForm, setAdminForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'admin' as 'admin' | 'superadmin',
  });
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);

  // Activity Logging
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [logQuery, setLogQuery] = useState('');
  const [logCategoryFilter, setLogCategoryFilter] = useState('All');

  // Paid Student Users Directory States
  const [paidUserSearch, setPaidUserSearch] = useState('');
  const [paidUserFilter, setPaidUserFilter] = useState<'all' | 'full' | 'selective'>('all');

  const filteredLogs = activityLogs.filter(log => {
    const matchesCategory = logCategoryFilter === 'All' || log.category === logCategoryFilter;
    const matchesQuery = !logQuery.trim() || 
      (log.action || '').toLowerCase().includes(logQuery.toLowerCase()) ||
      (log.adminUsername || '').toLowerCase().includes(logQuery.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(logQuery.toLowerCase()) ||
      (log.category || '').toLowerCase().includes(logQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const logActivity = async (category: string, action: string, details: string = '') => {
    try {
      await addDoc(collection(db, 'activity_logs'), {
        adminUsername: activeAdminUsername || 'System / Built-in',
        category,
        action,
        details: details || '',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to write activity log:", error);
    }
  };

  // Routine Form State
  const [routineForm, setRoutineForm] = useState({
    title: '',
    description: '',
    routineType: 'text' as 'text' | 'image' | 'pdf',
    fileUrl: '',
  });
  const [routineFileBase64, setRoutineFileBase64] = useState<string | null>(null);
  const [routineFileName, setRoutineFileName] = useState<string>('');

  // Logo & Branding Settings
  const [logoSettings, setLogoSettings] = useState({
    logoType: 'text' as 'text' | 'image' | 'both',
    logoText: 'ICT MCQ',
    logoUrl: '',
    heroImageUrl: '',
    paidExamNotice: '৫০ টাকায় সারামাস পেইড এক্সাম (২০ টি)',
  });

  // Export & Filtering states
  const [selectedExamResultFilter, setSelectedExamResultFilter] = useState<string>('all');

  const filteredResults = selectedExamResultFilter === 'all'
    ? results
    : results.filter(r => (r.examTitle || 'Global MCQ Bank') === selectedExamResultFilter);

  const exportAllStudentsToExcel = () => {
    const headers = [
      'Student Name',
      'Login ID',
      'Passcode',
      'Institution',
      'Phone No',
      'Email Address',
      'Purchased Exam Count',
      'Has Full Access (isPaidUser)'
    ];

    const rows = users.map(user => [
      user.name || '',
      user.userId || '',
      user.password || '',
      user.institution || '',
      user.phone || '',
      user.email || '',
      user.purchasedExamIds?.length || 0,
      user.isPaidUser ? 'YES' : 'NO'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        }).join(',')
      )
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `All_Students_List_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    logActivity("Export", "Downloaded registered students database list as Excel/CSV");
  };

  const exportResultsToExcel = () => {
    const headers = [
      'Timestamp',
      'Student Name',
      'Student ID',
      'Exam Title',
      'Obtained Score',
      'Total Marks',
      'Percentage (%)'
    ];

    const rows = filteredResults.map(res => {
      const dateStr = res.timestamp?.seconds 
        ? new Date(res.timestamp.seconds * 1000).toLocaleString() 
        : 'N/A';
      return [
        dateStr,
        res.studentName || 'Anonymous',
        res.studentId || 'anonymous',
        res.examTitle || 'Global MCQ Bank',
        res.score || 0,
        res.total || 0,
        res.percentage ? String(res.percentage).replace('%', '') : '0'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        }).join(',')
      )
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const fileLabel = selectedExamResultFilter === 'all' 
      ? 'All_Students_Exam_Results'
      : `${selectedExamResultFilter.replace(/\s+/g, '_')}_Results`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileLabel}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logActivity("Export", `Downloaded exam results list as Excel/CSV (Filter: ${selectedExamResultFilter})`);
  };

  useEffect(() => {
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
    }, (error) => {
      console.warn("Branding settings snapshot reading warning:", error.message);
    });

    // Realtime subscription to exam routines (Manual client-side sort to avoid index errors)
    const routinesQuery = query(collection(db, 'exam_routines'));
    const unsubRoutines = onSnapshot(routinesQuery, (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as ExamRoutine);
      const sortedData = data.sort((a, b) => {
        const timeA = (a.createdAt as any)?.seconds || 0;
        const timeB = (b.createdAt as any)?.seconds || 0;
        return timeB - timeA;
      });
      setRoutines(sortedData);
    }, (err) => {
      console.warn("Admin panel routines listener suppressed:", err.message);
    });

    return () => {
      unsubSettings();
      unsubRoutines();
    };
  }, []);

  const handleSaveLogoSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, 'settings', 'general'), {
        logoType: logoSettings.logoType,
        logoText: logoSettings.logoText.trim(),
        logoUrl: logoSettings.logoUrl.trim(),
        heroImageUrl: (logoSettings.heroImageUrl || '').trim(),
        paidExamNotice: (logoSettings.paidExamNotice || '৫০ টাকায় সারামাস পেইড এক্সাম (২০ টি)').trim(),
      });
      await logActivity("Settings", "Updated portal branding and logo configuration", `Logo Text: ${logoSettings.logoText.trim()}`);
      alert("Portal Logo Brand configuration has been successfully updated!");
    } catch (err) {
      try {
        await setDoc(doc(db, 'settings', 'general'), {
          logoType: logoSettings.logoType,
          logoText: logoSettings.logoText.trim(),
          logoUrl: logoSettings.logoUrl.trim(),
          heroImageUrl: (logoSettings.heroImageUrl || '').trim(),
          paidExamNotice: (logoSettings.paidExamNotice || '৫০ টাকায় সারামাস পেইড এক্সাম (২০ টি)').trim(),
        });
        await logActivity("Settings", "Created and updated portal branding and logo configuration", `Logo Text: ${logoSettings.logoText.trim()}`);
        alert("Portal Logo Brand configuration created and updated!");
      } catch (innerErr) {
        console.error(innerErr);
        alert("Failed to update logo settings.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoutineFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRoutineFileName(file.name);
    
    // Check file size limit (let's say 4MB)
    if (file.size > 4 * 1024 * 1024) {
      alert("File size exceeds 4MB. Please upload a smaller PDF or image to keep store requests highly lightweight.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setRoutineFileBase64(reader.result as string);
    };
    reader.onerror = () => {
      alert("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  const handleAddRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineForm.title.trim()) {
      alert("Please provide a title for the exam routine.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title: routineForm.title.trim(),
        description: routineForm.description.trim(),
        routineType: routineForm.routineType,
        createdAt: serverTimestamp(),
      };

      // Set URL or local uploaded file
      if (routineForm.routineType === 'text') {
        payload.fileUrl = '';
      } else {
        // If file uploaded as base64, use it; otherwise use fileUrl value
        payload.fileUrl = routineFileBase64 || routineForm.fileUrl.trim();
      }

      await addDoc(collection(db, 'exam_routines'), payload);
      await logActivity("Routines", `Created exam routine: "${payload.title}"`, `Type: ${payload.routineType}`);
      alert("Exam Routine with associated documents has been securely recorded!");
      
      // Reset form
      setRoutineForm({
        title: '',
        description: '',
        routineType: 'text',
        fileUrl: '',
      });
      setRoutineFileBase64(null);
      setRoutineFileName('');
    } catch (err) {
      console.error(err);
      alert("Failed to add routine. Verify network settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Exam Routine page?")) return;
    try {
      const rName = routines.find(r => r.id === id)?.title || id;
      await deleteDoc(doc(db, 'exam_routines', id));
      await logActivity("Routines", `Deleted exam routine: "${rName}"`, `ID: ${id}`);
      alert("Routine deleted successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to process deletion.");
    }
  };

  // Exam Form State
  const [examForm, setExamForm] = useState({
    subject: '',
    topic: '',
    timeLimit: 30,
    price: 150,
    isPublished: false,
  });
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    text: '',
    options: { A: '', B: '', C: '', D: '' },
    answer: 'A',
    marks: 1
  });
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  // User Form State
  const [userForm, setUserForm] = useState({
    userId: '',
    password: '',
    name: '',
    phone: '',
    email: '',
    institution: '',
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // State to view slip details
  const [selectedSlip, setSelectedSlip] = useState<PaymentSlip | null>(null);

  // MCQ Pool Management States
  const [selectedExamForMCQs, setSelectedExamForMCQs] = useState<Exam | null>(null);
  const [mcqPool, setMcqPool] = useState<Question[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolForm, setPoolForm] = useState({
    subject: '',
    topic: '',
    text: '',
    options: { A: '', B: '', C: '', D: '' },
    answer: 'A' as 'A' | 'B' | 'C' | 'D',
    marks: 1
  });
  const [editingPoolQuestionId, setEditingPoolQuestionId] = useState<string | null>(null);

  // Filters for displaying pool MCQs
  const [poolFilters, setPoolFilters] = useState({ subject: '', topic: '' });

  // MCQ Dynamic Exam Generator States
  const [genForm, setGenForm] = useState({
    subject: '',
    topic: '',
    count: 10,
    timeLimit: 30,
    examName: '',
    price: 150
  });

  // Load MCQ pool of the selected exam
  useEffect(() => {
    if (!selectedExamForMCQs?.id) {
      setMcqPool([]);
      return;
    }
    setPoolLoading(true);
    const q = query(
      collection(db, 'exams', selectedExamForMCQs.id, 'mcq_pool'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMcqPool(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      setPoolLoading(false);
    }, (error) => {
      console.error("Firestore onSnapshot error on mcq_pool:", error);
      setPoolLoading(false);
    });
    return () => unsub();
  }, [selectedExamForMCQs?.id]);

  useEffect(() => {
    // Read Exams
    const examsQuery = query(collection(db, 'exams'), orderBy('createdAt', 'desc'));
    const unsubscribeExams = onSnapshot(examsQuery, (snapshot) => {
      setExams(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Exam)));
    }, error => console.warn("Exams snapshot reading error:", error.message));

    // Read Users (Students)
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserAccount)));
    }, error => console.warn("Users snapshot reading error:", error.message));

    // Read Results
    const resultsQuery = query(collection(db, 'exam_results'), limit(500));
    const unsubscribeResults = onSnapshot(resultsQuery, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = data.sort((a: any, b: any) => {
        const tA = a.timestamp?.seconds || 0;
        const tB = b.timestamp?.seconds || 0;
        return tB - tA;
      });
      setResults(sorted);
    }, error => console.warn("Results snapshot reading error:", error.message));

    // Read Payments ledger
    const paymentsQuery = query(collection(db, 'payments'), limit(500));
    const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PaymentSlip));
      const sorted = data.sort((a: any, b: any) => {
        const tA = a.timestamp?.seconds || 0;
        const tB = b.timestamp?.seconds || 0;
        return tB - tA;
      });
      setPayments(sorted);
    }, error => console.warn("Payments snapshot reading error:", error.message));

    // Read Admins
    const adminsQuery = query(collection(db, 'admins'));
    const unsubscribeAdmins = onSnapshot(adminsQuery, (snapshot) => {
      setAdminsList(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AdminAccount)));
    }, error => {
      console.warn("Admins reading error:", error.message);
    });

    // Read Activity Logs
    const logsQuery = query(collection(db, 'activity_logs'), limit(500));
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = data.sort((a: any, b: any) => {
        const tA = a.timestamp?.seconds || 0;
        const tB = b.timestamp?.seconds || 0;
        return tB - tA;
      });
      setActivityLogs(sorted);
    }, error => {
      console.warn("Activity logs reading error:", error.message);
    });

    return () => {
      unsubscribeExams();
      unsubscribeUsers();
      unsubscribeResults();
      unsubscribePayments();
      unsubscribeAdmins();
      unsubscribeLogs();
    };
  }, []);

  // Questions addition helper for active exam creator
  const handleAddQuestionToExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion.text || !currentQuestion.options.A || !currentQuestion.options.B || !currentQuestion.options.C || !currentQuestion.options.D) {
      alert("Please fill all options and question text!");
      return;
    }
    setExamQuestions([...examQuestions, currentQuestion]);
    setCurrentQuestion({
      text: '',
      options: { A: '', B: '', C: '', D: '' },
      answer: 'A',
      marks: 1
    });
  };

  const handleRemoveQuestionFromExam = (index: number) => {
    setExamQuestions(examQuestions.filter((_, idx) => idx !== index));
  };

  // Create / Edit Exam
  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.subject) {
      alert("Please enter the Exam Name!");
      return;
    }
    if (examQuestions.length === 0) {
      alert("Please add at least 1 MCQ question to this exam!");
      return;
    }

    setLoading(true);
    try {
      if (editingExamId) {
        // Update existing
        await updateDoc(doc(db, 'exams', editingExamId), {
          ...examForm,
          questions: examQuestions
        });
        await logActivity("Exam Management", `Updated exam: "${examForm.subject}"`, `Topic: ${examForm.topic}, Price: ${examForm.price} BDT`);
        alert('Exam updated successfully!');
        setEditingExamId(null);
      } else {
        // Create new
        await addDoc(collection(db, 'exams'), {
          ...examForm,
          isPublished: false, // Directly unpublished under database default
          questions: examQuestions,
          createdAt: serverTimestamp()
        });
        await logActivity("Exam Management", `Created new exam: "${examForm.subject}"`, `Topic: ${examForm.topic}, Price: ${examForm.price} BDT, Questions: ${examQuestions.length}`);
        alert('পরীক্ষাটি সফলভাবে তৈরি করা হয়েছে। এটি আনপাবলিশড অবস্থায় আছে, পাবলিশ বাটনে ক্লিক করে সময় নির্ধারণ করে পাবলিশ করতে পারবেন।');
      }

      // Reset form
      setExamForm({
        subject: '',
        topic: '',
        timeLimit: 30,
        price: 150,
        isPublished: false,
      });
      setExamQuestions([]);
    } catch (err) {
      handleFirestoreError(err, 'write', 'exams');
    } finally {
      setLoading(false);
    }
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExamId(exam.id || null);
    setExamForm({
      subject: exam.subject || '',
      topic: exam.topic || '',
      timeLimit: exam.timeLimit ?? 30,
      price: exam.price ?? 150,
      isPublished: exam.isPublished ?? true,
    });
    setExamQuestions(exam.questions || []);
  };

  const handleDeleteExam = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Exam? All students' ability to access this exam will be removed.")) return;
    try {
      const eName = exams.find(e => e.id === id)?.subject || id;
      await deleteDoc(doc(db, 'exams', id));
      await logActivity("Exam Management", `Deleted exam: "${eName}"`, `ID: ${id}`);
    } catch (err) {
      handleFirestoreError(err, 'delete', `exams/${id}`);
    }
  };

  const handleTogglePublishExam = async (exam: Exam) => {
    if (!exam.id) return;
    try {
       if (exam.isPublished) {
         // Simple toggle off
         await updateDoc(doc(db, 'exams', exam.id), {
           isPublished: false
         });
         await logActivity("Exam Management", `Unpublished exam: "${exam.subject}"`, `ID: ${exam.id}`);
         alert("পরীক্ষাটি সফলভাবে আনপাবলিশ করা হয়েছে!");
       } else {
         // Open time limit input modal to publish
         setSelectedExamToPublish(exam);
         setPublishTimeLimit(exam.timeLimit || 30);
       }
    } catch (err) {
      handleFirestoreError(err, 'update', `exams/${exam.id}`);
    }
  };

  const handleConfirmPublish = async () => {
    if (!selectedExamToPublish || !selectedExamToPublish.id) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'exams', selectedExamToPublish.id), {
        isPublished: true,
        timeLimit: Number(publishTimeLimit) || 30
      });
      await logActivity("Exam Management", `Published exam: "${selectedExamToPublish.subject}"`, `Time Limit: ${publishTimeLimit} mins, ID: ${selectedExamToPublish.id}`);
      alert(`পরীক্ষাটি সফলভাবে পাবলিশ করা হয়েছে! পরীক্ষার সময় সীমা: ${publishTimeLimit} মিনিট নির্ধারণ করা হয়েছে।`);
      setSelectedExamToPublish(null);
    } catch (err) {
      handleFirestoreError(err, 'update', `exams/${selectedExamToPublish.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const uname = adminForm.username.trim().toLowerCase();
    const upass = adminForm.password.trim();
    const uDisplayName = adminForm.name.trim();

    if (editingAdminId) {
      if (!uname || !uDisplayName) {
        alert("ইউজারনেম এবং নাম পূরণ করা আবশ্যক!");
        return;
      }
    } else {
      if (!uname || !upass || !uDisplayName) {
        alert("সমস্ত ঘর পূরণ করা আবশ্যক!");
        return;
      }
    }

    // Constraint: Hardcore admin rkb_bitBox can modify/create other admins.
    // If the logged in user is NOT 'rkb_bitBox', they are forbidden from modifying 'rkb_bitBox'.
    const isEditingSelfOrHardcore = uname === 'rkb_bitbox';
    const isCurrentOperatorHardcore = activeAdminUsername.toLowerCase() === 'rkb_bitbox';

    if (isEditingSelfOrHardcore && !isCurrentOperatorHardcore) {
      alert("হার্ডকোর অ্যাডমিন 'rkb_bitBox' এর তথ্য মডিফাই বা পরিবর্তন করা অন্য কোনো অ্যাডমিনের পক্ষে সম্ভব নয়!");
      return;
    }

    setLoading(true);
    try {
      if (editingAdminId) {
        // Enforce protection if the admin being edited is rkb_bitBox
        const matched = adminsList.find(a => a.id === editingAdminId);
        if (matched && matched.username.toLowerCase() === 'rkb_bitbox' && !isCurrentOperatorHardcore) {
          alert("হার্ডকোর অ্যাডমিন 'rkb_bitBox' কে পরিবর্তন করার ক্ষমতা সাধারণ অ্যাডমিনদের নেই!");
          setLoading(false);
          return;
        }

        const updateData: any = {
          username: uname,
          name: uDisplayName,
          role: adminForm.role,
        };

        if (upass) {
          updateData.password = upass;
        }

        await updateDoc(doc(db, 'admins', editingAdminId), updateData);
        await logActivity("Admin Management", `Modified privileges of admin: "${uDisplayName}"`, `Username: ${uname}, Role: ${adminForm.role}`);
        alert('অ্যাডমিন তথ্য সফলভাবে আপডেট করা হয়েছে!');
        setEditingAdminId(null);
      } else {
        // Create new admin
        // Check duplication
        const duplicate = adminsList.some(a => a.username.toLowerCase() === uname);
        if (duplicate || uname === 'rkb_bitbox') {
          alert('এই ইউজারনেম দিয়ে ইতিমধ্যেই অ্যাডমিন তৈরি করা আছে!');
          setLoading(false);
          return;
        }

        await addDoc(collection(db, 'admins'), {
          username: uname,
          password: upass,
          name: uDisplayName,
          role: adminForm.role,
          createdAt: serverTimestamp()
        });
        await logActivity("Admin Management", `Created new admin account: "${uDisplayName}"`, `Username: ${uname}, Role: ${adminForm.role}`);
        alert('নতুন অ্যাডমিন সফলভাবে তৈরি করা হয়েছে!');
      }

      setAdminForm({
        username: '',
        password: '',
        name: '',
        role: 'admin',
      });
    } catch (err) {
      alert('Error updating administrative privileges: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleEditAdmin = (ad: AdminAccount) => {
    const isCurrentOperatorHardcore = activeAdminUsername.toLowerCase() === 'rkb_bitbox';
    if (ad.username.toLowerCase() === 'rkb_bitbox' && !isCurrentOperatorHardcore) {
      alert("হার্ডকোর অ্যাডমিন 'rkb_bitBox' এর তথ্য মডিফাই করা কোনো সাধারণ অ্যাডমিনের পক্ষে সম্ভব নয়!");
      return;
    }
    setEditingAdminId(ad.id || null);
    setAdminForm({
      username: ad.username || '',
      password: '', // Blank by default, masking current password on edit
      name: ad.name || '',
      role: ad.role || 'admin',
    });
  };

  const handleDeleteAdmin = async (id: string) => {
    const isCurrentOperatorHardcore = activeAdminUsername.toLowerCase() === 'rkb_bitbox';
    const matched = adminsList.find(a => a.id === id);
    if (!matched) return;

    if (matched.username.toLowerCase() === 'rkb_bitbox') {
      alert("হার্ডকোর অ্যাডমিন 'rkb_bitBox'কে ডিলেট করা কোনো অ্যাডমিনের পক্ষেই সম্ভব নয়!");
      return;
    }

    if (matched.username.toLowerCase() !== 'rkb_bitbox' && !isCurrentOperatorHardcore && !confirm("অ্যাডমিন তালিকার তথ্য ডিলেট করার জন্য আপনি কি নিশ্চিত?")) {
      return;
    }

    if (isCurrentOperatorHardcore && !confirm(`নিশ্চিতভাবেই কি অ্যাডমিন "${matched.name}" কে ডিলেট করতে চান?`)) {
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'admins', id));
      await logActivity("Admin Management", `Deleted admin account: "${matched.name}"`, `Username: ${matched.username}`);
      alert('অ্যাডমিন সফলভাবে অপসারিত হয়েছে!');
    } catch (err) {
      alert('ডিলেট করতে সমস্যা হয়েছে: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Add / Edit Student users
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.userId || !userForm.password || !userForm.name || !userForm.phone || !userForm.email || !userForm.institution) {
      alert("All fields are required!");
      return;
    }

    setLoading(true);
    try {
      if (editingUserId) {
        await updateDoc(doc(db, 'users', editingUserId), {
          ...userForm
        });
        await logActivity("User Management", `Updated student profile: "${userForm.name}"`, `ID: ${userForm.userId}, Inst: ${userForm.institution}`);
        alert("Student profile updated!");
        setEditingUserId(null);
      } else {
        // Check duplication
        const duplicateCheck = users.some(u => u.userId.toLowerCase() === userForm.userId.toLowerCase());
        if (duplicateCheck) {
          alert("Student User ID already exists!");
          setLoading(false);
          return;
        }

        await addDoc(collection(db, 'users'), {
          ...userForm,
          purchasedExamIds: [],
          createdAt: serverTimestamp()
        });
        await logActivity("User Management", `Registered new student: "${userForm.name}"`, `ID: ${userForm.userId}, Inst: ${userForm.institution}`);
        alert("Student registered successfully!");
      }

      setUserForm({
        userId: '',
        password: '',
        name: '',
        phone: '',
        email: '',
        institution: '',
      });
    } catch (err) {
      handleFirestoreError(err, 'write', 'users');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserAccount) => {
    setEditingUserId(user.id || null);
    setUserForm({
      userId: user.userId || '',
      password: user.password || '',
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      institution: user.institution || '',
    });
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Delete this student? This will instantly block their login session.")) return;
    try {
      const uName = users.find(u => u.id === id)?.name || id;
      await deleteDoc(doc(db, 'users', id));
      await logActivity("User Management", `Deleted student profile: "${uName}"`, `Student Document ID: ${id}`);
    } catch (err) {
      handleFirestoreError(err, 'delete', `users/${id}`);
    }
  };

  const handleToggleFullPaidAccess = async (user: UserAccount) => {
    if (!user.id) return;
    setLoading(true);
    try {
      const nextVal = !user.isPaidUser;
      await updateDoc(doc(db, 'users', user.id), {
        isPaidUser: nextVal
      });
      await logActivity(
        "User Permissions", 
        `${nextVal ? 'Granted' : 'Revoked'} full premium access for user: "${user.name}"`, 
        `Login ID: ${user.userId}`
      );
    } catch (err) {
      handleFirestoreError(err, 'write', `users/${user.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelectiveExamAccess = async (user: UserAccount, examId: string) => {
    if (!user.id) return;
    setLoading(true);
    try {
      const currentList = user.purchasedExamIds || [];
      let updatedList: string[];
      const isCurrentlySelected = currentList.includes(examId);
      if (isCurrentlySelected) {
        updatedList = currentList.filter(id => id !== examId);
      } else {
        updatedList = [...currentList, examId];
      }
      await updateDoc(doc(db, 'users', user.id), {
        purchasedExamIds: updatedList
      });
      const examTitle = exams.find(e => e.id === examId)?.subject || 'Exam';
      await logActivity(
        "User Permissions", 
        `${isCurrentlySelected ? 'Revoked' : 'Granted'} selective access to "${examTitle}" for user: "${user.name}"`, 
        `Login ID: ${user.userId}, Exam ID: ${examId}`
      );
    } catch (err) {
      handleFirestoreError(err, 'write', `users/${user.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResult = async (id: string) => {
    if (!confirm("Are you sure you want to delete this result?")) return;
    try {
      const resItem = results.find(r => r.id === id);
      const logDetails = resItem ? `Student: ${resItem.studentName}, Exam: ${resItem.examTitle}, Score: ${resItem.score}/${resItem.total}` : `ID: ${id}`;
      await deleteDoc(doc(db, 'exam_results', id));
      await logActivity("Result Management", `Deleted exam result record`, logDetails);
    } catch (err) {
      handleFirestoreError(err, 'delete', `exam_results/${id}`);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm("Delete this payment slip ledger entry? This won't automatically remove exam access from student unless modified.")) return;
    try {
      const payItem = payments.find(p => p.id === id);
      const logDetails = payItem ? `Student: ${payItem.studentName}, Exam: ${payItem.examTitle}, TrxID: ${payItem.trxId}` : `ID: ${id}`;
      await deleteDoc(doc(db, 'payments', id));
      await logActivity("Payment Management", `Deleted payment ledger entry`, logDetails);
    } catch (err) {
      handleFirestoreError(err, 'delete', `payments/${id}`);
    }
  };

  const handleApprovePayment = async (slip: PaymentSlip) => {
    if (!slip.id) return;
    if (!confirm(`Are you sure you want to approve this payment from ${slip.studentName}? This will unlock exam access for them.`)) return;

    try {
      setLoading(true);
      // 1. Update status to 'verified' in payments collection
      await updateDoc(doc(db, 'payments', slip.id), {
        status: 'verified'
      });

      // 2. Query matching user state to locate user doc to update purchasedExamIds
      const q = query(collection(db, 'users'), where('userId', '==', slip.userId));
      const snap = await getDocs(q);

      if (!snap.empty) {
        // Update first matched user doc
        const userDocRef = doc(db, 'users', snap.docs[0].id);
        await updateDoc(userDocRef, {
          purchasedExamIds: arrayUnion(slip.examId)
        });
        await logActivity("Payment Management", `Approved bKash payment from "${slip.studentName}"`, `Exam: ${slip.examTitle}, Amount: ${slip.amount} BDT, TrxID: ${slip.trxId}`);
        alert(`Payment approved & Exam unsealed for ${slip.studentName}!`);
        // If the selected slip in overlay is this one, update the view state
        if (selectedSlip && selectedSlip.id === slip.id) {
          setSelectedSlip({ ...selectedSlip, status: 'verified' });
        }
      } else {
        alert("Payment marked verified, but matching student user document was not found by User ID.");
      }
    } catch (err) {
      console.error(err);
      alert("Error approving payment. Check connectivity parameters.");
    } finally {
      setLoading(false);
    }
  };

  // --- MCQ POOL ACTIONS ---
  const handleSavePoolQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamForMCQs?.id) {
      alert("Please select an exam first from the Exams list to populate its MCQ pool!");
      return;
    }
    if (!poolForm.subject.trim() || !poolForm.topic.trim() || !poolForm.text.trim()) {
      alert("Subject, Topic and Question text are required!");
      return;
    }
    if (!poolForm.options.A.trim() || !poolForm.options.B.trim() || !poolForm.options.C.trim() || !poolForm.options.D.trim()) {
      alert("Please enter values for all four options (A, B, C, D)!");
      return;
    }

    setLoading(true);
    try {
      if (editingPoolQuestionId) {
        // Update
        const docRef = doc(db, 'exams', selectedExamForMCQs.id, 'mcq_pool', editingPoolQuestionId);
        const updatedQuestionData = {
          subject: poolForm.subject.trim(),
          topic: poolForm.topic.trim(),
          text: poolForm.text.trim(),
          options: {
            A: poolForm.options.A.trim(),
            B: poolForm.options.B.trim(),
            C: poolForm.options.C.trim(),
            D: poolForm.options.D.trim()
          },
          answer: poolForm.answer,
          marks: poolForm.marks || 1
        };
        await updateDoc(docRef, {
          ...updatedQuestionData,
          updatedAt: serverTimestamp()
        });

        // Also update parent exam's questions array field
        const parentExam = exams.find(e => e.id === selectedExamForMCQs.id);
        if (parentExam) {
          const currentQuestions = parentExam.questions || [];
          const updatedQuestions = currentQuestions.map(q => {
            if (q.id === editingPoolQuestionId || q.text === updatedQuestionData.text) {
              return { id: editingPoolQuestionId, ...updatedQuestionData };
            }
            return q;
          });
          if (!updatedQuestions.some(q => q.id === editingPoolQuestionId)) {
            updatedQuestions.push({ id: editingPoolQuestionId, ...updatedQuestionData });
          }
          await updateDoc(doc(db, 'exams', selectedExamForMCQs.id), {
            questions: updatedQuestions
          });
        }

        await logActivity("Question Management", `Edited MCQ inside pool for exam: "${selectedExamForMCQs.subject}"`, `Question: "${updatedQuestionData.text}"`);
        alert("MCQ updated inside pool successfully!");
        setEditingPoolQuestionId(null);
      } else {
        // Create
        const colRef = collection(db, 'exams', selectedExamForMCQs.id, 'mcq_pool');
        const newQuestionData = {
          subject: poolForm.subject.trim(),
          topic: poolForm.topic.trim(),
          text: poolForm.text.trim(),
          options: {
            A: poolForm.options.A.trim(),
            B: poolForm.options.B.trim(),
            C: poolForm.options.C.trim(),
            D: poolForm.options.D.trim()
          },
          answer: poolForm.answer,
          marks: poolForm.marks || 1
        };
        const docAdded = await addDoc(colRef, {
          ...newQuestionData,
          createdAt: serverTimestamp()
        });

        // Also append to the parent exam's questions array!
        await updateDoc(doc(db, 'exams', selectedExamForMCQs.id), {
          questions: arrayUnion({ id: docAdded.id, ...newQuestionData })
        });

        await logActivity("Question Management", `Appended new MCQ to pool for exam: "${selectedExamForMCQs.subject}"`, `Question: "${newQuestionData.text}"`);
        alert("MCQ successfully appended to pool database!");
      }

      // Reset text inputs, but retain subject & topic for faster bulk logging
      setPoolForm(prev => ({
        ...prev,
        text: '',
        options: { A: '', B: '', C: '', D: '' },
        answer: 'A'
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to save core MCQ component.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditPoolQuestion = (q: any) => {
    setEditingPoolQuestionId(q.id || null);
    setPoolForm({
      subject: q.subject || '',
      topic: q.topic || '',
      text: q.text || '',
      options: {
        A: q.options?.A || '',
        B: q.options?.B || '',
        C: q.options?.C || '',
        D: q.options?.D || '',
      },
      answer: q.answer || 'A',
      marks: q.marks || 1
    });
  };

  const handleDeletePoolQuestion = async (qId: string) => {
    if (!selectedExamForMCQs?.id || !qId) return;
    if (!confirm("Are you sure you want to permanently delete this MCQ from the pool?")) return;

    try {
      setLoading(true);
      await deleteDoc(doc(db, 'exams', selectedExamForMCQs.id, 'mcq_pool', qId));
      await logActivity("Question Management", `Deleted MCQ from pool for exam: "${selectedExamForMCQs.subject}"`, `Question ID: ${qId}`);

      // Also remove from parent exam's questions array
      const parentExam = exams.find(e => e.id === selectedExamForMCQs.id);
      if (parentExam) {
        const currentQuestions = parentExam.questions || [];
        const filteredQuestions = currentQuestions.filter(q => q.id !== qId);
        await updateDoc(doc(db, 'exams', selectedExamForMCQs.id), {
          questions: filteredQuestions
        });
      }

      alert("Question omitted from Exam pool repository!");
      if (editingPoolQuestionId === qId) {
        setEditingPoolQuestionId(null);
        setPoolForm({
          subject: '',
          topic: '',
          text: '',
          options: { A: '', B: '', C: '', D: '' },
          answer: 'A',
          marks: 1
        });
      }
    } catch (err) {
      console.error(err);
      alert("Error purging selected MCQ.");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAllExams = async () => {
    if (!confirm("This will synchronize all nested questions from the MCQ Pools into their respective parent exam records. Proceed?")) return;
    setLoading(true);
    let totalSynced = 0;
    try {
      for (const exam of exams) {
        if (!exam.id) continue;
        const colRef = collection(db, 'exams', exam.id, 'mcq_pool');
        const snap = await getDocs(colRef);
        const poolQuestions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
        
        if (poolQuestions.length > 0) {
          const merged = [...(exam.questions || [])];
          poolQuestions.forEach(pq => {
            if (!merged.some(q => q.text === pq.text)) {
              merged.push(pq);
            }
          });
          
          await updateDoc(doc(db, 'exams', exam.id), {
            questions: merged
          });
          totalSynced += poolQuestions.length;
        }
      }
      alert(`Database synchronized successfully! Merged and validated ${totalSynced} questions into parent exams.`);
    } catch (err) {
      console.error(err);
      alert("Error syncing database: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTopicExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamForMCQs?.id) return;
    if (!genForm.examName.trim() || !genForm.subject || !genForm.topic) {
      alert("Please configure dynamic Exam title, Subject, and Topic parameters!");
      return;
    }

    // Filter relevant matching MCQs
    const matchingMCQs = mcqPool.filter(
      q => q.subject?.toLowerCase() === genForm.subject.toLowerCase() &&
           q.topic?.toLowerCase() === genForm.topic.toLowerCase()
    );

    if (matchingMCQs.length === 0) {
      alert("Unable to generate. No MCQs currently classified under matched Subject & Topic node.");
      return;
    }

    if (genForm.count > matchingMCQs.length) {
      alert(`Invalid request size: requested ${genForm.count} but only ${matchingMCQs.length} questions exist in this topic. Please scale count down.`);
      return;
    }

    setLoading(true);
    try {
      // Shuffle & pick
      const shuffled = [...matchingMCQs].sort(() => Math.random() - 0.5);
      const drawnQuestions = shuffled.slice(0, genForm.count).map(q => ({
        text: q.text,
        options: q.options,
        answer: q.answer,
        marks: q.marks || 1
      }));

      // Create new publish doc
      await addDoc(collection(db, 'exams'), {
        subject: genForm.examName.trim(), // exam title
        topic: genForm.topic,
        timeLimit: genForm.timeLimit,
        price: genForm.price,
        isPublished: false, // Save as unpublished
        questions: drawnQuestions,
        createdAt: serverTimestamp()
      });

      alert(`সাফল্যের সাথে "${genForm.examName.trim()}" পরীক্ষাটি জেনারেট করা হয়েছে তবে এখনো পাবলিশ করা হয়নি (আনপাবলিশ অবস্থায় আছে)। পাবলিশ বাটনে ক্লিক করে এর সময় নির্ধারণপূর্বক স্টুডেন্টদের জন্য উন্মুক্ত করতে পারবেন।`);
      setGenForm({
        subject: '',
        topic: '',
        count: 10,
        timeLimit: 30,
        examName: '',
        price: 150
      });
    } catch (err) {
      console.error(err);
      alert("Compilation sequence failed for dynamic quiz.");
    } finally {
      setLoading(false);
    }
  };

  const totalExams = exams.length;
  const publishedExamsCount = exams.filter(e => e.isPublished).length;
  const totalStudents = users.length;
  const totalAssessments = results.length;
  const pendingPaymentsCount = payments.filter(p => p.status === 'pending').length;

  const averageAccuracy = results.length > 0 
    ? Math.round(results.reduce((acc, r) => acc + (parseFloat(r.percentage) || 0), 0) / results.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Admin Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 md:p-8 bg-surface border border-border/80 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="space-y-2.5 z-10">
          <div className="flex items-center gap-2.5">
            <span className="bg-accent/8 text-accent font-bold text-[9px] px-2.5 py-0.5 rounded-md uppercase tracking-wider">ICT MCQ Portal</span>
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-text-main">ADMIN CENTRAL DESK</h2>
          <p className="text-text-dim text-xs font-semibold uppercase tracking-wider leading-none">Global Operations & Database Management</p>
        </div>
        <button 
          onClick={onLogout}
          className="bg-danger/8 hover:bg-danger/12 border border-danger/10 text-danger px-4.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-all self-start sm:self-center cursor-pointer"
        >
          <LogOut size={13} className="opacity-80" /> Exit Console
        </button>
      </div>

      {/* Apex Grid Overview Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-surface border border-border/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden transition-all hover:border-accent/30 group">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Exam Dispatch Core</span>
            <h3 className="text-2xl font-black text-text-main font-mono flex items-baseline gap-1.5">
              <span>{publishedExamsCount}</span>
              <span className="text-[10px] font-semibold text-text-dim">/ {totalExams} Live</span>
            </h3>
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] text-text-dim/80 font-bold uppercase">
            <span>Published Units</span>
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-surface border border-border/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden transition-all hover:border-accent/30 group">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Registered Students</span>
            <h3 className="text-2xl font-black text-text-main font-mono">
              {totalStudents}
            </h3>
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] text-text-dim/80 font-bold uppercase">
            <span>Active Profiles</span>
            <span className="text-[9px] bg-accent/8 text-accent font-semibold px-1.5 py-0.5 rounded">Synced</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-surface border border-border/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden transition-all hover:border-accent/30 group">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Exam Performance Yield</span>
            <h3 className="text-2xl font-black text-text-main font-mono flex items-baseline gap-1.5">
              <span>{averageAccuracy}%</span>
              <span className="text-[9.5px] font-semibold text-success">Avg Precision</span>
            </h3>
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] text-text-dim/80 font-bold uppercase">
            <span>{totalAssessments} Submissions</span>
            <span className="w-2 h-1 bg-success/40 rounded-full" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-surface border border-border/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden transition-all hover:border-accent/30 group">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">bKash Verification Ledger</span>
            <h3 className={`text-2xl font-black font-mono flex items-baseline gap-1.5 ${pendingPaymentsCount > 0 ? 'text-amber-600' : 'text-text-main'}`}>
              <span>{pendingPaymentsCount}</span>
              <span className="text-[10px] font-semibold text-text-dim">Pending Approval</span>
            </h3>
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] text-text-dim/80 font-bold uppercase">
            <span>Audited Files</span>
            {pendingPaymentsCount > 0 ? (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
            )}
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-surface border border-border/80 rounded-2xl shadow-sm">
        {[
          { id: 'exams', label: 'Manage MCQ Exams', count: `${publishedExamsCount} live`, icon: Layers },
          { id: 'users', label: 'Registered Students', count: `${totalStudents} profiles`, icon: Users },
          { id: 'paid_users', label: 'Paid Users (পেইড ইউজার)', count: `${users.filter(u => u.isPaidUser === true || (u.purchasedExamIds && u.purchasedExamIds.length > 0)).length} active`, icon: Sparkles },
          { id: 'results', label: 'Exam Results', count: `${totalAssessments} records`, icon: HistoryIcon },
          { id: 'payments', label: 'BKash Ledger', count: pendingPaymentsCount > 0 ? `${pendingPaymentsCount} action pending` : 'All cleared', icon: CreditCard, alert: pendingPaymentsCount > 0 },
          { id: 'routines', label: 'Exam Routines', count: `${routines.length} items`, icon: Calendar },
          { id: 'settings', label: 'Portal Logo/Branding', count: 'Branded', icon: Settings },
          { id: 'admins', label: 'Admin Management', count: `${adminsList.length + 1} users`, icon: ShieldCheck },
          { id: 'logs', label: 'Activity Logs (অ্যাক্টিভিটি লগ)', count: `${activityLogs.length} events`, icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setEditingExamId(null);
              setEditingUserId(null);
            }}
            className={`flex-1 min-w-[200px] flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold tracking-wider transition-all duration-150 uppercase cursor-pointer border ${
              activeTab === tab.id
                ? 'bg-accent/8 border-accent/20 text-accent font-extrabold shadow-sm'
                : 'text-text-dim bg-transparent hover:text-text-main hover:bg-surface-hover/80 border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <tab.icon size={14} className={activeTab === tab.id ? 'text-accent' : 'text-text-dim'} />
              <span>{tab.label}</span>
            </div>
            <span className={`text-[9px] px-2 py-0.5 rounded-md font-mono ${
              activeTab === tab.id 
                ? 'bg-accent/15 text-accent' 
                : tab.alert
                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                  : 'bg-surface-hover text-text-dim/80 border border-border/50'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* EXAMS TAB */}
        {activeTab === 'exams' && (
          selectedExamForMCQs ? (
            <motion.div
              key="mcq-pool-manager"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Back Button & Header */}
              <div className="bg-surface border border-border rounded-[2.5rem] p-6 md:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setSelectedExamForMCQs(null);
                      setPoolForm({ subject: '', topic: '', text: '', options: { A: '', B: '', C: '', D: '' }, answer: 'A', marks: 1 });
                      setEditingPoolQuestionId(null);
                    }}
                    className="p-2 px-4 rounded-xl bg-surface-hover hover:bg-bg border border-border text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 transition-all text-accent cursor-pointer"
                  >
                    ← Back to Exams List (তালিকায় ফিরে যান)
                  </button>
                  <h3 className="text-2xl font-black text-text-main flex flex-wrap items-center gap-2 pt-2">
                    <span className="text-accent uppercase font-mono text-sm block tracking-widest bg-accent/10 px-3 py-1 rounded-full">{selectedExamForMCQs.subject}</span>
                    <span className="italic">MCQ Bank Database Manager</span>
                  </h3>
                  <p className="text-xs uppercase text-text-dim font-black tracking-widest">
                    ADD AND MANUALLY EDIT SUBJECT/TOPIC-WISE MCQS & COMPILE RANDOMIZED EXAMS
                  </p>
                </div>
                <div className="bg-success/10 border border-success/25 rounded-2xl p-4 text-center min-w-[150px] self-start md:self-center">
                  <span className="text-[10px] uppercase font-black text-success tracking-widest block">Pool Size</span>
                  <span className="text-3xl font-black text-success font-mono">{mcqPool.length}</span>
                  <span className="text-[9px] block text-success/80 font-bold mt-1">Questions available</span>
                </div>
              </div>

              {/* Bento Grid Content */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left panel for Add Question & Dynamic Exam builder */}
                <div className="lg:col-span-5 space-y-8">
                  
                  {/* BOX A: ADD/EDIT MCQ */}
                  <div className="bg-surface border border-border rounded-[2.5rem] p-6 md:p-8 shadow-2xl space-y-6">
                    <h4 className="text-lg font-black italic text-text-main flex items-center gap-2">
                      <Plus className="text-success" size={20} />
                      <span>{editingPoolQuestionId ? 'মডিফাই করুন / EDIT MCQ' : 'এমসিকিউ যুক্ত করুন / ADD MCQ'}</span>
                    </h4>

                    <form onSubmit={handleSavePoolQuestion} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-text-dim uppercase tracking-wider block">Subject (বিষয়)</label>
                          <input
                            type="text"
                            value={poolForm.subject}
                            onChange={e => setPoolForm({ ...poolForm, subject: e.target.value })}
                            className="w-full bg-surface-hover border border-border rounded-xl p-3 outline-none focus:border-accent font-bold text-xs"
                            placeholder="e.g., Network"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-text-dim uppercase tracking-wider block">Topic / Chapter (টপিক)</label>
                          <input
                            type="text"
                            value={poolForm.topic}
                            onChange={e => setPoolForm({ ...poolForm, topic: e.target.value })}
                            className="w-full bg-surface-hover border border-border rounded-xl p-3 outline-none focus:border-accent font-bold text-xs"
                            placeholder="e.g., Protocol"
                            required
                          />
                        </div>
                      </div>

                      {/* Helper Quick Subject/Topic tag recommendation */}
                      {mcqPool.length > 0 && (
                        <div className="text-[10px] text-text-dim space-y-1 bg-bg border border-border/60 p-2.5 rounded-xl">
                          <p className="font-bold uppercase tracking-wider">Quick Select categories from pool:</p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {Array.from(new Set(mcqPool.map(q => q.subject || '').filter(Boolean))).map((sub) => (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => setPoolForm(prev => ({ ...prev, subject: sub }))}
                                className="bg-surface hover:bg-surface-hover border border-border text-[9px] px-2 py-0.5 rounded font-semibold text-accent transition-all cursor-pointer"
                              >
                                {sub}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-dim uppercase tracking-wider block">Question Statement (এমসিকিউ প্রশ্ন)</label>
                        <textarea
                          value={poolForm.text}
                          onChange={e => setPoolForm({ ...poolForm, text: e.target.value })}
                          className="w-full bg-surface-hover border border-border rounded-xl p-3 outline-none focus:border-accent text-xs font-semibold h-20 resize-none"
                          placeholder="Type question/query statement..."
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {['A', 'B', 'C', 'D'].map((opt) => (
                          <div key={opt} className="space-y-1">
                            <label className="text-[10px] font-mono font-black text-text-dim uppercase block">Option {opt}</label>
                            <input
                              type="text"
                              value={(poolForm.options as any)[opt]}
                              onChange={e => setPoolForm({
                                ...poolForm,
                                options: { ...poolForm.options, [opt]: e.target.value }
                              })}
                              className="w-full bg-surface-hover border border-border rounded-xl p-2.5 outline-none text-xs text-text-main font-bold focus:border-accent"
                              placeholder={`Option ${opt}`}
                              required
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-text-dim uppercase block">Correct Answer Key</label>
                          <select
                            value={poolForm.answer}
                            onChange={e => setPoolForm({ ...poolForm, answer: e.target.value as any })}
                            className="w-full bg-surface-hover border border-border rounded-xl p-2.5 outline-none text-xs text-text-main font-black focus:border-accent"
                          >
                            <option value="A">Answer Option A</option>
                            <option value="B">Answer Option B</option>
                            <option value="C">Answer Option C</option>
                            <option value="D">Answer Option D</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-text-dim uppercase block">Marks for Question</label>
                          <input
                            type="number"
                            value={poolForm.marks}
                            onChange={e => setPoolForm({ ...poolForm, marks: parseInt(e.target.value) || 1 })}
                            className="w-full bg-surface-hover border border-border rounded-xl p-2.5 outline-none text-xs text-text-main font-mono font-bold focus:border-accent"
                            min="1"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        {editingPoolQuestionId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPoolQuestionId(null);
                              setPoolForm({ subject: '', topic: '', text: '', options: { A: '', B: '', C: '', D: '' }, answer: 'A', marks: 1 });
                            }}
                            className="w-1/3 bg-surface-hover border border-border hover:bg-danger/10 hover:text-danger font-black py-3 rounded-xl transition-all text-xs uppercase"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 bg-success hover:bg-success/90 text-white font-black py-3.5 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg shadow-success/15 disabled:opacity-50 cursor-pointer"
                        >
                          {editingPoolQuestionId ? 'UPDATE MCQ IN POOL' : 'ADD MCQ TO POOL'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* BOX B: DYNAMIC EXAM GENERATOR */}
                  <div className="bg-surface border-4 border-dotted border-accent/40 rounded-[2.5rem] p-6 md:p-8 shadow-2xl space-y-6">
                    <div className="space-y-1">
                      <h4 className="text-lg font-black italic text-text-main flex items-center gap-2">
                        <Sparkles className="text-accent" size={20} />
                        <span>র‍্যান্ডম এক্মাম জেনারেটর / DYNAMIC GENERATOR</span>
                      </h4>
                      <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest">
                        COMPILE TOPIC EXAMS AUTOMATICALLY IN ONE-CLICK
                      </p>
                    </div>

                    <form onSubmit={handleGenerateTopicExam} className="space-y-4">
                      {/* Select Subject */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-dim uppercase tracking-wider block">1. Select Target Subject</label>
                        <select
                          value={genForm.subject}
                          onChange={e => {
                            const sub = e.target.value;
                            setGenForm(prev => ({ ...prev, subject: sub, topic: '' }));
                          }}
                          className="w-full bg-surface-hover border border-border rounded-xl p-3 outline-none text-xs text-text-main font-bold focus:border-accent"
                          required
                        >
                          <option value="">-- Choose Subject from Database --</option>
                          {Array.from(new Set(mcqPool.map(q => q.subject || '').filter(Boolean))).map((sub) => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>

                      {/* Select Topic */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-dim uppercase tracking-wider block">2. Select Target Topic</label>
                        <select
                          value={genForm.topic}
                          onChange={e => setGenForm(prev => ({ ...prev, topic: e.target.value }))}
                          className="w-full bg-surface-hover border border-border rounded-xl p-3 outline-none text-xs text-text-main font-bold focus:border-accent"
                          disabled={!genForm.subject}
                          required
                        >
                          <option value="">-- Choose Topic --</option>
                          {genForm.subject && Array.from(new Set(mcqPool.filter(q => q.subject?.toLowerCase() === genForm.subject.toLowerCase()).map(q => q.topic || '').filter(Boolean))).map((top) => (
                            <option key={top} value={top}>{top}</option>
                          ))}
                        </select>
                      </div>

                      {/* Matching pool info overlay */}
                      {genForm.subject && genForm.topic && (
                        <div className="bg-bg border border-border text-xs p-3.5 rounded-xl font-semibold space-y-1.5">
                          <p className="text-text-dim font-bold uppercase text-[9px] tracking-widest">Relational statistics:</p>
                          <p className="text-text-main flex items-center justify-between">
                            <span>Questions added in Topic Pool:</span>
                            <span className="font-mono font-black text-accent">
                              {mcqPool.filter(q => q.subject?.toLowerCase() === genForm.subject.toLowerCase() && q.topic?.toLowerCase() === genForm.topic.toLowerCase()).length} MCQs
                            </span>
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-text-dim uppercase block">3. Questions Count</label>
                          <input
                            type="number"
                            value={genForm.count}
                            onChange={e => setGenForm({ ...genForm, count: parseInt(e.target.value) || 1 })}
                            className="w-full bg-surface-hover border border-border rounded-xl p-3 outline-none text-xs text-text-main font-semibold"
                            min="1"
                            placeholder="e.g., 10"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-text-dim uppercase block">4. Time Limit (Minutes)</label>
                          <input
                            type="number"
                            value={genForm.timeLimit}
                            onChange={e => setGenForm({ ...genForm, timeLimit: parseInt(e.target.value) || 1 })}
                            className="w-full bg-surface-hover border border-border rounded-xl p-3 outline-none text-xs text-text-main font-semibold"
                            min="1"
                            placeholder="Minutes"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 col-span-2">
                          <label className="text-[10px] font-black text-text-dim uppercase block">5. New Exam Title (পরীক্ষার নাম)</label>
                          <input
                            type="text"
                            value={genForm.examName}
                            onChange={e => setGenForm({ ...genForm, examName: e.target.value })}
                            className="w-full bg-surface-hover border border-border rounded-xl p-3 outline-none text-xs text-text-main font-bold"
                            placeholder="e.g., Computer Networking Protocol Model Test"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-dim uppercase block">6. Entrance Fee (৳ BDT price)</label>
                        <input
                          type="number"
                          value={genForm.price}
                          onChange={e => setGenForm({ ...genForm, price: parseInt(e.target.value) || 0 })}
                          className="w-full bg-surface-hover border border-border rounded-xl p-3 outline-none text-xs text-text-main font-mono font-bold"
                          min="0"
                          placeholder="Price in BDT"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !genForm.subject || !genForm.topic}
                        className="w-full bg-accent hover:bg-accent2 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-accent/15 text-xs uppercase tracking-widest disabled:opacity-45 cursor-pointer"
                      >
                        ⚡ Generate & Publish Topic Exam
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right panel for list of pool questions with filters */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-surface border border-border rounded-[2.5rem] p-6 md:p-8 shadow-2xl min-h-[700px] flex flex-col">
                    
                    {/* Header + Filters */}
                    <div className="flex flex-col gap-4 border-b border-border pb-6 mb-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-black text-text-main italic flex items-center gap-2">
                          <Layers className="text-accent" />
                          <span>সংগৃহীত এমসিকিউ তালিকা / SELECTED EXAM MCQ POOL</span>
                        </h4>
                        <span className="bg-accent/10 border border-accent/20 text-accent font-mono font-black text-[10px] py-1 px-3 rounded-full">
                          {mcqPool.length} in Pool
                        </span>
                      </div>

                      {/* Realtime filter inputs */}
                      <div className="grid grid-cols-2 gap-3 bg-bg border border-border p-3.5 rounded-2xl">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-text-dim uppercase tracking-wider block">Filter Subject</span>
                          <select
                            value={poolFilters.subject}
                            onChange={e => setPoolFilters({ ...poolFilters, subject: e.target.value, topic: '' })}
                            className="w-full bg-surface border border-border/70 rounded-lg p-2 outline-none text-[11px] font-semibold text-text-main"
                          >
                            <option value="">All Subjects (সাবজেক্ট ফিল্টার)</option>
                            {Array.from(new Set(mcqPool.map(q => q.subject || '').filter(Boolean))).map((sub) => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-text-dim uppercase tracking-wider block">Filter Topic</span>
                          <select
                            value={poolFilters.topic}
                            onChange={e => setPoolFilters({ ...poolFilters, topic: e.target.value })}
                            className="w-full bg-surface border border-border/70 rounded-lg p-2 outline-none text-[11px] font-semibold text-text-main"
                            disabled={!poolFilters.subject}
                          >
                            <option value="">All Topics (টপিক ফিল্টার)</option>
                            {poolFilters.subject && Array.from(new Set(mcqPool.filter(q => q.subject?.toLowerCase() === poolFilters.subject.toLowerCase()).map(q => q.topic || '').filter(Boolean))).map((top) => (
                              <option key={top} value={top}>{top}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Question scroll space */}
                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[850px]">
                      {mcqPool
                        .filter(q => !poolFilters.subject || q.subject?.toLowerCase() === poolFilters.subject.toLowerCase())
                        .filter(q => !poolFilters.topic || q.topic?.toLowerCase() === poolFilters.topic.toLowerCase())
                        .map((q, idx) => (
                          <div key={q.id || idx} className="bg-bg border border-border hover:border-accent/40 rounded-2xl p-5 transition-all space-y-3 relative group">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1.5 flex-1 pr-6">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="bg-accent/15 text-accent font-black text-[9px] px-2.5 py-0.5 rounded uppercase font-mono tracking-wider">{q.subject}</span>
                                  <span className="bg-success/15 text-success font-black text-[9px] px-2.5 py-0.5 rounded uppercase font-mono tracking-wider">Chapter: {q.topic}</span>
                                  <span className="bg-text-dim/10 text-text-dim font-black text-[9px] px-2 py-0.5 rounded font-mono">Marks: {q.marks || 1}</span>
                                </div>
                                <h5 className="font-black text-text-main text-xs leading-relaxed md:text-sm">
                                  {idx + 1}. {q.text}
                                </h5>
                              </div>

                              <div className="flex items-center gap-1.5 self-start shrink-0">
                                <button
                                  onClick={() => handleEditPoolQuestion(q)}
                                  className="p-2 text-text-dim hover:text-accent hover:bg-accent/15 border border-border rounded-xl transition-all cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => q.id && handleDeletePoolQuestion(q.id)}
                                  className="p-2 text-text-dim hover:text-danger hover:bg-danger/15 border border-border rounded-xl transition-all cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            {/* Options grid info block */}
                            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                              {['A', 'B', 'C', 'D'].map((key) => {
                                const isCorrect = q.answer === key;
                                const optionText = q.options ? (q.options as any)[key] : '';
                                return (
                                  <div
                                    key={key}
                                    className={`p-2 rounded-lg border flex items-center gap-1.5 font-semibold ${
                                      isCorrect
                                        ? 'bg-success/10 border-success/30 text-success font-bold'
                                        : 'bg-surface border-border text-text-dim'
                                    }`}
                                  >
                                    <span className="font-mono font-black">{key}:</span>
                                    <span>{optionText || 'N/A'}</span>
                                    {isCorrect && <Check size={11} className="ml-auto" />}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                      {mcqPool.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-36 border-2 border-dashed border-border rounded-[2.5rem] text-text-dim text-center">
                          <Layers size={50} className="opacity-15 mb-4" />
                          <p className="font-bold uppercase text-[13px] tracking-wider">MCQ Pool is Currently Empty</p>
                          <p className="text-xs max-w-xs mt-1">Populate this pool database by adding MCQ questions on the Left form panel!</p>
                        </div>
                      )}

                      {mcqPool.length > 0 && 
                        mcqPool
                          .filter(q => !poolFilters.subject || q.subject?.toLowerCase() === poolFilters.subject.toLowerCase())
                          .filter(q => !poolFilters.topic || q.topic?.toLowerCase() === poolFilters.topic.toLowerCase())
                          .length === 0 && (
                          <div className="text-center py-20 text-text-dim text-xs font-bold uppercase italic">
                            No MCQs match your filter criteria.
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="exams-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
            {/* Exam Creator Form */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-surface border border-border/80 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
                <h3 className="text-base font-extrabold flex items-center gap-2 mb-6 text-text-main uppercase tracking-wider">
                  <Plus size={16} className="text-accent" />
                  <span>{editingExamId ? 'Edit MCQ Exam' : 'Build MCQ Exam'}</span>
                </h3>
                <form onSubmit={handleSaveExam} className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Exam Name (পরীক্ষার নাম)</label>
                      <input
                        type="text"
                        value={examForm.subject}
                        onChange={e => setExamForm({ ...examForm, subject: e.target.value })}
                        className="w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 outline-none focus:border-accent text-xs font-semibold focus:bg-surface focus:ring-2 focus:ring-accent/10 transition-all"
                        placeholder="e.g., HSC Final Model Test"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Topic / Description (টপিক্স / বিবরণী)</label>
                      <textarea
                        value={examForm.topic}
                        onChange={e => setExamForm({ ...examForm, topic: e.target.value })}
                        className="w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 outline-none focus:border-accent text-xs font-semibold focus:bg-surface focus:ring-2 focus:ring-accent/10 transition-all h-20 resize-none"
                        placeholder="e.g., protocols — Verified continuous evaluation curriculum matching central academy standards."
                      />
                      <p className="text-[9px] text-text-dim/80 font-bold leading-normal mt-1 block">
                        * এটি হোমপেজে এই পরীক্ষার Topic: ... এর জায়গায় দেখাবে।
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Price (BDT ৳)</label>
                      <input
                        type="number"
                        value={examForm.price}
                        onChange={e => setExamForm({ ...examForm, price: parseInt(e.target.value) || 0 })}
                        className="w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 outline-none focus:border-accent font-mono text-xs font-semibold focus:bg-surface focus:ring-2 focus:ring-accent/10 transition-all"
                        min="0"
                        placeholder="Enter BDT amount"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-surface-hover/80 border border-border/50 p-3 rounded-xl">
                    <input
                      id="publish-check"
                      type="checkbox"
                      checked={examForm.isPublished}
                      onChange={e => setExamForm({ ...examForm, isPublished: e.target.checked })}
                      className="w-4 h-4 rounded text-accent focus:ring-accent bg-bg border-border"
                    />
                    <label htmlFor="publish-check" className="text-xs font-bold text-text-main cursor-pointer uppercase tracking-wider">Publish Immediately</label>
                  </div>

                  <div className="border-t border-border/60 pt-4">
                    <h4 className="text-[10px] font-extrabold uppercase text-text-dim tracking-wider mb-3 flex items-center justify-between">
                      <span>Add Exam Questions</span>
                      <span className="bg-accent/8 text-accent font-extrabold px-2 py-0.5 rounded text-[9px] font-mono">{examQuestions.length} added</span>
                    </h4>
                    <div className="space-y-3 bg-bg border border-border/60 p-4 rounded-xl relative">
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold text-text-dim uppercase tracking-wider">Question Text</label>
                        <textarea
                          value={currentQuestion.text}
                          onChange={e => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                          className="w-full bg-surface border border-border/60 rounded-lg p-2 outline-none text-xs text-text-main font-semibold resize-none h-14 focus:border-accent transition-all"
                          placeholder="Type MCQ Statement..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {['A', 'B', 'C', 'D'].map((opt) => (
                          <div key={opt}>
                            <label className="text-[9px] font-mono font-bold text-text-dim uppercase block">Option {opt}</label>
                            <input
                              type="text"
                              value={(currentQuestion.options as any)[opt]}
                              onChange={e => setCurrentQuestion({
                                ...currentQuestion,
                                options: { ...currentQuestion.options, [opt]: e.target.value }
                              })}
                              className="w-full bg-surface border border-border/60 rounded-lg p-1.5 outline-none text-xs text-text-main font-semibold focus:border-accent transition-all"
                              placeholder={`Option ${opt}`}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-extrabold text-text-dim uppercase block">Correct Answer</label>
                          <select
                            value={currentQuestion.answer}
                            onChange={e => setCurrentQuestion({ ...currentQuestion, answer: e.target.value as any })}
                            className="w-full bg-surface border border-border/60 rounded-lg p-1.5 outline-none text-xs text-text-main font-bold focus:border-accent cursor-pointer"
                          >
                            <option value="A">Answer A</option>
                            <option value="B">Answer B</option>
                            <option value="C">Answer C</option>
                            <option value="D">Answer D</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold text-text-dim uppercase block">Marks</label>
                          <input
                            type="number"
                            value={currentQuestion.marks}
                            onChange={e => setCurrentQuestion({ ...currentQuestion, marks: parseInt(e.target.value) || 1 })}
                            className="w-full bg-surface border border-border/60 rounded-lg p-1.5 outline-none text-xs text-text-main font-mono font-bold focus:border-accent"
                            min="1"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddQuestionToExam}
                        className="w-full bg-surface hover:bg-surface-hover border border-border/80 hover:border-accent hover:text-accent font-extrabold py-2 rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                      >
                        + Append to Question Inventory
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {editingExamId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingExamId(null);
                          setExamForm({ subject: '', topic: '', timeLimit: 30, price: 150, isPublished: true });
                          setExamQuestions([]);
                        }}
                        className="w-1/3 bg-surface border border-border hover:bg-danger/8 hover:text-danger hover:border-danger/20 font-bold py-3 rounded-xl transition-all text-xs uppercase cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className={`flex-1 bg-accent hover:bg-accent2 text-white font-extrabold py-3 rounded-xl transition-all shadow-sm text-xs uppercase tracking-wider font-mono cursor-pointer ${loading ? 'opacity-50' : ''}`}
                    >
                      {editingExamId ? 'UPDATE EXAM' : 'PUBLISH EXAM'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Temp list of drafted questions inside creator */}
              {examQuestions.length > 0 && (
                <div className="bg-surface border border-border rounded-3xl p-6 shadow-xl space-y-3">
                  <h4 className="text-xs font-black uppercase text-accent tracking-wider">Exam Questions List ({examQuestions.length})</h4>
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {examQuestions.map((q, idx) => (
                      <div key={idx} className="bg-bg border border-border p-3.5 rounded-xl flex items-center justify-between text-xs">
                        <div className="space-y-1 flex-1 pr-4">
                          <p className="font-bold text-text-main leading-snug">{idx + 1}. {q.text}</p>
                          <p className="font-semibold text-success font-mono text-[10px]">Answer: {q.answer} | Marks: {q.marks}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestionFromExam(idx)}
                          className="text-text-dim hover:text-danger transition-all p-1.5"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Exams list display */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-surface border border-border/80 rounded-2xl p-6 md:p-8 shadow-sm min-h-[600px] flex flex-col">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                  <h3 className="text-base font-extrabold flex items-center gap-2 text-text-main uppercase tracking-wider">
                    <Layers className="text-accent" size={16} />
                    <span>Created Exams Inventory</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSyncAllExams}
                      className="bg-accent/10 hover:bg-accent/25 border border-accent/25 text-accent font-black text-[10px] py-1 px-3 rounded-lg uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                      disabled={loading}
                      title="Merge subcollection Questions to the main Exam documents"
                    >
                      🔄 Sync MCQ Pools
                    </button>
                    <span className="bg-accent/8 border border-accent/15 text-accent font-mono font-bold text-[10px] py-1 px-3 rounded-md uppercase tracking-wider">
                      {exams.length} Exams
                    </span>
                  </div>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {exams.map((exam) => (
                    <div key={exam.id} className="bg-surface border border-border/70 hover:border-accent/40 rounded-xl p-5 hover:bg-surface-hover/20 transition-all space-y-4 group">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-accent/8 text-accent font-extrabold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-mono">Exam Dispatch Node</span>
                            <span className={`font-mono text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1.5 ${exam.isPublished ? 'bg-success/8 text-success border border-success/10' : 'bg-text-dim/8 text-text-dim border border-border/50'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${exam.isPublished ? 'bg-success' : 'bg-text-dim'}`} />
                              {exam.isPublished ? 'Live' : 'Draft'}
                            </span>
                          </div>
                          <h4 className="text-base font-extrabold text-text-main leading-tight">
                            {exam.subject}
                          </h4>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-left md:text-right bg-surface-hover border border-border/60 px-3 py-1.5 rounded-xl">
                            <p className="text-[8px] font-bold uppercase text-text-dim/80 tracking-wider">ENTRANCE TOLL</p>
                            <h5 className="text-sm font-black text-accent font-mono">৳{exam.price} BDT</h5>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 pt-3.5 border-t border-border/60">
                        <div className="text-[11px] font-semibold text-text-dim flex items-center gap-1.5">
                          <Tag size={12} className="text-accent opacity-80" />
                          <span>Structure: <span className="font-bold text-text-main">{exam.questions?.length || 0} Questions</span>, marks total: <span className="font-bold text-text-main">{exam.questions?.reduce((acc, q) => acc + (q.marks || 1), 0) || 0}</span></span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => {
                              setSelectedExamForMCQs(exam);
                              setPoolForm({
                                subject: exam.subject || '',
                                topic: exam.topic || '',
                                text: '',
                                options: { A: '', B: '', C: '', D: '' },
                                answer: 'A',
                                marks: 1
                              });
                              setPoolFilters({
                                subject: exam.subject || '',
                                topic: ''
                              });
                            }}
                            className="bg-success text-white hover:bg-success/90 font-bold px-3 py-2 rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-sm border border-success/10"
                            title="Manage MCQs under this Exam"
                          >
                            <Plus size={11} /> MCQ Pool Manager
                          </button>
                          <button
                            onClick={() => handleTogglePublishExam(exam)}
                            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                              exam.isPublished 
                                ? 'bg-warning/8 border-warning/10 text-warning hover:bg-warning/15' 
                                : 'bg-success/8 border-success/10 text-success hover:bg-success/15'
                            }`}
                          >
                            {exam.isPublished ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            onClick={() => handleEditExam(exam)}
                            className="bg-surface-hover hover:bg-accent/8 hover:text-accent hover:border-accent/20 border border-border/70 text-text-dim p-2 rounded-xl transition-all cursor-pointer"
                            title="Edit Exam"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => exam.id && handleDeleteExam(exam.id)}
                            className="bg-surface-hover hover:bg-danger/8 hover:text-danger hover:border-danger/20 border border-border/70 text-text-dim p-2 rounded-xl transition-all cursor-pointer"
                            title="Delete Exam"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {exams.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 border border-dashed border-border rounded-2xl text-text-dim text-center bg-surface-hover/30">
                      <Layers size={40} className="opacity-15 mb-4" />
                      <p className="font-extrabold uppercase text-[12px] tracking-wider text-text-main">No MCQ Exams Built</p>
                      <p className="text-xs max-w-xs mt-1 text-text-dim/80">Configure categories and questions on the registry to publish your first assessment panel.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <motion.div
            key="users-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Student Registration Form */}
            <div className="lg:col-span-4">
              <div className="bg-surface border border-border/80 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 relative overflow-hidden">
                <h3 className="text-base font-extrabold flex items-center gap-2 text-text-main uppercase tracking-wider">
                  <UserPlus size={16} className="text-accent" /> 
                  <span>{editingUserId ? 'Edit Student Profile' : 'Register Student'}</span>
                </h3>
                <form onSubmit={handleSaveUser} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Student Name</label>
                    <input
                      type="text"
                      value={userForm.name}
                      onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                      className="w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 outline-none focus:border-accent text-xs font-semibold focus:bg-surface focus:ring-2 focus:ring-accent/10 transition-all"
                      placeholder="e.g., Abir Hasan"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Login ID</label>
                      <input
                        type="text"
                        value={userForm.userId}
                        onChange={e => setUserForm({ ...userForm, userId: e.target.value })}
                        className="w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 outline-none focus:border-accent text-xs font-bold font-mono focus:bg-surface focus:ring-2 focus:ring-accent/10 transition-all disabled:opacity-50"
                        placeholder="e.g., abir123"
                        disabled={!!editingUserId}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Passcode</label>
                      <input
                        type="text"
                        value={userForm.password}
                        onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                        className="w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 outline-none focus:border-accent text-xs font-bold font-mono focus:bg-surface focus:ring-2 focus:ring-accent/10 transition-all"
                        placeholder="Passcode"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Phone No</label>
                    <input
                      type="text"
                      value={userForm.phone}
                      onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                      className="w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 outline-none focus:border-accent text-xs font-semibold focus:bg-surface focus:ring-2 focus:ring-accent/10 transition-all"
                      placeholder="e.g., 01712345678"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block font-mono">Email Address</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                      className="w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 outline-none focus:border-accent text-xs font-semibold focus:bg-surface focus:ring-2 focus:ring-accent/10 transition-all"
                      placeholder="e.g., abir@gmail.com"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Institution</label>
                    <input
                      type="text"
                      value={userForm.institution}
                      onChange={e => setUserForm({ ...userForm, institution: e.target.value })}
                      className="w-full bg-surface-hover/50 border border-border/60 rounded-xl p-3 outline-none focus:border-accent text-xs font-semibold focus:bg-surface focus:ring-2 focus:ring-accent/10 transition-all"
                      placeholder="e.g., Dhaka College"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    {editingUserId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUserId(null);
                          setUserForm({ userId: '', password: '', name: '', phone: '', email: '', institution: '' });
                        }}
                        className="w-1/3 bg-surface border border-border hover:bg-danger/8 hover:text-danger hover:border-danger/20 font-bold py-3 rounded-xl transition-all text-xs uppercase cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-accent hover:bg-accent2 text-white font-extrabold py-3 rounded-xl shadow-sm text-xs uppercase tracking-wider cursor-pointer"
                    >
                      {editingUserId ? 'UPDATE PROFILE' : 'SAVE REGISTERED STUDENT'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Student Database Inventory */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-surface border border-border/80 rounded-2xl p-6 md:p-8 shadow-sm md:min-h-[600px] flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="text-base font-extrabold flex items-center gap-2 text-text-main uppercase tracking-wider">
                    <Users className="text-accent" size={16} /> 
                    <span>Registered Student Directory</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportAllStudentsToExcel}
                      className="flex items-center gap-1.5 bg-accent/8 hover:bg-accent/15 border border-accent/30 text-accent font-bold text-[10px] py-1.5 px-3 rounded-xl uppercase tracking-wider cursor-pointer transition-all"
                      title="Download complete registered student list as an Excel/CSV file"
                    >
                      <Download size={12} className="text-accent" />
                      <span>Export All Students</span>
                    </button>
                    <span className="bg-accent/8 border border-accent/15 text-accent font-mono font-bold text-[10px] py-1.5 px-3 rounded-xl uppercase tracking-wider">
                      {users.length} Active Profiles
                    </span>
                  </div>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {users.map((user) => (
                    <div key={user.id} className="bg-surface border border-border/70 hover:border-accent/30 rounded-xl p-5 hover:bg-surface-hover/10 transition-all space-y-4 group">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-base font-extrabold text-text-main flex items-center gap-2">
                            {user.name}
                            <span className="bg-surface border border-border/80 font-mono font-bold text-[9px] px-2 py-0.5 rounded text-accent">ID: {user.userId}</span>
                          </h4>
                          <p className="text-xs font-bold text-text-dim uppercase tracking-wider">{user.institution}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-text-main">
                          <div>
                            <span className="text-text-dim/80 text-[9px] uppercase font-bold tracking-wider block">Phone No</span>
                            <span className="font-semibold font-mono">{user.phone || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-text-dim/80 text-[9px] uppercase font-bold tracking-wider block">Email Address</span>
                            <span className="font-semibold">{user.email || 'N/A'}</span>
                          </div>
                          <div className="col-span-2 pt-2 border-t border-border/60 mt-1">
                            <span className="text-text-dim/80 text-[9px] uppercase font-bold tracking-wider">Unsealed Passcode: </span>
                            <span className="font-mono font-extrabold text-accent bg-accent/8 px-1.5 py-0.5 rounded">{user.password}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3.5 border-t border-border/60">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-accent tracking-wider bg-surface-hover px-2.5 py-1 rounded border border-border/50">
                          <CreditCard size={11} className="text-accent" />
                          <span>Exam Purchases: {user.purchasedExamIds?.length || 0} active</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="bg-surface-hover hover:bg-accent/8 hover:text-accent hover:border-accent/20 border border-border/70 text-text-dim p-2 rounded-xl transition-all cursor-pointer"
                            title="Edit Student info"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => user.id && handleDeleteUser(user.id)}
                            className="bg-surface-hover hover:bg-danger/8 hover:text-danger hover:border-danger/20 border border-border/70 text-text-dim p-2 rounded-xl transition-all cursor-pointer"
                            title="Delete Student"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {users.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 border border-dashed border-border rounded-xl text-text-dim text-center bg-surface-hover/30">
                      <Users size={40} className="opacity-15 mb-4" />
                      <p className="font-extrabold uppercase text-[12px] tracking-wider text-text-main">No Students Registered</p>
                      <p className="text-xs max-w-xs mt-1 text-text-dim/80">Active student accounts will show up here. Use the dispatch left form to log a profile.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* PAID USERS TAB */}
        {activeTab === 'paid_users' && (
          <motion.div
            key="paid-users-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Statistics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-sm space-y-1">
                <span className="text-[10px] font-black text-text-dim uppercase tracking-wider block">Total Students (মোট শিক্ষার্থী)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-text-main font-mono">{users.length}</span>
                  <span className="text-xs text-text-dim font-bold font-sans">profiles</span>
                </div>
              </div>
              <div className="bg-surface border border-border/80 border-l-4 border-l-success rounded-2xl p-5 shadow-sm space-y-1">
                <span className="text-[10px] font-black text-text-dim uppercase tracking-wider block">Full Access Members (পূর্ণ অ্যাক্সেসধারী)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-success font-mono">
                    {users.filter(u => u.isPaidUser === true).length}
                  </span>
                  <span className="text-xs text-text-dim font-bold font-sans">All Paid Exams</span>
                </div>
              </div>
              <div className="bg-surface border border-border/80 border-l-4 border-l-accent rounded-2xl p-5 shadow-sm space-y-1">
                <span className="text-[10px] font-black text-text-dim uppercase tracking-wider block font-sans">Selective Access Members (সিলেক্টিভ অ্যাক্সেসধারী)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-accent font-mono">
                    {users.filter(u => u.isPaidUser !== true && u.purchasedExamIds && u.purchasedExamIds.length > 0).length}
                  </span>
                  <span className="text-xs text-text-dim font-bold font-sans font-sans">Specific Exams</span>
                </div>
              </div>
              <div className="bg-surface border border-border/80 border-l-4 border-l-text-dim rounded-2xl p-5 shadow-sm space-y-1 font-sans">
                <span className="text-[10px] font-black text-text-dim uppercase tracking-wider block">No Premium Access (কোনো অ্যাক্সেস নেই)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-text-dim font-mono">
                    {users.filter(u => u.isPaidUser !== true && (!u.purchasedExamIds || u.purchasedExamIds.length === 0)).length}
                  </span>
                  <span className="text-xs text-text-dim font-bold">Unlicensed</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Panel */}
            <div className="bg-surface border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {[
                  { id: 'all', label: 'All Students (সব শিক্ষার্থী)' },
                  { id: 'full', label: 'Full Access (পূর্ণ পেইড মেম্বার)' },
                  { id: 'selective', label: 'Selective Access (সিলেক্টিভ মেম্বার)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setPaidUserFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      paidUserFilter === f.id
                        ? 'bg-accent/8 border border-accent/20 text-accent font-extrabold shadow-sm'
                        : 'text-text-dim bg-transparent hover:text-text-main hover:bg-surface-hover/80 border-transparent'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-3 text-text-dim/80" size={14} />
                <input
                  type="text"
                  value={paidUserSearch}
                  onChange={(e) => setPaidUserSearch(e.target.value)}
                  placeholder="Search students (নাম, আইডি বা ফোন)..."
                  className="w-full bg-surface-hover/50 border border-border/60 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-accent text-xs font-semibold focus:bg-surface focus:ring-2 focus:ring-accent/10 transition-all font-sans"
                />
              </div>
            </div>

            {/* User Directory for Paid Access */}
            <div className="bg-surface border border-border/80 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-border/60 pb-4">
                <h3 className="text-base font-extrabold flex items-center gap-2 text-text-main uppercase tracking-wider">
                  <Sparkles className="text-accent" size={16} />
                  <span>Premium Access Controller / পেইড ইউজার অ্যাক্সেস কন্ট্রোলার</span>
                </h3>
                <span className="text-[10px] bg-accent/8 border border-accent/15 text-accent font-mono font-black py-1 px-3 rounded-md uppercase tracking-wider">
                  {
                    users.filter((user) => {
                      const q = paidUserSearch.toLowerCase().trim();
                      const matchesSearch = !q ||
                        (user.name || '').toLowerCase().includes(q) ||
                        (user.userId || '').toLowerCase().includes(q) ||
                        (user.phone || '').toLowerCase().includes(q) ||
                        (user.institution || '').toLowerCase().includes(q);
                      if (!matchesSearch) return false;
                      if (paidUserFilter === 'full') return user.isPaidUser === true;
                      if (paidUserFilter === 'selective') return user.isPaidUser !== true && (user.purchasedExamIds && user.purchasedExamIds.length > 0);
                      return true;
                    }).length
                  } Matches
                </span>
              </div>

              <div className="space-y-4">
                {users.filter((user) => {
                  const q = paidUserSearch.toLowerCase().trim();
                  const matchesSearch = !q ||
                    (user.name || '').toLowerCase().includes(q) ||
                    (user.userId || '').toLowerCase().includes(q) ||
                    (user.phone || '').toLowerCase().includes(q) ||
                    (user.institution || '').toLowerCase().includes(q);
                  if (!matchesSearch) return false;
                  if (paidUserFilter === 'full') return user.isPaidUser === true;
                  if (paidUserFilter === 'selective') return user.isPaidUser !== true && (user.purchasedExamIds && user.purchasedExamIds.length > 0);
                  return true;
                }).map((user) => {
                  const uPurchasedIds = user.purchasedExamIds || [];
                  const userPaidExams = exams.filter(e => e.price > 0);

                  return (
                    <div key={user.id} className="bg-surface border border-border/70 hover:border-accent/30 rounded-xl p-5 hover:bg-surface-hover/10 transition-all space-y-4 group">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-extrabold text-text-main">
                              {user.name}
                            </h4>
                            <span className="bg-surface border border-border/80 font-mono font-bold text-[9px] px-2 py-0.5 rounded text-accent">ID: {user.userId}</span>
                            
                            {/* Premium Status Badge */}
                            {user.isPaidUser === true ? (
                              <span className="bg-success/8 border border-success/15 text-success text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider flex items-center gap-1 font-sans">
                                <Sparkles size={9} /> Full General Access (সব পেইড এক্সাম উন্মুক্ত)
                              </span>
                            ) : uPurchasedIds.length > 0 ? (
                              <span className="bg-accent/8 border border-accent/15 text-accent text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider flex items-center gap-1 font-sans">
                                <Check size={9} /> Selective Access ({uPurchasedIds.length} exam{uPurchasedIds.length > 1 ? 's' : ''} উন্মুক্ত)
                              </span>
                            ) : (
                              <span className="bg-text-dim/8 border border-border text-text-dim/80 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider font-sans">
                                No Premium Access (কোনো পেইড এক্সাম অ্যাক্সেস নেই)
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-text-dim uppercase tracking-wider">{user.institution || 'No Institution specified'} <span className="mx-1.5 opacity-40">|</span> Phone: <span className="font-mono font-semibold">{user.phone || 'N/A'}</span></p>
                        </div>

                        {/* General Access Toggle Controller */}
                        <div className="flex items-center">
                          <button
                            onClick={() => handleToggleFullPaidAccess(user)}
                            className={`px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 select-none ${
                              user.isPaidUser 
                                ? 'bg-success/8 hover:bg-success/15 border-success/30 text-success' 
                                : 'bg-surface hover:bg-accent/8 border-border hover:border-accent/20 text-text-dim hover:text-accent'
                            }`}
                            disabled={loading}
                          >
                            <Sparkles size={12} className={user.isPaidUser ? 'text-success animate-pulse' : 'text-text-dim'} />
                            <span>{user.isPaidUser ? 'পূর্ণ প্রিমিয়াম মেম্বার (এনেবলড)' : 'পূর্ণ প্রিমিয়াম মেম্বার করুন'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Selective Exam Access Panel */}
                      <div className="bg-surface-hover/30 border border-border/50 rounded-xl p-4 space-y-2.5">
                        <span className="text-[10px] font-black text-text-dim/90 block uppercase tracking-wider font-sans">
                          {user.isPaidUser ? 'পূর্ণ প্রিমিয়াম মেম্বারশিপ মেথডে সকল পেইড এক্সাম উন্মুক্ত করা হয়েছে:' : 'সিলেক্টিভ পেইড এক্মাম অ্যাক্সেস দিন (টিক দিন):'}
                        </span>
                        {userPaidExams.length === 0 ? (
                          <p className="text-xs text-text-dim/80 italic">কোনো পেইড এক্সাম পোর্টাল ডিরেক্টরিতে পাওয়া যায়নি।</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {userPaidExams.map((exam) => {
                              const examId = exam.id || '';
                              const isPermitted = user.isPaidUser || uPurchasedIds.includes(examId);

                              return (
                                <button
                                  key={examId}
                                  disabled={!!user.isPaidUser || loading}
                                  onClick={() => examId && handleToggleSelectiveExamAccess(user, examId)}
                                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border flex items-center gap-2 cursor-pointer select-none ${
                                    isPermitted
                                      ? 'bg-accent/8 border-accent/20 text-accent font-bold shadow-xs'
                                      : 'bg-transparent border-border hover:border-text-dim/40 text-text-dim hover:text-text-main'
                                  } ${user.isPaidUser ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  {isPermitted ? (
                                    <Check size={11} className="text-accent stroke-[3px]" />
                                  ) : (
                                    <Plus size={11} className="opacity-60" />
                                  )}
                                  <span>{exam.subject} ({exam.topic})</span>
                                  <span className="text-[9px] bg-background border border-border/40 text-text-dim px-1 rounded-sm">৳{exam.price}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {users.filter((user) => {
                  const q = paidUserSearch.toLowerCase().trim();
                  const matchesSearch = !q ||
                    (user.name || '').toLowerCase().includes(q) ||
                    (user.userId || '').toLowerCase().includes(q) ||
                    (user.phone || '').toLowerCase().includes(q) ||
                    (user.institution || '').toLowerCase().includes(q);
                  if (!matchesSearch) return false;
                  if (paidUserFilter === 'full') return user.isPaidUser === true;
                  if (paidUserFilter === 'selective') return user.isPaidUser !== true && (user.purchasedExamIds && user.purchasedExamIds.length > 0);
                  return true;
                }).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-xl text-text-dim text-center bg-surface-hover/20">
                    <Users size={32} className="opacity-15 mb-3" />
                    <p className="font-extrabold uppercase text-[11px] tracking-wider text-text-main">No Match Found</p>
                    <p className="text-xs max-w-xs mt-1 text-text-dim/80 text-sans">Try modifying your search text queries or state filters.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* RESULTS TAB */}
        {activeTab === 'results' && (
          <motion.div
            key="results-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-surface border border-border/80 rounded-2xl p-6 md:p-8 shadow-sm min-h-[500px]"
          >
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 border-b border-border/40 pb-6">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2 text-text-main uppercase tracking-wider">
                  <HistoryIcon className="text-accent" size={16} />
                  <span>Historical Exam Dispatch Ledger</span>
                </h3>
                <p className="text-[10px] text-text-dim uppercase font-extrabold tracking-wider mt-1">
                  View and export registered examwise performance records
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Examwise Selector Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider">Exam:</span>
                  <select
                    value={selectedExamResultFilter}
                    onChange={(e) => setSelectedExamResultFilter(e.target.value)}
                    className="bg-surface-hover border border-border/80 rounded-xl px-3 py-1.5 outline-none focus:border-accent text-xs font-bold text-text-main focus:ring-2 focus:ring-accent/10 transition-all cursor-pointer min-w-[200px] max-w-[300px]"
                  >
                    <option value="all">All Exams</option>
                    {Array.from(new Set(results.map(r => r.examTitle || 'Global MCQ Bank'))).map((title, idx) => (
                      <option key={idx} value={title}>{title}</option>
                    ))}
                  </select>
                </div>

                {/* Export Button */}
                <button
                  onClick={exportResultsToExcel}
                  className="flex items-center gap-1.5 bg-accent hover:bg-accent2 text-white font-extrabold text-[10px] py-2 px-3.5 rounded-xl uppercase tracking-wider cursor-pointer transition-all"
                  title="Download student results of selected exam as Excel/CSV format"
                >
                  <Download size={12} />
                  <span>Export Results</span>
                </button>

                <span className="bg-accent/8 border border-accent/15 text-accent px-3 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
                  {filteredResults.length} Sessions Resolved
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-border/60 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/80 text-[9px] font-extrabold uppercase text-text-dim tracking-widest bg-surface-hover/80">
                    <th className="py-3 px-5">Timestamp</th>
                    <th className="py-3 px-5">Student / Candidate</th>
                    <th className="py-3 px-5">Target Exam</th>
                    <th className="py-3 px-5 text-center">Correct answers</th>
                    <th className="py-3 px-5 text-center">Score Precision</th>
                    <th className="py-3 px-5 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredResults.map((res) => (
                    <tr key={res.id} className="hover:bg-surface-hover/40 transition-colors text-xs text-text-main">
                      <td className="py-4 px-5 font-mono text-text-dim text-[11px]">
                        {res.timestamp?.seconds ? new Date(res.timestamp.seconds * 1000).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-4 px-5">
                        <p className="font-extrabold text-text-main">{res.studentName}</p>
                        <p className="text-[10px] font-mono text-text-dim uppercase font-bold">ID: {res.studentId}</p>
                      </td>
                      <td className="py-4 px-5">
                        <p className="font-bold text-accent">{res.examTitle || 'Global MCQ Bank'}</p>
                      </td>
                      <td className="py-4 px-5 text-center font-mono font-bold text-text-main">
                        {res.score} / {res.total}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className="bg-success/8 text-success px-3 py-1 rounded font-mono font-bold border border-success/10 text-xs">
                          {res.percentage}%
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => res.id && handleDeleteResult(res.id)}
                          className="text-text-dim hover:text-danger p-2 bg-surface hover:bg-surface-hover border border-border/70 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredResults.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-text-dim font-bold uppercase text-[11px] tracking-wider bg-surface-hover/20">
                        No examination records found in filtered view
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* PAYMENTS TAB (BKASH LEDGER) */}
        {activeTab === 'payments' && (
          <motion.div
            key="payments-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-surface border border-border/80 rounded-2xl p-6 md:p-8 shadow-sm min-h-[500px]"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-extrabold flex items-center gap-2 text-text-main uppercase tracking-wider">
                <CreditCard className="text-accent" size={16} />
                <span>Bkash Transactions and Payment Slips</span>
              </h3>
              <span className="bg-success/8 border border-success/15 text-success px-3 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider">
                {payments.length} Registered Slips
              </span>
            </div>

            <div className="overflow-x-auto border border-border/60 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/80 text-[9px] font-extrabold uppercase text-text-dim tracking-widest bg-surface-hover/80">
                    <th className="py-3 px-5">Timestamp</th>
                    <th className="py-3 px-5">Client details</th>
                    <th className="py-3 px-5">Exam Product / Price</th>
                    <th className="py-3 px-5">Bkash TRX ID</th>
                    <th className="py-3 px-5 text-center">Trx Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payments.map((slip) => (
                    <tr key={slip.id} className="hover:bg-surface-hover/40 transition-colors text-xs text-text-main">
                      <td className="py-4 px-5 font-mono text-text-dim text-[11px]">
                        {slip.timestamp?.seconds ? new Date(slip.timestamp.seconds * 1000).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-4 px-5">
                        <p className="font-extrabold text-text-main">{slip.studentName}</p>
                        <p className="text-[10px] font-mono text-text-dim uppercase font-semibold">ID: {slip.userId}</p>
                      </td>
                      <td className="py-4 px-5">
                        <p className="font-semibold text-text-main">{slip.examTitle}</p>
                        <p className="font-bold text-accent font-mono text-[11px]">৳{slip.amount} BDT</p>
                      </td>
                      <td className="py-4 px-5 text-left font-mono font-bold text-success tracking-wider">
                        {slip.trxId}
                      </td>
                      <td className="py-4 px-5 text-center">
                        {slip.status === 'verified' ? (
                          <span className="bg-success/8 text-success px-2 py-0.5 rounded text-[9px] font-bold border border-success/15 uppercase tracking-wider">
                            Verified
                          </span>
                        ) : (
                          <span className="bg-amber-100/50 text-amber-700 px-2 py-0.5 rounded text-[9px] font-bold border border-amber-200/60 uppercase tracking-wider animate-pulse">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex justify-end gap-1.5 items-center">
                          {slip.status === 'pending' && (
                            <button
                              onClick={() => handleApprovePayment(slip)}
                              className="bg-success hover:bg-success/95 text-white px-2.5 py-1.5 rounded-lg border border-success/15 transition-all inline-flex items-center gap-1 text-[9px] font-bold uppercase cursor-pointer"
                            >
                              <Check size={11} /> Approve
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedSlip(slip)}
                            className="bg-surface-hover hover:bg-accent/8 hover:text-accent border border-border/70 p-1.5 rounded-lg transition-all inline-flex items-center gap-1 text-[10px] font-bold uppercase cursor-pointer"
                            title="View Slip Details"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => slip.id && handleDeletePayment(slip.id)}
                            className="bg-surface-hover hover:bg-danger/8 hover:text-danger border border-border/70 p-1.5 rounded-lg transition-all cursor-pointer"
                            title="Delete Ledger Entry"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-text-dim font-bold uppercase text-[11px] tracking-wider bg-surface-hover/20">
                        No transactions registered in system records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            key="settings-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-surface border border-border/80 rounded-2xl p-6 md:p-8 shadow-sm min-h-[500px] space-y-8"
          >
            <div className="flex justify-between items-center pb-4 border-b border-border/60">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold flex items-center gap-2 text-text-main uppercase tracking-wider">
                  <Settings className="text-accent" size={16} />
                  <span>Portal Logo & Branding Configuration</span>
                </h3>
                <p className="text-text-dim text-xs font-semibold uppercase tracking-wider">Update the branding name, logo style, and visual wordmark displayed on the header left side real-time.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Config */}
              <form onSubmit={handleSaveLogoSettings} className="lg:col-span-7 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Logo Presentation Style</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'text', label: 'Text Only', desc: 'Render custom brand heading' },
                      { id: 'image', label: 'Image Only', desc: 'Render logo image only' },
                      { id: 'both', label: 'Logo & Text', desc: 'Render image icon with brand text' },
                    ].map((style) => (
                      <button
                        type="button"
                        key={style.id}
                        onClick={() => setLogoSettings({ ...logoSettings, logoType: style.id as any })}
                        className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          logoSettings.logoType === style.id
                            ? 'bg-accent/8 border-accent text-accent shadow-sm ring-1 ring-accent/30'
                            : 'bg-surface-hover/40 border-border/60 text-text-main hover:bg-surface-hover/85'
                        }`}
                      >
                        <span className="text-xs font-bold uppercase tracking-wider">{style.label}</span>
                        <span className="text-[10px] text-text-dim mt-1">{style.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Logo / Portal Wordmark</label>
                  <input
                    type="text"
                    required
                    value={logoSettings.logoText}
                    onChange={(e) => setLogoSettings({ ...logoSettings, logoText: e.target.value })}
                    placeholder="e.g. ICT MCQ"
                    className="w-full bg-surface-hover/50 border border-border/80 rounded-xl p-3 h-11 outline-none text-sm font-extrabold transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 focus:bg-surface"
                  />
                  <p className="text-[10px] text-text-dim">The branding wordmark shown on the top left side. (e.g. ICT MCQ)</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Branding logo Image URL (Demo / Custom Link)</label>
                  <input
                    type="url"
                    value={logoSettings.logoUrl}
                    onChange={(e) => setLogoSettings({ ...logoSettings, logoUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full bg-surface-hover/50 border border-border/80 rounded-xl p-3 h-11 outline-none text-xs font-mono transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 focus:bg-surface"
                  />
                  <p className="text-[10px] text-text-dim leading-relaxed">
                    Set a public image URL for the branding logo. If blank, or for a fast demo, a default beautiful abstract color sphere image is loaded as fallback logo.
                  </p>
                </div>

                {/* Hero Landing Customization (ল্যান্ডিং ছবির পরিবর্তন) */}
                <div className="space-y-3 border-t border-border/40 pt-6">
                  <h4 className="text-[11px] font-black uppercase text-accent tracking-widest">
                    🌌 Home landing Hero customization (ল্যান্ডিং ছবির পরিবর্তন)
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Landing Right-Side Image URL (ল্যান্ডিং ছবির লিংক)</label>
                    <input
                      type="url"
                      value={logoSettings.heroImageUrl || ''}
                      onChange={(e) => setLogoSettings({ ...logoSettings, heroImageUrl: e.target.value })}
                      placeholder="e.g. https://images.unsplash.com/photo-..."
                      className="w-full bg-surface-hover/50 border border-border/80 rounded-xl p-3 h-11 outline-none text-xs font-mono transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 focus:bg-surface"
                    />
                    <p className="text-[10px] text-text-dim leading-relaxed">
                      Paste a high-quality vertical or horizontal public image URL to display on the landing page hero's right side.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Or Upload Local Image (সরাসরি ছবি আপলোড করুন)</label>
                    <div className="flex items-center gap-3 bg-surface-hover/40 border border-border/80 p-3.5 rounded-xl">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          // Check file size (keep it under 1MB to fit well inside Firestore documents)
                          if (file.size > 1048576) {
                            alert("File is too large! Please choose an image smaller than 1 MB to prevent storage limits.");
                            return;
                          }

                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setLogoSettings({ ...logoSettings, heroImageUrl: event.target.result as string });
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="text-xs text-text-dim file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-extrabold file:uppercase file:bg-accent/10 file:text-accent file:cursor-pointer hover:file:bg-accent/20 cursor-pointer"
                      />
                      {logoSettings.heroImageUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoSettings({ ...logoSettings, heroImageUrl: '' })}
                          className="bg-danger/10 hover:bg-danger/20 text-danger border border-danger/25 py-1 px-2 text-[9px] font-black rounded-md uppercase tracking-wider cursor-pointer"
                        >
                          Reset / Clear
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-text-dim italic">
                      Upload any PNG, JPG, or SVG image. Image file is automatically compiled into an elegant standalone database base64 format.
                    </p>
                  </div>
                </div>

                {/* Paid Exam Notice Section */}
                <div className="space-y-3 border-t border-border/40 pt-6">
                  <h4 className="text-[11px] font-black uppercase text-accent tracking-widest">
                    💳 Paid Exam Notice Headline (পেইড এক্সাম নোটিশ হেডার)
                  </h4>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Paid Exam Section Title / Notice (পেইড এক্সাম সেকশনের নোটিশ)</label>
                    <input
                      type="text"
                      required
                      value={logoSettings.paidExamNotice || ''}
                      onChange={(e) => setLogoSettings({ ...logoSettings, paidExamNotice: e.target.value })}
                      placeholder="যেমন: ৫০ টাকায় সারামাস পেইড এক্সাম (২০ টি)"
                      className="w-full bg-surface-hover/50 border border-border/80 rounded-xl p-3 h-11 outline-none text-xs font-semibold transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 focus:bg-surface"
                    />
                    <p className="text-[10px] text-text-dim leading-relaxed">
                      পেইড এক্সাম লিস্টের উপরে এই লেখাটি বড় করে হাইলাইট নোটিশ আকারে প্রদর্শন করা হবে। এডমিন যেকোনো সময় এটি আপডেট করতে পারবেন।
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-accent hover:bg-accent2 text-white font-extrabold px-6 py-3 h-11 rounded-xl text-xs uppercase tracking-widest cursor-pointer transition-all disabled:opacity-50 w-full"
                >
                  {loading ? 'SAVING BRANDING...' : 'APPLY BRANDING & HERO UPDATES'}
                </button>
              </form>

              {/* Branding Live Preview Sheet */}
              <div className="lg:col-span-5 space-y-4">
                <h4 className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider">Design Live Wordmark Preview</h4>
                <div className="bg-bg border border-border/80 rounded-2xl p-6 flex flex-col justify-center min-h-[160px] relative overflow-hidden">
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-success/8 text-success px-2.5 py-0.5 rounded text-[8px] font-extrabold uppercase font-mono border border-success/15 animate-pulse">
                    Live Render
                  </div>
                  <div className="text-center md:text-left space-y-2">
                    <p className="text-[11px] text-text-dim/80 font-bold uppercase tracking-wider mb-2">Mock Header Display Fragment:</p>
                    <div className="flex items-center gap-3 bg-surface p-4 rounded-xl border border-border shadow-sm inline-flex self-start">
                      {/* Render Logo preview */}
                      {(logoSettings.logoType === 'image' || logoSettings.logoType === 'both') && (
                        <img
                          src={logoSettings.logoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"}
                          alt="Demo Logo"
                          className="w-9 h-9 rounded-xl object-cover border border-border bg-bg"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      {logoSettings.logoType === 'text' && (
                        <div className="w-9 h-9 bg-accent/8 text-accent rounded-xl flex items-center justify-center font-black border border-accent/15">
                          {logoSettings.logoText.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      {(logoSettings.logoType === 'text' || logoSettings.logoType === 'both') && (
                        <span className="font-sans font-extrabold text-lg tracking-wide text-text-main">
                          {logoSettings.logoText.split(' ').slice(0, -1).join(' ')}{' '}
                          <span className="text-accent">{logoSettings.logoText.split(' ').slice(-1)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-accent/5 rounded-2xl p-5 border border-accent/10 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-accent font-extrabold">
                    <Sparkles size={14} />
                    <span className="uppercase tracking-wider">Demo / Preloaded Defaults</span>
                  </div>
                  <p className="text-text-main leading-relaxed">
                    To showcase immediate logo updating functionality, toggle between the style modes above or change &ldquo;ICT MCQ&rdquo; to your customized wordmark to see the header globally synchronize instantly across all students and managers!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'routines' && (
          <motion.div
            key="routines-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-surface border border-border/80 rounded-2xl p-6 md:p-8 shadow-sm min-h-[500px] space-y-8"
          >
            <div className="flex justify-between items-center pb-4 border-b border-border/60">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold flex items-center gap-2 text-text-main uppercase tracking-wider">
                  <Calendar className="text-accent" size={16} />
                  <span>Exam Routine & Schedule Manager</span>
                </h3>
                <p className="text-text-dim text-xs font-semibold uppercase tracking-wider">Publish examination dates, calendars, PDF instructions, or image maps for students instantly.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Config */}
              <form onSubmit={handleAddRoutine} className="lg:col-span-5 space-y-5 bg-bg/40 p-5 rounded-2xl border border-border/50">
                <h4 className="text-xs font-black uppercase text-accent tracking-wider">Create New Exam Routine</h4>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Routine Title</label>
                  <input
                    type="text"
                    required
                    value={routineForm.title}
                    onChange={(e) => setRoutineForm({ ...routineForm, title: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl p-3 h-11 text-xs font-bold outline-none focus:border-accent"
                    placeholder="e.g., Year Final Exam Schedule 2026"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Description / Notes (Optional)</label>
                  <textarea
                    value={routineForm.description}
                    onChange={(e) => setRoutineForm({ ...routineForm, description: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl p-3 text-xs font-semibold outline-none focus:border-accent min-h-[85px] leading-relaxed"
                    placeholder="Enter any additional details, hall rules, or notes for candidates..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Routine Media Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'text', label: 'Text Only', icon: FileText },
                      { id: 'image', label: 'Image File', icon: Eye },
                      { id: 'pdf', label: 'PDF Document', icon: FileText },
                    ].map((format) => (
                      <button
                        type="button"
                        key={format.id}
                        onClick={() => {
                          setRoutineForm({ ...routineForm, routineType: format.id as any });
                          // Clear loaded files if format changes
                          setRoutineFileBase64(null);
                          setRoutineFileName('');
                        }}
                        className={`py-2.5 px-2 rounded-lg border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                          routineForm.routineType === format.id
                            ? 'bg-accent/8 border-accent text-accent font-bold'
                            : 'bg-surface border-border/50 text-text-dim hover:text-text-main hover:bg-surface-hover/80'
                        }`}
                      >
                        <format.icon size={14} />
                        <span className="text-[9px] uppercase tracking-wider font-extrabold">{format.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {routineForm.routineType !== 'text' && (
                  <div className="space-y-4 pt-2 border-t border-border/50">
                    {/* Method 1: Upload file */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">
                        Upload Local {routineForm.routineType === 'pdf' ? 'PDF' : 'Image'} File (Max 4MB)
                      </label>
                      <div className="relative group cursor-pointer border border-dashed border-border hover:border-accent/40 bg-surface rounded-xl p-4 flex flex-col items-center justify-center transition-colors text-center">
                        <input
                          type="file"
                          accept={routineForm.routineType === 'pdf' ? 'application/pdf' : 'image/*'}
                          onChange={handleRoutineFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload size={18} className="text-text-dim group-hover:text-accent mb-2 transition-colors" />
                        <span className="text-[10px] font-bold text-text-main block">
                          {routineFileName || `Choose local document...`}
                        </span>
                        <span className="text-[8px] text-text-dim">
                          {routineFileBase64 ? '✓ Base64 data encoded' : 'Click or Drag document file'}
                        </span>
                      </div>
                    </div>

                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-border/50"></div>
                      <span className="flex-shrink mx-3 text-[9px] text-text-dim font-black uppercase">OR</span>
                      <div className="flex-grow border-t border-border/50"></div>
                    </div>

                    {/* Method 2: External HTTP URL link */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">
                        Or Provide Web Link/URL
                      </label>
                      <input
                        type="url"
                        value={routineForm.fileUrl}
                        onChange={(e) => {
                          setRoutineForm({ ...routineForm, fileUrl: e.target.value });
                          // Clear file upload since they gave URL
                          if (e.target.value.trim()) {
                            setRoutineFileBase64(null);
                            setRoutineFileName('');
                          }
                        }}
                        className="w-full bg-surface border border-border rounded-xl p-3 h-11 text-xs outline-none focus:border-accent"
                        placeholder="https://example.com/schedule.pdf"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent hover:bg-accent2 text-white font-extrabold h-11 rounded-xl text-xs uppercase tracking-widest cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 font-sans"
                >
                  <Plus size={14} />
                  {loading ? 'PROCESSING...' : 'PUBLISH ROUTINE'}
                </button>
              </form>

              {/* List existing */}
              <div className="lg:col-span-7 space-y-4">
                <h4 className="text-xs font-black uppercase text-text-main tracking-wider flex items-center gap-2">
                  <span>Currently Active Routines ({routines.length})</span>
                </h4>

                <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-2">
                  {routines.map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-surface border border-border/80 rounded-2xl p-4.5 hover:border-accent/20 transition-all flex justify-between gap-4 shadow-sm"
                    >
                      <div className="space-y-2 flex-grow min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            item.routineType === 'pdf' 
                              ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                              : item.routineType === 'image'
                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {item.routineType}
                          </span>
                          <span className="text-[9.5px] text-text-dim font-bold">
                            {item.createdAt?.seconds 
                              ? new Date(item.createdAt.seconds * 1000).toLocaleDateString()
                              : 'Just now'
                            }
                          </span>
                        </div>

                        <h5 className="text-xs font-black text-text-main block truncate uppercase">{item.title}</h5>
                        {item.description && (
                          <p className="text-[11px] text-text-dim leading-relaxed font-semibold whitespace-pre-line bg-bg/25 p-3 rounded-lg border border-border/40 font-sans">{item.description}</p>
                        )}

                        {item.fileUrl && (
                          <div className="pt-1.5 flex gap-2 items-center flex-wrap">
                            <a
                              href={item.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 bg-bg border border-border hover:bg-surface-hover hover:text-accent p-2 rounded-lg text-[10px] font-extrabold uppercase text-text-main tracking-wide transition-colors cursor-pointer"
                            >
                              <Download size={11} /> Open/Download Document
                            </a>
                            {item.routineType === 'image' && item.fileUrl.startsWith('data:') && (
                              <img
                                src={item.fileUrl}
                                alt="thumb"
                                className="w-10 h-10 rounded-lg object-cover border border-border shadow-sm bg-bg"
                              />
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => item.id && handleDeleteRoutine(item.id)}
                        className="text-text-dim hover:text-rose-600 p-1.5 transition-colors self-start border border-transparent hover:border-rose-100 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Delete Routine"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {routines.length === 0 && (
                    <div className="py-16 text-center border border-dashed border-border/80 rounded-2xl bg-surface-hover/10 space-y-2">
                      <Calendar className="mx-auto text-text-dim" size={28} />
                      <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">No Exam Schedules Published</p>
                      <p className="text-[9px] text-text-dim/80 max-w-xs mx-auto">Create and attach routines in PDF, Image, or plain-text to let students access information instantly.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'admins' && (
          <motion.div
            key="admins-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left"
          >
            {/* Left Column: Create/Edit Form */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-surface border border-border/80 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <UserPlus className="text-accent" size={18} />
                  <h3 className="text-sm font-black text-text-main uppercase tracking-wider">
                    {editingAdminId ? "🔧 EDIT ADMINISTRATOR" : "👤 CREATE NEW ADMIN"}
                  </h3>
                </div>

                <form onSubmit={handleSaveAdmin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Full Name (পূর্ণ নাম)</label>
                    <input
                      type="text"
                      required
                      value={adminForm.name}
                      onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                      placeholder="e.g. Shakil Rahman"
                      className="w-full bg-surface-hover/50 border border-border/80 rounded-xl p-3 h-11 outline-none text-xs font-semibold transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 focus:bg-surface"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Username (ইউজারনেম)</label>
                    <input
                      type="text"
                      required
                      disabled={editingAdminId !== null}
                      value={adminForm.username}
                      onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                      placeholder="e.g. shakil"
                      className="w-full bg-surface-hover/50 border border-border/80 rounded-xl p-3 h-11 outline-none text-xs font-semibold transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 focus:bg-surface font-mono disabled:opacity-50"
                    />
                    {editingAdminId && (
                      <p className="text-[9px] text-text-dim/80 italic">ইউজারনেম পরিবর্তনযোগ্য নয়।</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Password (পাসওয়ার্ড)</label>
                    <input
                      type="password"
                      required={!editingAdminId}
                      value={adminForm.password}
                      onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                      placeholder={editingAdminId ? "Keep blank to retain current password (পরিবর্তন না করতে চাইলে ফাঁকা রাখুন)" : "Enter password (পাসওয়ার্ড লিখুন)"}
                      className="w-full bg-surface-hover/50 border border-border/80 rounded-xl p-3 h-11 outline-none text-xs font-semibold transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 focus:bg-surface font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Access Role (ভূমিকা)</label>
                    <select
                      value={adminForm.role}
                      onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value as any })}
                      className="w-full bg-surface-hover/50 border border-border/80 rounded-xl px-3 h-11 outline-none text-xs font-semibold transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 focus:bg-surface"
                    >
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-accent hover:bg-accent2 text-white font-extrabold h-11 rounded-xl text-xs uppercase tracking-widest cursor-pointer transition-all disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : (editingAdminId ? 'UPDATE ADMIN' : 'SAVE ADMIN')}
                    </button>
                    {editingAdminId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAdminId(null);
                          setAdminForm({ username: '', password: '', name: '', role: 'admin' });
                        }}
                        className="bg-surface-hover border border-border text-text-main hover:bg-surface font-extrabold px-3 h-11 rounded-xl text-xs uppercase cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Admin List Table Grid */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-surface border border-border/80 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
                <div className="pb-4 border-b border-border/60">
                  <h3 className="text-base font-extrabold flex items-center gap-2 text-text-main uppercase tracking-wider">
                    <ShieldCheck className="text-accent" size={18} />
                    ADMINISTRATOR ROSTER LAYOUT (সিস্টেম অ্যাডমিনদের তালিকা)
                  </h3>
                  <p className="text-text-dim text-[11px] leading-relaxed mt-1">
                    Hardcore superadmin <span className="font-mono text-accent font-black">rkb_bitBox</span> has absolute static privileges & cannot be modified or deleted. Other custom admin privileges can be customized below.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-[10px] font-extrabold uppercase text-text-dim tracking-wider">
                        <th className="py-3 px-4">Operator Info</th>
                        <th className="py-3 px-4">Username</th>
                        <th className="py-3 px-4 font-mono">Password</th>
                        <th className="py-3 px-4 text-center">Status / Badge</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {/* Hardcoded Built-in Super Admin [rkb_bitBox] */}
                      <tr className="group hover:bg-accent/5 transition-colors bg-accent/3">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center text-accent text-xs font-black">
                              R
                            </div>
                            <div>
                              <p className="font-black text-text-main uppercase">Rkb_bitBox System Superuser</p>
                              <p className="text-[10px] text-accent font-mono font-bold">Hardcoded Core</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-accent">rkb_bitBox</td>
                        <td className="py-3 px-4 font-mono font-semibold text-text-dim">••••••••</td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-amber-100 border border-amber-200 text-amber-800 text-[8.5px] font-extrabold py-0.5 px-2 rounded uppercase tracking-widest font-mono">
                            👑 Built-In Superuser
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5 opacity-60">
                            <span className="text-[9.5px] text-text-dim italic font-mono">- Protected -</span>
                          </div>
                        </td>
                      </tr>

                      {/* Custom Admins from Firestore */}
                      {adminsList.map((ad) => (
                        <tr key={ad.id} className="group hover:bg-surface-hover/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-surface-hover border border-border/80 flex items-center justify-center text-text-dim text-xs font-black uppercase">
                                {ad.name ? ad.name[0] : 'A'}
                              </div>
                              <div>
                                <p className="font-black text-text-main uppercase">{ad.name}</p>
                                <p className="text-[10px] text-text-dim font-bold uppercase">{ad.role}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-text-main font-bold">{ad.username}</td>
                          <td className="py-3 px-4 font-mono text-text-dim font-semibold">••••••••</td>
                          <td className="py-3 px-4 text-center">
                            <span className="bg-bg border border-border/80 text-text-main text-[8.5px] font-extrabold py-0.5 px-2 rounded uppercase tracking-wider font-mono">
                              {ad.role === 'superadmin' ? '⭐ Super Admin' : '👤 Operator'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleEditAdmin(ad)}
                                className="bg-bg hover:bg-accent/8 hover:text-accent hover:border-accent/20 border border-border/70 p-2 rounded-xl transition-all cursor-pointer"
                                title="Edit Admin"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => ad.id && handleDeleteAdmin(ad.id)}
                                className="bg-bg hover:bg-danger/8 hover:text-danger hover:border-danger/20 border border-border/70 p-2 rounded-xl transition-all cursor-pointer"
                                title="Delete Admin"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {adminsList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-text-dim italic">
                            অন্য কোনো কাস্টম অ্যাডমিন অ্যাকাউন্ট তৈরি করা নেই।
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'logs' && (
          <motion.div
            key="logs-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 text-left"
          >
            {/* Header / Metric Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-surface border border-border/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Total Audited Events</span>
                  <h3 className="text-2xl font-black text-text-main font-mono mt-1">
                    {activityLogs.length}
                  </h3>
                </div>
                <p className="text-[9px] text-text-dim/80 mt-2 font-bold uppercase">Stored securely</p>
              </div>

              <div className="bg-surface border border-border/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Unique Operators</span>
                  <h3 className="text-2xl font-black text-text-main font-mono mt-1">
                    {new Set(activityLogs.map(l => l.adminUsername)).size}
                  </h3>
                </div>
                <p className="text-[9px] text-text-dim/80 mt-2 font-bold uppercase">Auditable personnel</p>
              </div>

              <div className="bg-surface border border-border/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Exam-related Tweaks</span>
                  <h3 className="text-2xl font-black text-accent font-mono mt-1">
                    {activityLogs.filter(l => l.category === "Exam Management").length}
                  </h3>
                </div>
                <p className="text-[9px] text-text-dim/80 mt-2 font-bold uppercase">Exams / publications</p>
              </div>

              <div className="bg-surface border border-border/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Payments Approved</span>
                  <h3 className="text-2xl font-black text-success font-mono mt-1">
                    {activityLogs.filter(l => l.action?.toLowerCase().includes("approve")).length}
                  </h3>
                </div>
                <p className="text-[9px] text-text-dim/80 mt-2 font-bold uppercase">Financial clearances</p>
              </div>
            </div>

            {/* Logs Audit List Container */}
            <div className="bg-surface border border-border/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 border-b border-border/50 flex flex-wrap gap-4 items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-text-main uppercase tracking-tight">📜 SYSTEM CHANGE LOGS & ADMINISTRATIVE AUDITS</h3>
                  <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest">Verifiable ledger tracking all administrative state modifications</p>
                </div>

                {/* Filter and Search controls */}
                <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto mt-2 sm:mt-0">
                  <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                    <input
                      type="text"
                      placeholder="Search log triggers..."
                      value={logQuery}
                      onChange={(e) => setLogQuery(e.target.value)}
                      className="w-full bg-surface-hover/45 border border-border/80 rounded-xl px-3 pl-8 py-2 text-xs outline-none focus:border-accent transition-all font-mono"
                    />
                    <Search size={12} className="absolute left-3 top-3 text-text-dim" />
                  </div>

                  <select
                    value={logCategoryFilter}
                    onChange={(e) => setLogCategoryFilter(e.target.value)}
                    className="bg-surface border border-border/80 rounded-xl px-3 py-2 text-xs font-bold outline-none text-text-main focus:border-accent cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    <option value="Exam Management">Exam Management</option>
                    <option value="Question Management">Question Management</option>
                    <option value="Payment Management">Payment Management</option>
                    <option value="User Management">User Management</option>
                    <option value="Routines">Routines</option>
                    <option value="Settings">Settings</option>
                    <option value="Admin Management">Admin Management</option>
                  </select>
                </div>
              </div>

              {/* Log Timeline Output */}
              <div className="p-6 md:p-8 space-y-4 max-h-[600px] overflow-y-auto">
                {filteredLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-border/60 hover:border-border transition-all bg-surface bg-gradient-to-r from-transparent to-surface-hover/10"
                  >
                    {/* Timestamp & operator detail */}
                    <div className="md:w-48 shrink-0 flex flex-col md:border-r border-border/50 md:pr-4">
                      <span className="text-xs font-mono font-black text-accent flex items-center gap-1.5 uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        {log.adminUsername}
                      </span>
                      <span className="text-[10px] text-text-dim font-bold uppercase mt-1">
                        {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                      </span>
                    </div>

                    {/* Action Text */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wider border ${
                          log.category === "Exam Management" ? "bg-accent/8 border-accent/25 text-accent" :
                          log.category === "Question Management" ? "bg-amber-100 border-amber-300 text-amber-800" :
                          log.category === "Payment Management" ? "bg-success/10 border-success/30 text-success" :
                          log.category === "User Management" ? "bg-blue-100 border-blue-200 text-blue-800" :
                          "bg-surface-hover border-border text-text-dim"
                        }`}>
                          {log.category}
                        </span>
                        <h4 className="text-xs font-black text-text-main uppercase">{log.action || 'Performed administrative task'}</h4>
                      </div>
                      
                      {log.details && (
                        <div className="p-3 bg-bg border border-border/70 rounded-xl font-mono text-[10px] text-text-dim/90 break-all leading-relaxed whitespace-pre-wrap">
                          {log.details}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {filteredLogs.length === 0 && (
                  <div className="py-16 text-center border border-dashed border-border/80 rounded-2xl bg-surface-hover/10 space-y-2">
                    <FileText className="mx-auto text-text-dim/80" size={28} />
                    <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">No Auditable Entries Found</p>
                    <p className="text-[9px] text-text-dim/80 max-w-xs mx-auto">Either no administrative events matching selection filters exist, or database ledger is completely clean.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Invoice/Slip details overlay modal */}
      <AnimatePresence>
        {selectedSlip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-surface border-4 border-accent border-double max-w-lg w-full rounded-[2.5rem] p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedSlip(null)}
                className="absolute right-6 top-6 text-text-dim hover:text-text-main p-2"
              >
                <X size={20} />
              </button>

              <div className="text-center space-y-4 mb-8">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${selectedSlip.status === 'verified' ? 'bg-success/15 border border-success/30 text-success' : 'bg-amber-100 border border-amber-300 text-amber-800 animate-pulse'}`}>
                  {selectedSlip.status === 'verified' ? <ShieldCheck size={36} /> : <Clock size={36} />}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight italic">PAYMENT RECEIPT SLIP</h3>
                  <p className={`text-[10px] font-black tracking-widest uppercase ${selectedSlip.status === 'verified' ? 'text-success' : 'text-amber-600 font-bold'}`}>
                    {selectedSlip.status === 'verified' ? 'MANUALLY VERIFIED AND APPROVED' : 'PENDING ADMINISTRATIVE APPROVAL'}
                  </p>
                </div>
              </div>

              <div className="bg-bg rounded-2xl p-6 border border-border space-y-4 font-mono text-xs">
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-text-dim font-bold">TRANSACTION DATE:</span>
                  <span className="text-text-main font-black">
                    {selectedSlip.timestamp?.seconds ? new Date(selectedSlip.timestamp.seconds * 1000).toLocaleString() : new Date().toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-text-dim font-bold">STUDENT LOGIN ID:</span>
                  <span className="text-text-main font-black">{selectedSlip.userId}</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-text-dim font-bold">STUDENT NAME:</span>
                  <span className="text-text-main font-black text-right uppercase">{selectedSlip.studentName}</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-text-dim font-bold">EXAM ASSIGNED:</span>
                  <span className="text-text-main font-black text-right">{selectedSlip.examTitle}</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-text-dim font-bold text-success font-black">BKASH TRANSACTION ID:</span>
                  <span className="text-success font-black uppercase tracking-wider">{selectedSlip.trxId}</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-text-dim font-bold">STATUS:</span>
                  <span className={`font-black uppercase tracking-wider ${selectedSlip.status === 'verified' ? 'text-success' : 'text-amber-600 animate-pulse'}`}>{selectedSlip.status}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-text-dim font-bold text-sm">TOTAL PAID:</span>
                  <span className="text-accent font-black text-sm">৳{selectedSlip.amount} BDT</span>
                </div>
              </div>

              <div className="mt-8 flex gap-3 flex-wrap">
                {selectedSlip.status === 'pending' && (
                  <button
                    onClick={() => handleApprovePayment(selectedSlip)}
                    className="flex-1 bg-success hover:bg-success/90 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-success/20 inline-flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} /> Approve Payment
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-accent hover:bg-accent2 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-accent/20"
                >
                  Print / Download
                </button>
                <button
                  onClick={() => setSelectedSlip(null)}
                  className="bg-surface-hover border border-border hover:bg-surface text-text-main font-black px-6 py-4 rounded-xl text-xs uppercase transition-all"
                >
                  Close Receipt
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. PUBLISH EXAM TIMING OVERLAY MODAL */}
      <AnimatePresence>
        {selectedExamToPublish && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-left"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-surface border-4 border-success border-double max-w-md w-full rounded-[2rem] p-6 shadow-2xl relative space-y-6"
            >
              <button 
                onClick={() => setSelectedExamToPublish(null)}
                className="absolute right-6 top-6 text-text-dim hover:text-text-main p-2"
              >
                <X size={20} />
              </button>

              <div className="space-y-2 text-center">
                <div className="p-3 bg-success/10 border border-success/20 rounded-2xl w-12 h-12 flex items-center justify-center mx-auto text-success shadow-sm">
                  <Clock size={22} />
                </div>
                <h3 className="text-xl font-extrabold tracking-tight text-text-main uppercase">EXAM TIME ALLOCATION</h3>
                <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest">পরীক্ষার সময়সীমা নির্ধারণপূর্বক পাবলিশ করুন</p>
              </div>

              <div className="bg-bg/40 rounded-xl p-4 border border-border space-y-3.5">
                <div>
                  <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Exam Target Title (পরীক্ষার নাম)</span>
                  <p className="text-sm font-extrabold text-text-main uppercase mt-1">{selectedExamToPublish.subject}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Topic Scope (টপিক)</span>
                  <p className="text-xs font-semibold text-text-dim uppercase mt-0.5">{selectedExamToPublish.topic || "All Syllabus"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Total Questions (মোট প্রশ্ন)</span>
                  <p className="text-xs font-semibold text-text-dim font-mono mt-0.5">{selectedExamToPublish.questions?.length || 0} Questions</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-text-dim uppercase tracking-wider block">Exam Duration Limit (সময়সীমা - মিনিটে)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={publishTimeLimit}
                    onChange={(e) => setPublishTimeLimit(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-surface-hover/50 border border-border/85 rounded-xl p-3 pl-10 h-11 outline-none text-sm font-extrabold transition-all focus:border-success focus:ring-2 focus:ring-success/10 font-mono"
                  />
                  <Clock size={16} className="absolute left-3.5 top-3.5 text-text-dim" />
                </div>
                <p className="text-[10px] text-text-dim italic leading-relaxed">সময়সীমা অবশ্যই মিনিটে দিন (উদাহরণস্বরূপ: ৩০ মিনিটের জন্য '30' লিখুন)।</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmPublish}
                  disabled={loading}
                  className="flex-1 bg-success hover:bg-success/90 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "PUBLISHING..." : "Confirm & Publish"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedExamToPublish(null)}
                  className="bg-surface-hover border border-border text-text-main font-bold px-5 py-3.5 rounded-xl text-xs uppercase transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
