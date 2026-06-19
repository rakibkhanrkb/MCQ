import React from 'react';
import { ExamResult } from '../types';
import { motion } from 'motion/react';
import { Trophy, Target, Award, TrendingUp, Calendar, ArrowRight, Download } from 'lucide-react';
import { downloadResultPDF } from '../utils/pdfGenerator';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Legend,
  ReferenceLine
} from 'recharts';

interface HistoryDashboardProps {
  history: ExamResult[];
  onViewDetails: (result: ExamResult) => void;
  logoSettings?: { logoText?: string };
}

export default function HistoryDashboard({ history, onViewDetails, logoSettings }: HistoryDashboardProps) {
  // Calculations
  const totalExams = history.length;
  const avgScore = totalExams > 0 
    ? (history.reduce((acc, curr) => acc + parseFloat(curr.percentage), 0) / totalExams).toFixed(1) 
    : 0;
  
  const topScore = totalExams > 0 
    ? Math.max(...history.map(h => parseFloat(h.percentage))).toFixed(1) 
    : 0;

  const passCount = history.filter(h => parseFloat(h.percentage) >= 70).length;
  const passRate = totalExams > 0 ? ((passCount / totalExams) * 100).toFixed(1) : 0;

  // Chart Data (Last 10 exams)
  const chartData = [...history]
    .slice(0, 10)
    .reverse()
    .map((h, i) => ({
      name: `Ex ${history.length - 9 + i > 0 ? history.length - 9 + i : i + 1}`,
      score: parseFloat(h.percentage),
      student: h.studentName
    }));

  return (
    <div className="space-y-6 pb-20">
      {/* Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Assessments', value: totalExams, icon: Target, color: 'text-accent', bg: 'bg-accent/8' },
          { label: 'Average Accuracy', value: `${avgScore}%`, icon: TrendingUp, color: 'text-success', bg: 'bg-success/8' },
          { label: 'Peak Performance', value: `${topScore}%`, icon: Trophy, color: 'text-gold', bg: 'bg-gold/8' },
          { label: 'Completion Rate', value: `${passRate}%`, icon: Award, color: 'text-accent2', bg: 'bg-accent2/8' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-surface border border-border/80 p-5 rounded-2xl shadow-sm hover:border-accent/30 transition-all duration-300 flex items-center gap-4 group"
          >
            <div className={`w-11 h-11 ${stat.bg} rounded-xl flex items-center justify-center ${stat.color} group-hover:scale-105 transition-transform shrink-0`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-text-dim leading-none mb-1.5">{stat.label}</p>
              <h3 className={`text-2xl font-black ${stat.color} leading-none font-mono`}>{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Performance Graph */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-8 bg-surface border border-border/80 rounded-3xl p-6 md:p-8 shadow-sm overflow-hidden"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold tracking-tight text-text-main flex items-center gap-2">
              <TrendingUp className="text-accent" size={16} /> Efficiency Metric
            </h3>
            <span className="text-[9px] font-bold uppercase text-text-dim tracking-wider bg-surface-hover px-3 py-1 rounded-md border border-border/50">Cumulative Score Trend</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15, 23, 42, 0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-text-dim)', fontSize: 10, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-text-dim)', fontSize: 10, fontWeight: 600 }}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-surface)', 
                    border: '1px solid var(--color-border)', 
                    borderRadius: '16px', 
                    fontSize: '11px', 
                    fontWeight: 'bold',
                    color: 'var(--color-text-main)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}
                  itemStyle={{ color: 'var(--color-accent)' }}
                  labelStyle={{ color: 'var(--color-text-dim)', marginBottom: '4px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
                {/* Horizontal reference line indicating pass certificate mark */}
                <ReferenceLine 
                  y={70} 
                  stroke="var(--color-success)" 
                  strokeDasharray="4 4" 
                  strokeWidth={1.5}
                  label={{ 
                    value: 'Certification Threshold (70%)', 
                    fill: 'var(--color-success)', 
                    fontSize: 9, 
                    fontWeight: 700,
                    position: 'insideBottomRight',
                    offset: 8
                  }} 
                />
                <Line 
                  name="Exam Score Percentage (%)"
                  type="monotone" 
                  dataKey="score" 
                  stroke="var(--color-accent)" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, stroke: 'var(--color-surface)', fill: 'var(--color-accent)' }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-accent2)' }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Activity List */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-4 bg-surface border border-border/80 rounded-3xl p-6 shadow-sm flex flex-col"
        >
          <h3 className="text-base font-bold tracking-tight text-text-main mb-6 flex items-center gap-2">
            <Calendar className="text-accent" size={16} /> Recent Logs
          </h3>
          <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
            {history.slice(0, 5).map((res, i) => (
              <div 
                key={res.id || i}
                onClick={() => onViewDetails(res)}
                className="group cursor-pointer bg-surface-hover/50 border border-border/50 hover:border-accent/30 p-3.5 rounded-xl transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent/8 border border-accent/15 rounded-lg flex items-center justify-center font-bold text-accent text-xs">
                    {res.studentName[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-main group-hover:text-accent transition-colors leading-tight">{res.studentName}</h4>
                    <p className="text-[10px] text-text-dim font-bold mt-1 font-mono">Accuracy: <span className="text-success">{res.percentage}%</span></p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-text-dim/60 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
              </div>
            ))}
            {history.length === 0 && (
              <div className="text-center py-16 text-text-[11px] text-text-dim italic font-medium">No results recorded yet.</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Main Records Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold tracking-tight text-text-main flex items-center gap-2 px-1">
          <Target className="text-accent" size={18} /> Detailed Assessments History
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((res, i) => (
            <motion.div 
              key={res.id || i}
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              onClick={() => onViewDetails(res)}
              className="bg-surface border border-border/80 p-6 rounded-2xl shadow-sm hover:border-accent/40 hover:shadow-md transition-all duration-300 group cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-accent hover:bg-accent2 text-white flex items-center justify-center text-lg font-bold shadow-sm transition-colors">
                  {res.studentName[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-base text-text-main truncate group-hover:text-accent transition-colors">{res.studentName}</h4>
                  <p className="text-[10px] text-text-dim font-bold flex items-center gap-1.5 mt-1">
                    <Calendar size={12} className="text-accent" /> {res.timestamp ? new Date(res.timestamp.seconds * 1000).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-border/50 flex items-end justify-between relative z-10">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider">Accuracy Rating</p>
                  <div className="text-text-main font-extrabold text-3xl font-mono leading-none">{res.percentage}%</div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider block ${parseFloat(res.percentage) >= 70 ? 'bg-success/8 text-success border border-success/15' : 'bg-danger/8 text-danger border border-danger/15'}`}>
                    {parseFloat(res.percentage) >= 70 ? 'Certified' : 'Under Review'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadResultPDF(res, logoSettings);
                    }}
                    className="inline-flex items-center gap-1 bg-accent/8 hover:bg-accent/15 border border-accent/25 text-accent font-black px-2 py-1 rounded-lg text-[8.5px] uppercase tracking-wider transition-all cursor-pointer hover:scale-105 active:scale-95"
                    title="Download Formatted PDF Certificate"
                  >
                    <Download size={10} /> PDF DOWNLOAD
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
