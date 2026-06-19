import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Page, Exam } from '../types';
import { 
  GraduationCap, 
  Play, 
  ArrowRight, 
  BookOpen, 
  Clock, 
  Award, 
  ShieldCheck, 
  Search, 
  Activity, 
  Zap, 
  ChevronRight, 
  Trophy, 
  Download, 
  HelpCircle, 
  CheckCircle,
  FileText,
  Sparkles
} from 'lucide-react';

interface HomePageProps {
  exams: Exam[];
  onNavigate: (page: Page) => void;
  onSelectExam?: (exam: Exam) => void;
  isAuthenticated: boolean;
  logoSettings?: {
    logoType?: 'text' | 'image' | 'both';
    logoText?: string;
    logoUrl?: string;
    heroImageUrl?: string;
  };
}

export default function HomePage({ exams, onNavigate, onSelectExam, isAuthenticated, logoSettings }: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('All');

  // Filter published exams for active listing
  const activeExams = useMemo(() => {
    return exams.filter(e => e.isPublished);
  }, [exams]);

  // Derive dynamic stats from db
  const totalQuestionsCount = useMemo(() => {
    return activeExams.reduce((sum, exam) => sum + (exam.questions?.length || 0), 0);
  }, [activeExams]);

  const totalExamsCount = activeExams.length;

  // Dynamically extract unique subject categories from active exams in the database
  const dynamicCategories = useMemo(() => {
    const subjectsMap = new Map<string, { name: string; count: number; totalQuestions: number }>();
    
    activeExams.forEach(e => {
      const subjectName = e.subject?.trim() || 'General Evaluation';
      if (!subjectsMap.has(subjectName)) {
        subjectsMap.set(subjectName, {
          name: subjectName,
          count: 0,
          totalQuestions: 0
        });
      }
      const data = subjectsMap.get(subjectName)!;
      data.count += 1;
      data.totalQuestions += e.questions?.length || 0;
    });

    const parsed = Array.from(subjectsMap.values()).map((sub, idx) => {
      // Pick classic premium styling palettes dynamically
      const colorSchemes = [
        { color: 'from-accent/5 to-accent/10 border-accent/20 dark:border-accent/15 text-accent', icon: Zap },
        { color: 'from-teal-500/5 to-teal-500/10 border-teal-500/20 dark:border-teal-500/15 text-teal-600 dark:text-teal-400', icon: GraduationCap },
        { color: 'from-amber-500/5 to-amber-500/10 border-amber-500/20 dark:border-amber-500/15 text-amber-600 dark:text-amber-400', icon: Trophy },
        { color: 'from-indigo-500/5 to-indigo-500/10 border-indigo-500/20 dark:border-indigo-500/15 text-indigo-600 dark:text-indigo-400', icon: Activity }
      ];
      const scheme = colorSchemes[idx % colorSchemes.length];
      
      const lower = sub.name.toLowerCase();
      let banglaLabel = 'পরীক্ষা ক্যাটালগ';
      if (lower.includes('ict') || lower.includes('computer') || lower.includes('আইসিটি')) {
        banglaLabel = 'তথ্য ও যোগাযোগ প্রযুক্তি';
      } else if (lower.includes('bcs') || lower.includes('job') || lower.includes('competitive')) {
        banglaLabel = 'চাকরি ও বিসিএস প্রস্তুতি';
      } else if (lower.includes('hsc') || lower.includes('h.s.c')) {
        banglaLabel = 'এইচএসসি কোর্স মূল্যায়ন';
      } else if (lower.includes('admission') || lower.includes('ভর্তি')) {
        banglaLabel = 'বিশ্ববিদ্যালয় ভর্তি পরীক্ষা';
      }

      return {
        name: sub.name,
        code: sub.name,
        count: sub.count,
        totalQuestions: sub.totalQuestions,
        color: scheme.color,
        icon: scheme.icon,
        label: banglaLabel
      };
    });

    return parsed;
  }, [activeExams]);

  // Apply fuzzy search & filtering
  const filteredExams = useMemo(() => {
    return activeExams.filter(exam => {
      const matchesSearch = exam.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (exam.topic && exam.topic.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (selectedSubjectFilter === 'All') return matchesSearch;
      
      return matchesSearch && exam.subject === selectedSubjectFilter;
    });
  }, [activeExams, searchQuery, selectedSubjectFilter]);

  const handleStartJourney = () => {
    if (isAuthenticated) {
      onNavigate('setup');
    } else {
      onNavigate('login');
    }
  };

  const handleTakeExamCard = (exam: Exam) => {
    if (onSelectExam) {
      onSelectExam(exam);
    }
    if (isAuthenticated) {
      onNavigate('setup');
    } else {
      onNavigate('login');
    }
  };

  return (
    <div className="space-y-16 py-4" id="ict-mcq-homepage-wrapper">
      
      {/* 1. PREMIUM SPLIT HERO BANNER */}
      <div 
        id="homepage-landing-hero"
        className="relative bg-gradient-to-br from-[#120a23] via-[#170e2c] to-[#0a0516] rounded-[32px] overflow-hidden border border-border/80 dark:border-purple-500/10 shadow-2xl min-h-[480px]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0 min-h-[480px]">
          {/* Left Text Block */}
          <div className="lg:col-span-7 p-8 md:p-12 lg:p-16 flex flex-col justify-center space-y-6 relative z-10 text-left">
            {/* Luminous soft metallic lighting */}
            <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-10 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Small Elegant Badge */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex self-start items-center gap-2 px-3 py-1 bg-accent-soft border border-accent/20 rounded-full text-accent font-black tracking-widest text-[9px] uppercase"
            >
              <Sparkles size={11} className="animate-pulse" /> Continuous Testing Ecosystem
            </motion.div>

            {/* Welcome Text */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight select-none">
                Welcome to <span className="font-black text-4xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-accent via-indigo-200 to-accent tracking-tighter block mt-2">ICT MCQ TEST</span>
              </h1>
              
              <p className="text-sm md:text-base text-purple-200/60 font-normal max-w-xl leading-relaxed">
                Boost your exam preparation with dynamic MCQ tests curated from the 'ICT MCQ Decoder' book. Evaluate your skills for BCS, NTRCA, and Bank IT exams with instant results.
              </p>
            </motion.div>

            {/* Buttons */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3 pt-2"
            >
              <button 
                type="button"
                onClick={handleStartJourney}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-accent hover:bg-accent2 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0"
              >
                <Play size={12} fill="currentColor" /> Start Quick Quiz
              </button>
              
              <button 
                type="button"
                onClick={() => {
                  const el = document.getElementById('homepage-active-exams-list');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-all border border-white/10 hover:bg-white/12 active:scale-95 cursor-pointer shrink-0"
              >
                Browse Exams Bank
              </button>
            </motion.div>

            {/* Dynamic Database Statistics Section (Questions & Categories imported from Firestore database) */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="grid grid-cols-3 gap-3 md:gap-8 max-w-xl mt-8 w-full border-t border-white/5 pt-6"
            >
              <div className="flex flex-col justify-center">
                <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-mono">
                  {totalQuestionsCount}
                </span>
                <span className="text-[9px] md:text-[10px] font-bold text-purple-200/40 uppercase tracking-widest mt-1">
                  Live DB Questions
                </span>
              </div>
              <div className="flex flex-col justify-center border-l border-white/5 pl-4 md:pl-8">
                <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-mono">
                  {dynamicCategories.length}
                </span>
                <span className="text-[9px] md:text-[10px] font-bold text-purple-200/40 uppercase tracking-widest mt-1">
                  Active Topics
                </span>
              </div>
              <div className="flex flex-col justify-center border-l border-white/5 pl-4 md:pl-8">
                <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-mono">
                  {totalExamsCount}
                </span>
                <span className="text-[9px] md:text-[10px] font-bold text-purple-200/40 uppercase tracking-widest mt-1">
                  Available Sheets
                </span>
              </div>
            </motion.div>
          </div>

          {/* Right Image Block with dual gradient slash overlays */}
          <div className="lg:col-span-5 relative min-h-[320px] lg:min-h-full overflow-hidden flex items-stretch">
            <div className="absolute top-0 left-0 bottom-0 w-24 bg-[#120a23] transform -skew-x-12 origin-top-left hidden lg:block z-10" />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#120a23] via-[#120a23]/30 to-transparent z-10 pointer-events-none" />
            <img 
              src={logoSettings?.heroImageUrl || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80"}
              alt="Workspace and Student Practice Portal" 
              className="w-full h-full object-cover select-none"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      {/* 2. LIVE INTEGRATED SEARCH & SUGGEST */}
      <div 
        id="homepage-fuzzy-search"
        className="bg-surface border border-border/60 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between"
      >
        <div className="flex items-center gap-3 w-full md:max-w-md relative">
          <Search className="absolute left-4 text-text-dim" size={15} />
          <input 
            type="text" 
            placeholder={`Search among our ${totalQuestionsCount} verified database exam questions...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-hover border border-border/40 outline-none rounded-xl py-3 pl-11 pr-5 text-xs font-bold text-text-main transition-all placeholder:text-text-dim/60 focus:border-accent/40 focus:bg-surface"
          />
        </div>

        {/* Inline Category Quick Toggles directly mapped to DB Subjects */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto justify-end overflow-x-auto">
          <button
            onClick={() => setSelectedSubjectFilter('All')}
            className={`px-4 py-2 rounded-lg text-[9px] font-extrabold uppercase tracking-widest transition-all cursor-pointer shrink-0 ${
              selectedSubjectFilter === 'All' 
                ? 'bg-accent/8 text-accent border border-accent/20 font-black' 
                : 'bg-surface-hover/40 text-text-dim border border-border/20 hover:text-text-main hover:bg-surface-hover'
            }`}
          >
            All Live Exams
          </button>
          {dynamicCategories.map((sub) => (
            <button
              key={sub.code}
              onClick={() => setSelectedSubjectFilter(sub.code)}
              className={`px-4 py-2 rounded-lg text-[9px] font-extrabold uppercase tracking-widest transition-all cursor-pointer shrink-0 ${
                selectedSubjectFilter === sub.code 
                  ? 'bg-accent/8 text-accent border border-accent/20 font-black' 
                  : 'bg-surface-hover/40 text-text-dim border border-border/20 hover:text-text-main hover:bg-surface-hover'
              }`}
            >
              {sub.code}
            </button>
          ))}
        </div>
      </div>

      {/* 3. DYNAMIC CATEGORY GRID (Imported directly from database unique subjects) */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Real-time Subject Index</span>
          <h2 className="text-xl font-bold text-text-main tracking-tight font-sans">এক্সাম ক্যাটাগরি সমূহ (Active Topics in DB)</h2>
        </div>

        {dynamicCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dynamicCategories.map((cat, idx) => {
              const isSelected = selectedSubjectFilter === cat.code;
              return (
                <div 
                  key={idx}
                  onClick={() => {
                    setSelectedSubjectFilter(isSelected ? 'All' : cat.code);
                    const el = document.getElementById('homepage-active-exams-list');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`bg-gradient-to-br ${cat.color} p-5 border rounded-2xl flex items-center justify-between group cursor-pointer transition-all hover:scale-[1.01] ${
                    isSelected ? 'ring-2 ring-accent border-accent/30 shadow-md' : ''
                  }`}
                >
                  <div className="flex flex-col gap-1 min-w-0 pr-2">
                    <span className="text-[8px] font-black uppercase tracking-wider opacity-60">Verified Route</span>
                    <span className="text-xs font-black text-text-main truncate">{cat.name}</span>
                    <span className="text-[10px] font-bold text-text-dim mt-0.5">{cat.label}</span>
                  </div>
                  <div className="bg-surface border border-border/20 p-2.5 rounded-xl shrink-0 group-hover:scale-105 transition-all text-text-main">
                    <span className="text-[10px] font-mono font-bold block">{cat.count} List</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-surface border border-dashed border-border/60 p-8 rounded-2xl text-center text-text-dim text-xs">
            No unique active topics detected. Standard categories will populate as soon as exams are created.
          </div>
        )}
      </div>

      {/* 4. REALTIME ACTIVE EXAMS LIST */}
      <div id="homepage-active-exams-list" className="space-y-6">
        <div className="flex items-end justify-between border-b border-border/40 pb-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-success uppercase tracking-widest">Active Verification Assessments</span>
            <h2 className="text-xl md:text-2xl font-black text-text-main tracking-tight font-sans">সরাসরি পেইড ও ফ্রি লাইভ পরীক্ষা (Assigned DB Assessment Sheets)</h2>
          </div>
          <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider bg-surface-hover border border-border/50 px-3 py-1 rounded-lg">
            {filteredExams.length} Exams Listed
          </span>
        </div>

        {filteredExams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => (
              <div 
                key={exam.id} 
                className="bg-surface border border-border/60 hover:border-accent/30 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Price and duration metadata line */}
                <div className="flex items-center justify-between mb-5">
                  <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                    exam.price > 0 
                      ? 'bg-amber-600/10 text-amber-600 border-amber-500/15' 
                      : 'bg-success/10 text-success border-success/15'
                  }`}>
                    {exam.price > 0 ? `৳${exam.price} BDT PREMIUM` : 'FREE ACCESS'}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-text-dim uppercase tracking-widest bg-surface-hover px-2.5 py-0.5 rounded-md">
                    <Clock size={11} /> {exam.timeLimit} Mins
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <h3 className="font-extrabold text-sm md:text-base text-text-main group-hover:text-accent transition-colors line-clamp-1">
                    {exam.subject}
                  </h3>
                  <p className="text-[11px] text-text-dim line-clamp-2 leading-relaxed">
                    Topic: {exam.topic ? (
                      exam.topic.length > 25 ? (
                        exam.topic
                      ) : (
                        `${exam.topic} — Verified continuous evaluation curriculum matching central academy standards. Complete with prompt reporting features.`
                      )
                    ) : (
                      'General Evaluation Package — Verified continuous evaluation curriculum matching central academy standards. Complete with prompt reporting features.'
                    )}
                  </p>
                </div>

                {/* Question counters imported directly from database questions */}
                <div className="grid grid-cols-2 gap-3 bg-surface-hover/50 border border-border/30 rounded-2xl p-3 mb-6 text-center">
                  <div className="flex flex-col">
                    <span className="text-[12px] font-black text-text-main font-mono">
                      {exam.questions?.length || 0} Questions
                    </span>
                    <span className="text-[8px] font-extrabold text-text-dim uppercase tracking-wider">
                      Dynamic Count
                    </span>
                  </div>
                  <div className="flex flex-col border-l border-border/30">
                    <span className="text-[12px] font-black text-text-main font-mono">
                      {exam.questions ? exam.questions.reduce((s, q) => s + (q.marks || 1), 0) : 0} Marks
                    </span>
                    <span className="text-[8px] font-extrabold text-text-dim uppercase tracking-wider">
                      Evaluation Weights
                    </span>
                  </div>
                </div>

                {/* Take active exam card */}
                <button
                  type="button"
                  onClick={() => handleTakeExamCard(exam)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent2 text-white font-bold py-3 rounded-2xl transition-all shadow-sm active:scale-95 uppercase tracking-widest text-[9px] cursor-pointer"
                >
                  পরীক্ষায় অংশ নিন (Start Exam) <ChevronRight size={11} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center bg-surface border border-dashed border-border/60 rounded-3xl p-12 flex flex-col items-center justify-center gap-3">
            <BookOpen size={32} className="text-text-dim opacity-60" />
            <span className="text-xs font-black text-text-main">কোনো সক্রিয় পরীক্ষা পাওয়া যায়নি (No matching evaluation sheets found)</span>
            <span className="text-[10px] text-text-dim uppercase tracking-wider">Try selecting alternative categories or clearing filters</span>
          </div>
        )}
      </div>

      {/* 5. MINIMALIST KEY VALUE FEATURES */}
      <div 
        id="homepage-features-section"
        className="bg-surface border border-border/60 rounded-[28px] p-6 md:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
      >
        <div className="lg:col-span-12 text-center max-w-2xl mx-auto space-y-2 mb-4">
          <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Why Choose ICT MCQ TEST</span>
          <h2 className="text-2xl font-bold text-text-main tracking-tight font-sans">
            আমাদের বিশেষ সেবাসমূহ (Assessment Highlights)
          </h2>
          <p className="text-xs text-text-dim leading-relaxed">
            We deliver pristine online evaluations with fast validation features, designed specifically to replicate standard test routines.
          </p>
        </div>

        <div className="lg:col-span-4 bg-surface-hover/30 border border-border/20 p-6 rounded-2xl flex flex-col gap-4">
          <div className="w-9 h-9 rounded-xl bg-accent/8 border border-accent/10 flex items-center justify-center text-accent">
            <Award size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-main mb-1.5">Certification Standard</h3>
            <p className="text-xs text-text-dim leading-relaxed">
              Earn certified badges instantly upon scoring 70%+ credentials. Access accredited PDF report sheets with verified performance statistics.
            </p>
          </div>
        </div>

        <div className="lg:col-span-4 bg-surface-hover/30 border border-border/20 p-6 rounded-2xl flex flex-col gap-4">
          <div className="w-9 h-9 rounded-xl bg-teal-500/8 border border-teal-500/10 flex items-center justify-center text-teal-500">
            <Download size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-main mb-1.5">Prompt PDF Generation</h3>
            <p className="text-xs text-text-dim leading-relaxed">
              One-click fast PDF generation compiles correct answers, timestamps, student metrics and verified institutional brand logo.
            </p>
          </div>
        </div>

        <div className="lg:col-span-4 bg-surface-hover/30 border border-border/20 p-6 rounded-2xl flex flex-col gap-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/8 border border-indigo-500/10 flex items-center justify-center text-indigo-500">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-main mb-1.5 font-sans">Anti-Cheating Assurance</h3>
            <p className="text-xs text-text-dim leading-relaxed">
              Secured timers, automated submission triggers, and randomized question order keep assessments fully rigorous and tamper-free.
            </p>
          </div>
        </div>
      </div>

      {/* 6. CONVERSATIONAL FAQS SHORTCUT */}
      <div className="bg-gradient-to-r from-accent/5 to-amber-500/5 border border-border/60 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center shrink-0 shadow-md">
            <HelpCircle size={18} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-text-main">নির্দিষ্ট কোনো প্রশ্ন বা সাহায্য প্রয়োজন?</span>
            <span className="text-[10px] text-text-dim">আমরা আপনাকে পরীক্ষার পেমেন্ট এবং নিয়মাবলী বুঝতে সাহায্য করব।</span>
          </div>
        </div>
        
        <button
          type="button"
          onClick={() => onNavigate('faq')}
          className="bg-accent hover:bg-accent2 text-white font-bold px-5 py-3 rounded-xl text-[10px] uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
        >
          জিজ্ঞাসাবাদে প্রবেশ করুন (View FAQ Hub)
        </button>
      </div>

    </div>
  );
}
