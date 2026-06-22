import { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Check, Pin } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import MarkdownRenderer from '../components/MarkdownRenderer';
import CoachCrab from '../components/CoachCrab';

export default function Learn() {
  const { lessonId } = useParams();
  const { lessons, language, currentUser, completeLesson, addActivity } = useStore();
  const [activeLevel, setActiveLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  if (lessonId) {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return <Navigate to="/learn" />;
    const content = language === 'vi' ? lesson.content_vi : lesson.content_en;
    const title = language === 'vi' ? lesson.title_vi : lesson.title_en;
    const isCompleted = currentUser?.completedLessons.includes(lesson.id);

    const handleComplete = () => {
      if (!currentUser) return;
      completeLesson(lesson.id);
      addActivity({ type: 'lesson', title: title, detail: lesson.level });
    };

    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/learn" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-orange-400 mb-6 transition-colors">
          <ChevronLeft size={16} />
          {t('learn.back', language)}
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
              lesson.level === 'beginner' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
              lesson.level === 'intermediate' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
              'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {t(`learn.${lesson.level}`, language)}
            </span>
            {lesson.pinned && <Pin size={14} className="text-orange-400" />}
            {isCompleted && (
              <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                <Check size={14} />
                {t('learn.completed', language)}
              </span>
            )}
          </div>
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/20">
            <MarkdownRenderer content={content} />
          </div>
          {currentUser && !isCompleted && (
            <button
              onClick={handleComplete}
              className="mt-6 px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 animate-pulse-glow"
            >
              {t('learn.mark_complete', language)}
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  const levels: Array<'beginner' | 'intermediate' | 'advanced'> = ['beginner', 'intermediate', 'advanced'];
  const filteredLessons = lessons.filter(l => l.level === activeLevel).sort((a, b) => a.order - b.order);
  const pinnedLessons = lessons.filter(l => l.pinned);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CoachCrab size={40} animate={false} />
          <h1 className="text-2xl font-bold text-white">{t('learn.title', language)}</h1>
        </div>
      </motion.div>

      {/* Pinned */}
      {pinnedLessons.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-orange-400 mb-4 flex items-center gap-2">
            <Pin size={16} /> {language === 'vi' ? 'B\u00e0i h\u1ecdc \u0111\u01b0\u1ee3c ghim' : 'Pinned Lessons'}
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {pinnedLessons.map(l => (
              <Link
                key={l.id}
                to={`/learn/${l.id}`}
                className="p-5 rounded-2xl bg-orange-500/5 border border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/10 transition-all group"
              >
                <p className="text-xs font-medium text-orange-400/80 uppercase tracking-wider mb-1">{l.level}</p>
                <p className="text-white font-semibold group-hover:text-orange-100 transition-colors">{language === 'vi' ? l.title_vi : l.title_en}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Level Tabs */}
        <div className="flex gap-2 mb-8 p-1 bg-slate-900/40 border border-white/[0.08] rounded-xl w-fit">
          {levels.map(level => (
            <button
              key={level}
              onClick={() => setActiveLevel(level)}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeLevel === level
                  ? 'bg-white/10 text-white shadow-lg shadow-black/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t(`learn.${level}`, language)}
            </button>
          ))}
        </div>

      {/* Lessons Grid */}
      <div className="space-y-3">
        {filteredLessons.map((lesson, i) => {
          const isCompleted = currentUser?.completedLessons.includes(lesson.id);
          return (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/learn/${lesson.id}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/40 border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/5 transition-all interactive-row"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 border ${
                  isCompleted
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : 'bg-white/5 border-white/[0.08] text-slate-400'
                }`}>
                  {isCompleted ? <Check size={18} /> : lesson.order}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium group-hover:text-orange-400 transition-colors truncate">
                    {language === 'vi' ? lesson.title_vi : lesson.title_en}
                  </p>
                </div>
                {lesson.pinned && <Pin size={16} className="text-orange-400 shrink-0" />}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
