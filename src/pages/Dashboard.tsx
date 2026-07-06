import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Clock, FileText } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import CoachCrab from '../components/CoachCrab';
import { dashboardQuickLinks } from '../data/content';

export default function Dashboard() {
  const { currentUser, language, clearActivity, deleteNote, lessons } = useStore();

  if (!currentUser) return <Navigate to="/login" />;

  const quickLinks = dashboardQuickLinks.map(link => ({
    ...link,
    label: t(link.labelKey, language),
  }));

  // Find next incomplete lesson
  const nextLesson = lessons.find(l => !currentUser.completedLessons.includes(l.id));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-slate-900/50 border border-white/[0.06] shadow-xl">
            <CoachCrab size={40} animate={false} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {t('dashboard.welcome', language)}, <span className="text-orange-400">{currentUser.username}</span>
            </h1>
            <p className="text-slate-400">
              {language === 'vi' ? 'S\u1eb5n s\u00e0ng luy\u1ec7n debate h\u00f4m nay?' : 'Ready to practice debate today?'}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Clock size={18} className="text-orange-400" />
              {t('dashboard.recent', language)}
            </h2>
            {currentUser.recentActivity.length > 0 && (
              <button
                onClick={clearActivity}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                {t('dashboard.clear_history', language)}
              </button>
            )}
          </div>
          {currentUser.recentActivity.length === 0 ? (
            <p className="text-slate-500 text-sm">{t('dashboard.no_activity', language)}</p>
          ) : (
            <div className="space-y-3">
              {currentUser.recentActivity.map(act => (
                <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/50 border border-white/[0.03]">
                  <div className="w-2 h-2 mt-2 rounded-full bg-orange-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{act.title}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(act.timestamp).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                      {act.detail && ` - ${act.detail}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Saved Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-white flex items-center gap-2 mb-6">
            <FileText size={18} className="text-orange-400" />
            {t('dashboard.notes', language)}
          </h2>
          {currentUser.savedNotes.length === 0 ? (
            <p className="text-slate-500 text-sm">{t('dashboard.no_notes', language)}</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {currentUser.savedNotes.map(note => (
                <div key={note.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-white/[0.03] group">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{note.title}</p>
                    <p className="text-xs text-slate-500 truncate">{note.content.slice(0, 60)}</p>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="ml-2 p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Continue Learning */}
        {nextLesson && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <h2 className="font-semibold text-white mb-6">{t('dashboard.continue', language)}</h2>
            <Link
              to={`/learn/${nextLesson.id}`}
              className="block p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all"
            >
              <p className="text-sm text-orange-400 font-medium capitalize mb-1">{nextLesson.level}</p>
              <p className="text-white font-medium">{language === 'vi' ? nextLesson.title_vi : nextLesson.title_en}</p>
            </Link>
          </motion.div>
        )}

        {/* Quick Access */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <h2 className="font-semibold text-white mb-6">{t('dashboard.quick', language)}</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 border border-white/[0.03] hover:bg-slate-900/50 transition-all group"
              >
                <div className={`p-2 rounded-lg ${link.color}`}>
                  <link.icon size={18} />
                </div>
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{link.label}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
