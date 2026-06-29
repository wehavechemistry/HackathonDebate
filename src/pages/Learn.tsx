import { useState, useRef, useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, Check, Pin, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import MarkdownRenderer from '../components/MarkdownRenderer';
import CoachCrab from '../components/CoachCrab';

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
    const content = language === 'vi' ? lesson.content_vi : lesson.content_en;
    const title = language === 'vi' ? lesson.title_vi : lesson.title_en;
    const isCompleted = currentUser?.completedLessons.includes(lesson.id);
    const unlocked = isLessonUnlocked(lesson.id);
    const nextLesson = getNextLesson(lesson.id);

    const handleComplete = () => {
      if (!currentUser) return;
      completeLesson(lesson.id);
      addActivity({ type: 'lesson', title, detail: lesson.level });
    };

    if (!unlocked && !isCompleted) return <Navigate to="/learn" />;

    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          to="/learn"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-orange-400 mb-6 transition-colors"
        >
          <ChevronLeft size={16} />
          {t('learn.back', language)}
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span
              className={`px-3 py-1 text-xs font-medium rounded-full border ${
                lesson.level === 'beginner'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : lesson.level === 'intermediate'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              {t(`learn.${lesson.level}`, language)}
            </span>
            {lesson.pinned && (
              <span className="flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                <Pin size={12} />
                {language === 'vi' ? 'Được ghim' : 'Pinned'}
              </span>
            )}
            {isCompleted && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <Check size={14} />
                {t('learn.completed', language)}
              </span>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.04] to-amber-500/[0.02] rounded-2xl pointer-events-none" />
            <div className="relative bg-slate-900/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/20">
              <MarkdownRenderer content={content} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {currentUser && !isCompleted && (
              <button
                onClick={handleComplete}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.98]"
              >
                {t('learn.mark_complete', language)}
              </button>
            )}
            {currentUser && isCompleted && nextLesson && (
              <Link
                to={`/learn/${nextLesson.id}`}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.98]"
              >
                {t('learn.next_lesson', language)} <ArrowRight size={18} />
              </Link>
            )}
            {currentUser && isCompleted && !nextLesson && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm max-w-md">
                {language === 'vi'
                  ? '🎉 Bạn đã hoàn thành tất cả bài học ở cấp độ này!'
                  : '🎉 You completed all lessons in this level!'}
              </div>
            )}
          </div>
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
  const filteredLessons = lessons
    .filter(l => l.level === activeLevel)
    .sort((a, b) => a.order - b.order);

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