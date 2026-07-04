import { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, Check, Pin, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import MarkdownRenderer from '../components/MarkdownRenderer';
import CoachCrab from '../components/CoachCrab';
import LessonPlayer from '../components/LessonPlayer';
import type { LessonStep, Lesson } from '../types';

function LessonNode({
  index,
  title,
  level,
  locked,
  completed,
  pinned,
  isCurrent,
  href,
}: {
  index: number;
  title: string;
  level: string;
  locked: boolean;
  completed: boolean;
  pinned?: boolean;
  isCurrent: boolean;
  href: string;
}) {
  const language = useStore(s => s.language);
  const reduce = useReducedMotion();

  const circle = (
    <div
      data-circle={index}
      className={`relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center font-semibold text-sm sm:text-base transition-all duration-300 shrink-0 ${
        completed
          ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30'
          : isCurrent
            ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/40' +
              (reduce ? '' : ' animate-pulse-glow')
            : locked
              ? 'bg-slate-700/60 border-slate-600/40 text-slate-500'
              : 'bg-slate-700/40 border-slate-600/40 text-slate-400 hover:border-slate-400/60'
      }`}
    >
      {completed ? <Check size={18} /> : isCurrent ? <Sparkles size={16} /> : locked ? <Lock size={14} /> : index + 1}
    </div>
  );

  const textCard = (
    <div className="flex-1 min-w-0">
      {locked ? (
        <div className="bg-[#1a1a26]/70 backdrop-blur border border-white/[0.05] rounded-xl px-4 py-3 shadow-lg shadow-black/10">
          <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
          <p className="text-[10px] text-slate-600 mt-1">
            {language === 'vi' ? 'Hoàn thành bài trước' : 'Complete previous lesson'}
          </p>
        </div>
      ) : (
        <Link to={href} className="block group">
          <div className="bg-[#1a1a26]/80 backdrop-blur border border-white/[0.06] rounded-xl px-4 py-3 shadow-lg shadow-black/10 transition-all duration-300 group-hover:border-orange-500/30 group-hover:bg-[#1e1e30]/80 group-hover:shadow-orange-500/5">
            <p
              className={`text-sm sm:text-base font-medium leading-tight truncate transition-colors ${
                completed
                  ? 'text-emerald-300'
                  : isCurrent
                    ? 'text-orange-300'
                    : 'text-slate-400 group-hover:text-white'
              }`}
            >
              {title}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  level === 'beginner'
                    ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                    : level === 'intermediate'
                      ? 'text-amber-400 border-amber-500/20 bg-amber-500/5'
                      : 'text-rose-400 border-rose-500/20 bg-rose-500/5'
                }`}
              >
                {level}
              </span>
              {pinned && !completed && <Pin size={11} className="text-orange-400 shrink-0" />}
              {completed && <Check size={11} className="text-emerald-400 shrink-0" />}
            </div>
          </div>
        </Link>
      )}
    </div>
  );

  return (
    <div className={`flex items-center gap-4 py-2 ${locked ? 'opacity-40 select-none' : ''}`}>
      {circle}
      {textCard}
    </div>
  );
}

export default function Learn() {
  const { lessonId } = useParams();
  const {
    lessons,
    language,
    currentUser,
    completeLesson,
    addActivity,
    isLessonUnlocked,
    getNextLesson,
  } = useStore();
  const [activeLevel, setActiveLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const reduce = useReducedMotion();

  // ─── Lesson detail view ───

  if (lessonId) {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return <Navigate to="/learn" />;
    const title = language === 'vi' ? lesson.title_vi : lesson.title_en;
    const isInteractive = lesson.type === 'interactive';
    const isCompleted = currentUser?.completedLessons.includes(lessonId);
    const unlocked = isLessonUnlocked(lesson.id);
    const nextLesson = getNextLesson(lesson.id);

    const handleComplete = (xpReward = 0) => {
      if (!currentUser) return;
      completeLesson(lessonId, xpReward);
      addActivity({ 
        type: 'lesson', 
        title, 
        detail: lesson.level 
      });
    };

    if (!unlocked && !isCompleted) return <Navigate to="/learn" />;

    if (isInteractive) {
      return (
        <div className="h-[calc(100vh-4.5rem)]">
          <LessonPlayer
            steps={lesson.steps || []}
            xpReward={lesson.xpReward || 50}
            onComplete={handleComplete}
            language={language}
            coachId={lesson.coachId}
            coachName={lesson.coachName}
          />
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          to="/learn"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-orange-400 mb-6 transition-colors"
        >
          <ChevronLeft size={16} />
          {t('learn.back', language)}
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {isCompleted && <Check size={18} className="text-emerald-400" />}
          </div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
              lesson.level === 'beginner'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : lesson.level === 'intermediate'
                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {t(`learn.${lesson.level}`, language)}
            </span>
            {lesson.pinned && <Pin size={12} className="text-orange-400" />}
          </div>
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-700/50">
            <MarkdownRenderer content={language === 'vi' ? lesson.content_vi : lesson.content_en} className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed" />
          </div>
          {nextLesson && (
            <Link
              to={`/learn/${nextLesson.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all"
            >
              {t('learn.next_lesson', language)} <ArrowRight size={16} />
            </Link>
          )}
        </motion.div>
      </div>
    );
  }

// ─── Roadmap view ───

  const levels: Array<'beginner' | 'intermediate' | 'advanced'> = [
    'beginner',
    'intermediate',
    'advanced',
  ];
  
  const allLessons = lessons.map(l => ({ 
    id: l.id, 
    level: l.level, 
    order: l.order || 0, 
    title_en: l.title_en, 
    title_vi: l.title_vi, 
    pinned: l.pinned || false,
    content_en: l.content_en,
    content_vi: l.content_vi,
    type: l.type || 'static',
  }));
  
  const filteredLessons = allLessons
    .filter(l => l.level === activeLevel)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const currentLessonId = filteredLessons.find(
    l => isLessonUnlocked(l.id) && !currentUser?.completedLessons.includes(l.id)
  )?.id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
      {/* Header */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex items-center gap-4 mb-1">
          <CoachCrab size={44} animate={false} />
          <div>
            <h1 className="text-2xl font-bold text-white">{t('learn.title', language)}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {language === 'vi'
                ? 'Chọn một bài học để bắt đầu hành trình'
                : 'Pick a lesson to start your journey'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Level Tabs */}
      <div className="flex gap-2 mb-10 p-1 bg-slate-900/50 border border-white/[0.06] rounded-xl w-fit">
        {levels.map(level => {
          const completedCount = lessons.filter(
            l => l.level === level && currentUser?.completedLessons.includes(l.id)
          ).length;
          const totalCount = lessons.filter(l => l.level === level).length;
          return (
            <button
              key={level}
              onClick={() => setActiveLevel(level)}
              className={`relative px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeLevel === level
                  ? 'bg-slate-800/80 text-white shadow-lg shadow-black/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {t(`learn.${level}`, language)}
              <span className="ml-2 text-[10px] text-slate-500">
                {completedCount}/{totalCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Simple vertical Roadmap */}
      <div className="max-w-[600px] mx-auto">
        {filteredLessons.map((lesson, i) => {
          const isCompleted = currentUser?.completedLessons.includes(lesson.id);
          const locked = !isLessonUnlocked(lesson.id) && !isCompleted;
          const isCurrent = lesson.id === currentLessonId;
          const title = language === 'vi' ? lesson.title_vi : lesson.title_en;

          return (
            <motion.div
              key={lesson.id}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <LessonNode
                index={i}
                title={title}
                level={lesson.level}
                locked={locked}
                completed={!!isCompleted}
                pinned={lesson.pinned}
                isCurrent={isCurrent}
                href={locked ? '#' : `/learn/${lesson.id}`}
              />
            </motion.div>
          );
        })}

        {/* Empty state */}
        {filteredLessons.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-500">
              {language === 'vi'
                ? 'Chưa có bài học nào ở cấp độ này'
                : 'No lessons in this level yet'}
            </p>
          </div>
        )}
      </div>

      {/* Pulse glow keyframes */}
      {!reduce && (
        <style>{`
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 8px rgba(255, 122, 0, 0.3); transform: scale(1); }
            50% { box-shadow: 0 0 20px rgba(255, 122, 0, 0.6); transform: scale(1.05); }
          }
          .animate-pulse-glow {
            animation: pulse-glow 2s ease-in-out infinite;
          }
        `}</style>
      )}
    </div>
  );
}