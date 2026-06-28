import React, { useState } from 'react';
import { ExamRoutine } from '../types';
import { Calendar, Download, Eye, FileText, Search, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { openOrDownloadRoutine } from '../utils/fileDownloader';

interface StudentRoutinesProps {
  routines: ExamRoutine[];
}

export default function StudentRoutines({ routines }: StudentRoutinesProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoutines = routines.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* HEADER BAR */}
      <div className="bg-surface border border-border/80 rounded-[2.5rem] p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-accent/8 border border-accent/15 px-3 py-1 rounded-full text-[10px] text-accent font-extrabold uppercase tracking-wider">
            <Sparkles size={11} /> Published Calendars
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-text-main font-sans tracking-tight uppercase">
            Official Exam Routines
          </h2>
          <p className="text-text-dim text-xs font-semibold uppercase tracking-wider">
            Access secure examination schedules, syllabus details, and instructions.
          </p>
        </div>

        {/* Search */}
        <div className="relative md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search schedules or keywords..."
            className="w-full bg-bg/60 border border-border/80 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold outline-none focus:border-accent focus:bg-surface transition-all"
          />
          <Search size={14} className="text-text-dim absolute left-3 top-3.5" />
        </div>
      </div>

      {/* ROUTINES LIST */}
      <div className="space-y-4">
        {filteredRoutines.map((item, index) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            key={item.id || index}
            className="bg-surface border border-border/80 rounded-[2rem] p-6 hover:border-accent/30 transition-all shadow-sm flex flex-col gap-5"
          >
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border ${
                    item.routineType === 'pdf'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : item.routineType === 'image'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {item.routineType === 'pdf' ? 'PDF Document' : item.routineType === 'image' ? 'Image ROUTINE' : 'Text Broadcast'}
                  </span>

                  <span className="text-[10px] text-text-dim font-bold flex items-center gap-1">
                    <Calendar size={12} />
                    {item.createdAt?.seconds 
                      ? new Date(item.createdAt.seconds * 1000).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
                      : 'Recently updated'
                    }
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-text-main uppercase tracking-wide">
                  {item.title}
                </h3>
              </div>

              {/* Download / Open action if URL exists */}
              {item.fileUrl && (
                <button
                  onClick={() => openOrDownloadRoutine(item.fileUrl, item.routineType, item.title)}
                  className="bg-accent hover:bg-accent-hover text-white font-extrabold px-4.5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-2 transition-colors shadow-sm cursor-pointer border-none outline-none"
                >
                  <Download size={13} />
                  {item.routineType === 'pdf' ? 'Open PDF File' : 'Save Routine'}
                </button>
              )}
            </div>

            {/* Description note */}
            {item.description && (
              <div className="bg-bg/25 border border-border/40 p-4 rounded-xl">
                <p className="text-[11.5px] text-text-main font-medium leading-relaxed whitespace-pre-line font-sans">
                  {item.description}
                </p>
              </div>
            )}

            {/* Inline Embedded Image Preview */}
            {item.routineType === 'image' && item.fileUrl && (
              <div className="border border-border/60 rounded-xl overflow-hidden bg-bg max-h-[400px] flex items-center justify-center p-3">
                <img
                  src={item.fileUrl}
                  alt={item.title}
                  className="max-h-[380px] object-contain rounded-lg shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </motion.div>
        ))}

        {filteredRoutines.length === 0 && (
          <div className="py-20 text-center bg-surface border border-border/60 rounded-[2.5rem] space-y-3 shadow-none">
            <div className="w-12 h-12 bg-surface-hover rounded-xl flex items-center justify-center mx-auto text-text-dim">
              <Calendar size={22} />
            </div>
            <p className="text-xs font-extrabold text-text-dim uppercase tracking-wider">
              {searchQuery ? 'No match found for your query' : 'No schedules published'}
            </p>
            <p className="text-[10px] text-text-dim/80 max-w-xs mx-auto">
              {searchQuery ? 'Try matching subject names or dates.' : 'The administrative team has not listed any routine profiles yet.'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
