import React, { useState, useEffect, useCallback } from 'react';
import { Question } from '../types';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { handleFirestoreError } from '../lib/error-handler';
import { ChevronLeft, ChevronRight, CheckCircle, Clock, LayoutDashboard, User, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExamEngineProps {
  questions: Question[];
  studentName: string;
  studentId: string;
  totalQuestions: number;
  timeLimitMinutes: number;
  examId?: string;
  examTitle?: string;
  onFinish: (result: any) => void;
}

export default function ExamEngine({ questions, studentName, studentId, totalQuestions, timeLimitMinutes, examId, examTitle, onFinish }: ExamEngineProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(timeLimitMinutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasSubmitted = React.useRef(false);

  // Submit Logic
  const handleSubmit = useCallback(async () => {
    if (isSubmitting || hasSubmitted.current) return;
    hasSubmitted.current = true;
    setIsSubmitting(true);

    let score = 0;
    let totalMarks = 0;

    questions.forEach((q, i) => {
      totalMarks += q.marks;
      if (userAnswers[i] === q.answer) {
        score += q.marks;
      }
    });

    const percentageValue = ((score / totalMarks) * 100).toFixed(1);

    try {
      // Create a clean, serializable copy for the UI and DB
      const cleanQuestions = questions.map(q => {
        const cq: any = {
          text: q.text,
          options: { ...q.options },
          answer: q.answer,
          marks: q.marks || 1
        };
        if (q.id) cq.id = q.id;
        if (q.createdAt) {
          cq.createdAt = {
            seconds: (q.createdAt as any).seconds || 0,
            nanoseconds: (q.createdAt as any).nanoseconds || 0
          };
        }
        return cq;
      });

      const finalResultData = {
        studentId: studentId || 'anonymous',
        studentName: studentName || 'Anonymous Student',
        examId: examId || 'manual',
        examTitle: examTitle || 'Global MCQ Bank Assessment',
        score: score || 0,
        total: totalMarks || 0,
        percentage: `${percentageValue}%`,
        timestamp: serverTimestamp(),
        answers: { ...userAnswers },
        questions: cleanQuestions
      };

      // Attempt to save (rules allow public creation now)
      try {
        await addDoc(collection(db, 'exam_results'), finalResultData);
      } catch (saveErr) {
        // If it still fails, it might be a payload issue
        handleFirestoreError(saveErr, 'create', 'exam_results');
      }
      
      // Sanitized object for React state (no serverTimestamp sentinel)
      const uiResultData = {
        ...finalResultData,
        timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any
      };
      
      onFinish(uiResultData);
    } catch (error) {
      // Allow retry if it fails
      hasSubmitted.current = false;
      setIsSubmitting(false);
      handleFirestoreError(error, 'create', 'exam_results');
    }
  }, [isSubmitting, questions, userAnswers, studentName, onFinish]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePick = (ans: string) => {
    setUserAnswers({ ...userAnswers, [currentIdx]: ans });
  };

  const q = questions[currentIdx];

  return (
    <div className="flex flex-col gap-6 w-full min-h-[calc(100vh-140px)]">
      {/* Prominent High-Visibility Countdown Timer Header */}
      <div 
        id="exam-countdown-timer-banner"
        className={`w-full bg-surface border rounded-3xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md relative overflow-hidden transition-all duration-300 ${
          timeLeft < 120 
            ? 'border-danger/40 bg-danger/5 shadow-danger/5' 
            : 'border-border/80 bg-surface'
        }`}
      >
        {/* Critical low time warning light pulsing behind text */}
        {timeLeft < 120 && (
          <div className="absolute inset-0 bg-danger/4 animate-pulse pointer-events-none" />
        )}
        
        {/* Left Section: Exam Identity and Status info */}
        <div className="flex items-center gap-3.5 z-10 text-center md:text-left">
          <div className={`p-3 rounded-2xl shrink-0 hidden md:flex items-center justify-center ${
            timeLeft < 120 ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-accent/8 text-accent border border-accent/15'
          }`}>
            <Clock size={22} className={timeLeft < 60 ? 'animate-spin' : ''} style={{ animationDuration: timeLeft < 60 ? '4s' : undefined }} />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-center md:justify-start gap-2 text-[10px] font-extrabold uppercase tracking-widest">
              <span className={`w-2 h-2 rounded-full ${timeLeft < 120 ? 'bg-danger animate-ping' : 'bg-success animate-pulse'}`} />
              <span className={timeLeft < 120 ? 'text-danger font-black animate-pulse' : 'text-success'}>
                {timeLeft < 120 ? 'সময় দ্রুত শেষ হচ্ছে (Time is Running Out!)' : 'পরীক্ষা শুরু হয়েছে (Active Assessment Session)'}
              </span>
            </div>
            <h2 className="text-sm md:text-base font-extrabold text-text-main line-clamp-1">
              {examTitle || 'Global MCQ Bank Assessment'}
            </h2>
          </div>
        </div>

        {/* Center Section: Visual Time-Remaining Progress Indicator Bar */}
        <div className="flex-1 w-full max-w-sm lg:max-w-md hidden md:flex flex-col gap-2 z-10">
          <div className="flex justify-between items-center text-[9px] font-extrabold text-text-dim uppercase tracking-wider">
            <span>Timeline Progress</span>
            <span className={timeLeft < 120 ? 'text-danger font-black' : ''}>
              {Math.max(0, Math.round((timeLeft / (timeLimitMinutes * 60)) * 100))}% Time Remaining
            </span>
          </div>
          <div className="w-full bg-surface-hover h-2.5 rounded-full overflow-hidden border border-border/50 p-[1.5px]">
            <motion.div 
              initial={{ width: '100%' }}
              animate={{ width: `${Math.max(0, (timeLeft / (timeLimitMinutes * 60)) * 100)}%` }}
              className={`h-full rounded-full transition-all duration-1000 ${
                timeLeft < 60 ? 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]' : timeLeft < 120 ? 'bg-gold' : 'bg-accent'
              }`}
            />
          </div>
        </div>

        {/* Right Section: Highly Prominent Digital Counter Display */}
        <div className={`flex items-center gap-3 border px-6 py-2.5 rounded-2xl shrink-0 z-10 w-full md:w-auto md:min-w-[190px] justify-center transition-all ${
          timeLeft < 120 
            ? 'bg-danger/10 border-danger/25 text-danger shadow-sm' 
            : 'bg-surface-hover/80 border-border/40 text-text-main'
        }`}>
          <div className="flex flex-col items-center md:items-start leading-none">
            <span className={`text-[8px] font-black uppercase tracking-widest mb-1 ${timeLeft < 120 ? 'text-danger' : 'text-text-dim'}`}>
              Time Remaining
            </span>
            <span className={`text-3xl font-black font-mono tracking-tight leading-none ${timeLeft < 120 ? 'animate-pulse' : ''}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </div>

      {/* Columns Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Student Identity & Live Progress */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          {/* Examinee Profile Identity Card */}
          <div className="bg-surface border border-border/80 rounded-3xl p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden">
            <span className="text-text-dim text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 border-b border-border/30 pb-2.5">
              <User size={12} className="opacity-80" /> Examinee Profile
            </span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/8 border border-accent/15 flex items-center justify-center text-accent font-black text-sm uppercase">
                {studentName ? studentName.substring(0, 2) : 'ST'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black text-text-main truncate">{studentName || 'Student'}</span>
                <span className="text-[10px] font-bold text-text-dim truncate uppercase tracking-tight">{studentId || 'ID: UNSPECIFIED'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-success/8 border border-success/12 rounded-xl p-2.5 text-success">
              <ShieldCheck size={14} className="shrink-0" />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider">Secured Session</span>
                <span className="text-[8px] opacity-90 truncate">Monitoring System Active</span>
              </div>
            </div>
          </div>
          
          {/* Progress Bento */}
          <div className="bg-surface border border-border/80 rounded-3xl p-5 flex flex-col gap-3.5 shadow-sm">
            <div className="flex justify-between items-end">
              <span className="text-text-dim text-[10px] font-bold uppercase tracking-widest">অগ্রগতি (Progress)</span>
              <span className="text-success font-bold text-base">
                {Object.keys(userAnswers).length} <span className="text-text-dim text-xs font-medium">/ {questions.length}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {questions.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 flex-1 min-w-[15px] rounded-full transition-all duration-300 ${
                    i === currentIdx ? 'bg-accent' : userAnswers[i] ? 'bg-success' : 'bg-surface-hover border border-border/50'
                  }`} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Center Column: Question Engine */}
        <div className="col-span-12 lg:col-span-6 bg-surface border border-border/80 rounded-3xl p-6 md:p-8 flex flex-col relative shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 mb-6">
            <span className="bg-accent/8 text-accent px-3 py-1 rounded-md text-[10px] font-bold border border-accent/15">
              प्रश्न নং {currentIdx + 1}
            </span>
            <span className="bg-gold/8 text-gold px-2.5 py-1 rounded-md text-[10px] font-semibold border border-gold/15 uppercase tracking-wider">
              {q.marks} Mark{q.marks !== 1 ? 's' : ''}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex-1 flex flex-col"
            >
              <h2 className="text-lg md:text-xl font-bold leading-relaxed text-text-main mb-8">
                {q.text}
              </h2>
              
              <div className="grid gap-3">
                {(['A', 'B', 'C', 'D'] as const).map(key => {
                  const isSelected = userAnswers[currentIdx] === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handlePick(key)}
                      className={`flex items-center gap-4 p-4 border-2 rounded-2xl transition-all duration-200 group text-left relative overflow-hidden cursor-pointer ${
                        isSelected 
                          ? 'border-accent bg-accent/8 shadow-sm' 
                          : 'border-border/50 bg-surface hover:border-accent/40 hover:bg-surface-hover/30'
                      }`}
                    >
                      <div className={`w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center font-bold text-sm transition-all duration-200 ${
                        isSelected 
                          ? 'bg-accent text-white' 
                          : 'bg-surface-hover text-text-dim group-hover:bg-accent/10 group-hover:text-accent'
                      }`}>
                        {key === 'A' ? 'ক' : key === 'B' ? 'খ' : key === 'C' ? 'গ' : 'घ'}
                      </div>
                      <span className={`text-[15px] font-semibold transition-colors ${isSelected ? 'text-text-main' : 'text-text-dim group-hover:text-text-main'}`}>
                        {q.options[key]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
          
          <div className="mt-8 flex justify-between pt-6 border-t border-border/40">
            <button 
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => prev - 1)}
              className="px-5 py-2.5 bg-surface-hover/80 hover:bg-surface-hover border border-border/80 rounded-xl text-xs font-bold text-text-main transition-all disabled:opacity-20 active:scale-95 cursor-pointer"
            >
              আগের (Prev)
            </button>
            
            {currentIdx === questions.length - 1 ? (
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-success hover:bg-success/95 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'প্রক্রিয়াকরণ...' : 'জমা দিন (Submit)'}
              </button>
            ) : (
              <button 
                onClick={() => setCurrentIdx(prev => prev + 1)}
                className="px-6 py-2.5 bg-accent hover:bg-accent2 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                পরের (Next)
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Navigation Grid */}
        <div className="col-span-12 lg:col-span-3 bg-surface border border-border/80 rounded-3xl p-6 overflow-hidden flex flex-col shadow-sm">
          <h3 className="text-text-dim text-[10px] font-bold uppercase tracking-widest mb-6 flex items-center gap-1.5">
            <LayoutDashboard size={13} className="opacity-80" /> प्रश्न নেভিগেশন (Navigation)
          </h3>
          <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={`aspect-square rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-200 relative cursor-pointer ${
                  i === currentIdx 
                    ? 'bg-accent text-white shadow-sm ring-2 ring-accent/15 z-10 scale-[1.05]' 
                    : userAnswers[i] 
                      ? 'bg-success text-white' 
                      : 'bg-surface-hover border border-border/50 text-text-dim hover:border-accent/40'
                }`}
              >
                {i + 1}
                {userAnswers[i] && !(i === currentIdx) && (
                  <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-white rounded-full flex items-center justify-center">
                     <div className="w-1.5 h-1.5 bg-success rounded-full" />
                  </div>
                )}
              </button>
            ))}
          </div>
          
          <div className="mt-auto pt-6 border-t border-border/40 flex flex-col gap-2.5">
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3 bg-danger/8 hover:bg-danger/15 text-danger border border-danger/10 rounded-xl font-bold text-xs uppercase tracking-wider transition-all mb-3 cursor-pointer"
            >
              {isSubmitting ? 'প্রক্রিয়াকরণ...' : 'পরীক্ষা শেষ করুন (Finish)'}
            </button>
            
            <div className="flex items-center gap-2.5 text-[10px] font-bold text-text-dim uppercase tracking-wider">
              <div className="w-3 h-3 bg-success rounded shadow-sm"></div>
              <span>উত্তর দেওয়া হয়েছে (Answered)</span>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] font-bold text-text-dim uppercase tracking-wider">
              <div className="w-3 h-3 bg-accent rounded shadow-sm"></div>
              <span>বর্তমান প্রশ্ন (Current)</span>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] font-bold text-text-dim uppercase tracking-wider">
              <div className="w-3 h-3 bg-surface-hover border border-border/50 rounded shadow-sm"></div>
              <span>বাকি আছে (Pending)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

