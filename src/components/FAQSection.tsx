import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ChevronDown, Search, Award, CreditCard, Clock, FileText, CheckCircle, ShieldAlert } from 'lucide-react';

interface FAQItem {
  id: string;
  category: 'general' | 'exam' | 'payments';
  question: string;
  answer: string;
  banglaQuestion?: string;
  banglaAnswer?: string;
}

export default function FAQSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'general' | 'exam' | 'payments'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const faqs: FAQItem[] = [
    {
      id: 'exam-process-1',
      category: 'exam',
      question: 'How do I start an live exam assessment?',
      banglaQuestion: 'আমি কিভাবে লাইভ পরীক্ষা শুরু করব?',
      answer: "Go to the 'Exam' board from the navigation tab. Find your desired exam, and click 'Get Started' or 'Take Exam'. If the exam requires access clearance, complete the pending checkout / approval verification step to instantly activate it on your profile.",
      banglaAnswer: "নেভিগেশন ট্যাব থেকে 'Exam' বোর্ডে যান। আপনার পছন্দসই পরীক্ষাটি খুঁজুন এবং 'Get Started' বা 'Take Exam' এ ক্লিক করুন। যদি পরীক্ষার জন্য অ্যাক্সেস অনুমতির প্রয়োজন হয়, তবে অবিলম্বে আপনার প্রোফাইলে এটি সক্রিয় করতে পেমেন্ট অনুমোদন সম্পন্ন করুন।"
    },
    {
      id: 'exam-process-2',
      category: 'exam',
      question: 'What happens if my connection drops midway through an assessment?',
      banglaQuestion: 'পরীক্ষার মাঝামাঝি ইন্টারনেট সংযোগ বিচ্ছিন্ন হলে কী হবে?',
      answer: "Do not worry! The exam progress, answers selected, and current timeline states are continuously tracked. Refreshing the dashboard or restoring internet will return you to the active assessment frame. Please submit completed sheets prior to the timer count down exceeding limits.",
      banglaAnswer: "চিন্তা করবেন না! পরীক্ষার অগ্রগতি, নির্বাচিত উত্তর এবং বর্তমান সময়সীমা ক্রমাগত পর্যবেক্ষণ করা হয়। ড্যাশবোর্ড রিফ্রেশ করা বা ইন্টারনেট পুনরুদ্ধার করা আপনাকে সরাসরি সক্রিয় পরীক্ষা ফ্রেমে ফিরিয়ে আনবে। সময় শেষ হওয়ার আগে অবশ্যই সাবমিট করুন।"
    },
    {
      id: 'exam-process-3',
      category: 'exam',
      question: 'Can I retake an exam after submission?',
      banglaQuestion: 'একবার জমা দেওয়ার পর আমি কি আবার পরীক্ষা দিতে পারব?',
      answer: "Yes! While initial assessments establish formal institutional records, students can retake exams to build clarity, refine performance ratios, and generate fresh secure accreditation stamp PDF certificates.",
      banglaAnswer: "হ্যাঁ! প্রাথমিক মূল্যায়নটি আপনার প্রাতিষ্ঠানিক রেকর্ড গঠন করলেও, শিক্ষার্থীরা তাদের ধারণার স্পষ্টতা বাড়াতে, পারফরম্যান্স উন্নত করতে এবং নতুন সুরক্ষিত পিডিএফ সার্টিফিকেট ডাউনলোড করতে পরীক্ষা পুনরায় দিতে পারবেন।"
    },
    {
      id: 'payments-1',
      category: 'payments',
      question: 'How can I clear pending payments for paid exams?',
      banglaQuestion: 'পেইড পরীক্ষার বকেয়া পেমেন্ট কীভাবে পরিশোধ করব?',
      answer: "To clear a pending payment, select 'Take Exam' on a paid test, input your mobile banking info (bKash/Nagad/Rocket), and submit the transaction ID (TrxID). Our administrative portal will cross-examine the transaction and verify your credential clearance instantly.",
      banglaAnswer: "বকেয়া পেমেন্ট পরিশোধ করতে পেইড পরীক্ষার 'Take Exam'-এ ক্লিক করুন, আপনার মোবাইল ব্যাংকিং তথ্য (বিকাশ/নগদ/রকেট) প্রদান করুন এবং ট্রানজেকশন আইডি (TrxID) সাবমিট করুন। আমাদের এডমিন পোর্টাল তাৎক্ষণিকভাবে এটি যাচাই করে অ্যাক্সেস ক্লিয়ার করবে।"
    },
    {
      id: 'payments-2',
      category: 'payments',
      question: 'How long does payment approval verification take?',
      banglaQuestion: 'পেমেন্ট অনুমোদন ভেরিফিকেশন কতো সময় নেয়?',
      answer: "Payment crosscheck verification is processed securely through real-time admin sync. Manual reviews typically clear within 5-15 minutes, enabling full instantaneous exam question accessibility in the portal log.",
      banglaAnswer: "আমাদের রিয়েল-টাইম এডমিন সিঙ্ক পেমেন্ট ভেরিফিকেশন সম্পন্ন করে। সাধারণত ৫-১৫ মিনিটের মধ্যে ম্যানুয়াল রিভিউ শেষ হয় এবং পোর্টালে পরীক্ষার সম্পূর্ণ অ্যাক্সেস পাওয়া যায়।"
    },
    {
      id: 'payments-3',
      category: 'payments',
      question: 'What should I do if my payment transaction ID is rejected?',
      banglaQuestion: 'আমার পেমেন্ট ট্রানজেকশন আইডি বাতিল হলে কী করব?',
      answer: "Verify that the input TrxID is correct. If it was rejected by error, please contact the institutional center or click support directly. You can edit and resubmit your payment slip with the correct transaction reference from the panel.",
      banglaAnswer: "প্রথমে নিশ্চিত হোন যে আপনার এন্টারকৃত TrxID সঠিক আছে কিনা। যদি ভুলবশত এটি বাতিল হয়, তাহলে সঠিক ট্রানজেকশন আইডি সহ নতুন একটি স্লিপ সাবমিট করুন অথবা সরাসরি এডমিনের সাথে যোগাযোগ করুন।"
    },
    {
      id: 'general-1',
      category: 'general',
      question: 'What is the passing criteria for getting certified?',
      banglaQuestion: 'সার্টিফিকেট পাওয়ার জন্য পাস করার যোগ্যতা কী?',
      answer: "Students achieving a threshold marks value above 70% during the assessments are automatically rated with high marks efficiency, securing an immediate accredited certification status downloadable in formal print layout.",
      banglaAnswer: "যেসব শিক্ষার্থী পরীক্ষায় ৭০% বা তার বেশি নম্বর পাবে, তাদের প্রোফাইলে স্বয়ংক্রিয়ভাবে একটি সার্টিফাইড ব্যাজ যুক্ত হবে এবং তারা একটি সুরক্ষিত পিডিএফ সার্টিফিকেট ডাউনলোড করতে পারবে।"
    },
    {
      id: 'general-2',
      category: 'general',
      question: 'Where can I find and download my verified exam report card?',
      banglaQuestion: 'আমি আমার ভেরিফাইড পরীক্ষার রিপোর্ট কার্ড কোথায় পাব এবং ডাউনলোড করব?',
      answer: "Go to the 'Records' page from the main header navigation menu. Your complete history profile displays active marks percentages, scores, and timestamps. Simply click 'PDF Download' on any certified entry to generate your document.",
      banglaAnswer: "মেনু থেকে সরাসরি 'Records' পৃষ্ঠায় চলে যান। আপনার অতীতের সমস্ত পরীক্ষার শতাংশ, প্রাপ্ত নম্বর এবং তারিখের তালিকা দেখতে পাবেন। যেকোনো পরীক্ষার বিপরীতে থাকা 'PDF Download' বাটনে ক্লিক করলেই সার্টিফিকেট ডাউনলোড হয়ে যাবে।"
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const categoryMatches = activeCategory === 'all' || faq.category === activeCategory;
    const searchLower = searchQuery.toLowerCase();
    const queryMatches = 
      faq.question.toLowerCase().includes(searchLower) ||
      faq.answer.toLowerCase().includes(searchLower) ||
      (faq.banglaQuestion && faq.banglaQuestion.includes(searchLower)) ||
      (faq.banglaAnswer && faq.banglaAnswer.includes(searchLower));
    return categoryMatches && queryMatches;
  });

  const categories = [
    { id: 'all', label: 'All Questions', icon: HelpCircle },
    { id: 'exam', label: 'Exam Board', icon: Clock },
    { id: 'payments', label: 'Fees & Payment', icon: CreditCard },
    { id: 'general', label: 'Certificates', icon: Award }
  ] as const;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="max-w-4xl mx-auto flex flex-col gap-8 px-4 py-6"
      id="faq-section-container"
    >
      {/* Decorative Top Banner */}
      <div className="bg-surface border border-b-border/40 border-border/80 rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row items-center gap-6 shadow-sm">
        <div className="bg-accent/8 border border-accent/15 p-4 rounded-2xl text-accent shrink-0">
          <HelpCircle size={40} className="opacity-90" />
        </div>
        <div className="flex flex-col gap-1.5 text-center md:text-left">
          <div className="text-[10px] font-extrabold text-accent uppercase tracking-widest">
            Support Portal & Assessment Guides
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-text-main tracking-tight leading-tight">
            প্রশ্নোত্তর ও গাইডলাইন (FAQ Section)
          </h1>
          <p className="text-xs text-text-dim max-w-lg leading-relaxed">
            Need clarity on online paid MCQ assessments, exam routines, verification queues, or print-ready PDF certificate downloads? Browse our official resource questions.
          </p>
        </div>
      </div>

      {/* Interactive Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Category Toggles */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-surface-hover/80 rounded-2xl border border-border/50 max-w-max">
          {categories.map(cat => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setExpandedId(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all duration-200 uppercase tracking-wider cursor-pointer ${
                  isSelected 
                    ? 'bg-surface text-accent shadow-sm border border-border/20 font-black' 
                    : 'text-text-dim hover:text-text-main'
                }`}
              >
                <cat.icon size={12} className={isSelected ? 'text-accent' : 'text-text-dim'} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Fuzzy Search Box */}
        <div className="relative flex-1 md:max-w-xs">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            type="text"
            placeholder="Search FAQs (ইংরেজি বা বাংলা)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border/80 focus:border-accent/60 outline-none rounded-2xl py-3 pl-11 pr-5 text-[11px] font-bold text-text-main transition-all duration-300 placeholder:text-text-dim/60 shadow-sm"
          />
        </div>
      </div>

      {/* Accordions Container */}
      <div className="flex flex-col gap-3">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, idx) => {
            const isExpanded = expandedId === faq.id;
            return (
              <div
                key={faq.id}
                className={`bg-surface border rounded-2xl overflow-hidden transition-all duration-300 ${
                  isExpanded 
                    ? 'border-accent shadow-md bg-surface/90' 
                    : 'border-border/60 hover:border-border'
                }`}
              >
                {/* Header Switcher */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                  className="w-full text-left px-5 py-4.5 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex flex-col gap-1 pr-4">
                    {/* EN Title */}
                    <span className="text-[13px] md:text-[14px] font-black text-text-main leading-snug">
                      {faq.question}
                    </span>
                    {/* BN Title */}
                    {faq.banglaQuestion && (
                      <span className="text-xs font-semibold text-accent leading-snug">
                        {faq.banglaQuestion}
                      </span>
                    )}
                  </div>
                  
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    isExpanded 
                      ? 'bg-accent/10 text-accent rotate-180' 
                      : 'bg-surface-hover/80 text-text-dim'
                  }`}>
                    <ChevronDown size={14} />
                  </div>
                </button>

                {/* Collapsible Answer State */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="px-5 pb-5 pt-1.5 border-t border-border/30 flex flex-col gap-4 text-xs md:text-[13px]">
                        {/* EN Answer */}
                        <div className="flex gap-2.5 items-start bg-surface-hover/40 p-3 rounded-xl border border-border/30">
                          <CheckCircle size={14} className="text-success shrink-0 mt-0.5" />
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-text-dim">English Guide</span>
                            <p className="text-text-main font-medium leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        </div>

                        {/* BN Answer */}
                        {faq.banglaAnswer && (
                          <div className="flex gap-2.5 items-start bg-accent/4 p-3 rounded-xl border border-accent/10">
                            <CheckCircle size={14} className="text-accent shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-extrabold uppercase tracking-widest text-accent/85">বাংলা গাইডলাইন</span>
                              <p className="text-text-main font-semibold leading-relaxed">
                                {faq.banglaAnswer}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        ) : (
          <div className="bg-surface border border-dashed border-border/80 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
            <ShieldAlert size={36} className="text-text-dim opacity-70" />
            <h3 className="font-extrabold text-sm text-text-main">কোনো তথ্য পাওয়া যায়নি (No FAQ Articles Found)</h3>
            <p className="text-[10px] text-text-dim uppercase tracking-wider">
              Try adjusting your search criteria or keywords
            </p>
          </div>
        )}
      </div>

      {/* Additional Help Section */}
      <div className="border border-border/80 rounded-3xl p-5 bg-surface flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/8 flex items-center justify-center text-success border border-success/15 shrink-0">
            <FileText size={18} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-black text-text-main">Still experiencing credential verification issues?</span>
            <span className="text-[10px] font-semibold text-text-dim">Our tech assistance center is online 24/7.</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => alert("Please direct all transaction-related details or credential validation matters to our Admin support representative.")}
          className="bg-accent hover:bg-accent2 text-white font-black px-4.5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          Contact Coordinator
        </button>
      </div>
    </motion.div>
  );
}
