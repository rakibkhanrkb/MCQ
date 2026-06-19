import React from 'react';
import { Page } from '../types';
import { LayoutDashboard, PenTool, History, Shield, Calendar, HelpCircle, Home, GraduationCap, Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  logoSettings?: {
    logoType: 'text' | 'image' | 'both';
    logoText: string;
    logoUrl: string;
  };
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isAdminUnlocked?: boolean;
  onBrandClick?: () => void;
}

export default function Navbar({ 
  currentPage, 
  onNavigate, 
  logoSettings, 
  isDarkMode, 
  onToggleDarkMode,
  isAdminUnlocked = false,
  onBrandClick
}: NavbarProps) {
  const tabs: { id: Page; label: string; icon: any }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'login', label: 'Student Portal', icon: LayoutDashboard },
    { id: 'setup', label: 'Exam', icon: PenTool },
    { id: 'routines', label: 'Routine', icon: Calendar },
    { id: 'history', label: 'Records', icon: History },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
  ];

  if (isAdminUnlocked) {
    tabs.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  // Use fallbacks in case logoSettings is not provided
  const brandType = logoSettings?.logoType || 'text';
  const brandText = logoSettings?.logoText || 'ICT MCQ TEST';
  const brandUrl = logoSettings?.logoUrl || '';

  // Don't show tabs during exam
  if (currentPage === 'exam') return null;

  return (
    <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-b-border/40 px-6 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div onClick={onBrandClick} className="flex items-center gap-2.5 cursor-pointer select-none active:scale-98 transition-transform" title="Branding Portal">
          {/* Render logo image if style includes image */}
          {(brandType === 'image' || brandType === 'both') && (
            <img
              src={brandUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"}
              alt="Brand Logo"
              className="w-9 h-9 rounded-xl object-cover border border-border/80 bg-surface-hover/50"
              referrerPolicy="no-referrer"
            />
          )}

          {/* Fallback default icon if Text Only */}
          {brandType === 'text' && (
            <div className="w-9 h-9 bg-accent/8 rounded-xl flex items-center justify-center border border-accent/15">
              <GraduationCap className="text-accent" size={18} />
            </div>
          )}

          {/* Render wordmark text */}
          {(brandType === 'text' || brandType === 'both') && (
            <span className="font-black text-xl md:text-2xl tracking-wider text-text-main font-sans uppercase">
              {brandText.split(' ').length > 1 ? (
                <>
                  {brandText.split(' ').slice(0, -1).join(' ')}{' '}
                  <span className="text-accent">{brandText.split(' ').slice(-1)}</span>
                </>
              ) : (
                <span className="text-accent">{brandText}</span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-surface-hover/80 p-1 rounded-xl border border-border/50 overflow-x-auto max-w-[calc(100vw-180px)] sm:max-w-none">
            {tabs.map(tab => {
              const isActive = currentPage === tab.id || (currentPage === 'result' && tab.id === 'setup');
              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[10px] font-bold transition-all duration-200 uppercase tracking-wider relative shrink-0 ${
                    isActive
                      ? 'bg-surface text-accent shadow-sm border border-border/20 font-black scale-[1.02]'
                      : 'text-text-dim hover:text-text-main hover:bg-surface/50'
                  }`}
                >
                  <tab.icon size={12} className={isActive ? 'text-accent' : 'text-text-dim'} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onToggleDarkMode}
            className="w-9 h-9 rounded-xl bg-surface-hover/80 hover:bg-surface border border-border/50 flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer text-text-dim hover:text-text-main shrink-0"
            aria-label="Toggle dark/light theme"
            id="theme-mode-toggle"
          >
            <motion.div
              key={isDarkMode ? 'dark' : 'light'}
              initial={{ rotate: -90, scale: 0.8, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              {isDarkMode ? (
                <Sun size={15} className="text-amber-400 fill-amber-400/20" />
              ) : (
                <Moon size={15} className="text-accent fill-accent/10" />
              )}
            </motion.div>
          </button>
        </div>
      </div>
    </nav>
  );
}
