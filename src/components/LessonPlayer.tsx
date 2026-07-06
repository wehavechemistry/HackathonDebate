import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CoachCrab from './CoachCrab';
import MarkdownRenderer from './MarkdownRenderer';
import { Check, Send, ArrowRight, Star, MessageCircle } from 'lucide-react';
import { getBotAvatar } from './BotAvatars';
import { useToast } from './ToastContainer';
import { useStore } from '../store';

interface LessonStep {
  id: string;
  type: 'text' | 'quiz' | 'essay' | 'end';
  coachText: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  placeholder?: string;
  nextId: string | null;
}

interface LessonPlayerProps {
  steps: LessonStep[];
  xpReward: number;
  onComplete: (xpReward?: number) => void;
  language: 'en' | 'vi';
  coachId?: string;
  coachName?: string;
  lessonId?: string;
}

export default function LessonPlayer({ steps, xpReward, onComplete, language, coachId = 'crab', coachName, lessonId }: LessonPlayerProps) {
   const toast = useToast();
   const { submitFeedback } = useStore();
   const [currentIndex, setCurrentIndex] = useState(0);
   const [chatHistory, setChatHistory] = useState<Array<{ role: 'coach' | 'user'; content: string }>>([]);
   const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
   const [showExplanation, setShowExplanation] = useState(false);
   const [essayValue, setEssayValue] = useState('');
   const [submitted, setSubmitted] = useState(false);
   const [finished, setFinished] = useState(false);
   const [showFeedback, setShowFeedback] = useState(false);
   const [feedbackText, setFeedbackText] = useState('');
   const chatEndRef = useRef<HTMLDivElement>(null);
   const step = steps[currentIndex];
   const isLast = currentIndex === steps.length - 1;
   
   const lessonIdToUse = lessonId || null;

  useEffect(() => {
    if (step && chatHistory.length === 0) {
      setChatHistory([{ role: 'coach', content: step.coachText }]);
    }
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleNext = () => {
    if (isLast || !step.nextId) {
      setFinished(true);
      onComplete(xpReward);
      toast.xp(language === 'vi' ? `+${xpReward} XP` : `+${xpReward} XP`, 3000);
      return;
    }
    const nextIdx = steps.findIndex(s => s.id === step.nextId);
    if (nextIdx >= 0) {
      setCurrentIndex(nextIdx);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setEssayValue('');
      setSubmitted(false);
    }
  };

  const handleQuiz = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    setShowExplanation(true);
    setChatHistory(prev => [...prev, { role: 'user', content: step.options![idx] }]);
    setTimeout(() => {
      setChatHistory(prev => [...prev, {
        role: 'coach',
        content: (idx === step.correctIndex ? 'Correct! ' : 'Not quite. ') + (step.explanation || '')
      }]);
    }, 400);
  };

  const handleEssay = () => {
    if (!essayValue.trim() || submitted) return;
    setSubmitted(true);
    setChatHistory(prev => [...prev, { role: 'user', content: essayValue }]);
    setTimeout(() => {
      setChatHistory(prev => [...prev, {
        role: 'coach',
        content: language === 'vi'
          ? 'Tuyet voi! Du dap an chua hoan hao, nhung cach ban nghi rat tot. Hay tiep tuc phat huy!'
          : 'Awesome! Even if it is not perfect yet, the way you think is great. Keep it up!'
      }]);
    }, 500);
  };

  const renderCoachAvatar = () => {
    if (coachId === 'crab') {
      return <CoachCrab size={32} animate={false} />;
    }
    return getBotAvatar(coachId, 32);
  };

  const handleFeedbackSubmit = async () => {
      if (!feedbackText.trim()) return;
      await submitFeedback(lessonIdToUse, feedbackText);
      setFeedbackText('');
      setShowFeedback(false);
      toast.success(language === 'vi' ? 'Cảm ơn phản hồi của bạn!' : 'Thank you for your feedback!', 3000);
    };

    if (finished) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
          <div className="p-4 bg-orange-500/10 rounded-full">
            {coachId === 'crab' ? <CoachCrab size={64} animate /> : getBotAvatar(coachId, 64)}
          </div>
          <h2 className="text-xl font-bold text-white">
            {language === 'vi' ? 'Bai hoc hoan thanh!' : 'Lesson Complete!'}
          </h2>
          <div className="flex items-center gap-2 text-orange-400">
            <Star size={20} className="fill-orange-400" />
            <span className="font-semibold">+{xpReward} XP</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onComplete(xpReward)}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all"
            >
              {language === 'vi' ? 'Quay lai' : 'Back to Lessons'}
            </button>
            <button
              onClick={() => setShowFeedback(true)}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
            >
              <MessageCircle size={16} />
              {language === 'vi' ? 'Phản hồi' : 'Feedback'}
            </button>
          </div>
          
          {showFeedback && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl p-5 w-full max-w-md">
                <h3 className="text-lg font-semibold text-white mb-3">
                  {language === 'vi' ? 'Gửi phản hồi' : 'Send Feedback'}
                </h3>
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder={language === 'vi' ? 'Nhập phản hồi của bạn...' : 'Enter your feedback...'}
                  className="w-full p-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white mb-4"
                  rows={4}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowFeedback(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                  >
                    {language === 'vi' ? 'Huy' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleFeedbackSubmit}
                    disabled={!feedbackText.trim()}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50"
                  >
                    {language === 'vi' ? 'Gui' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

  if (!step) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        <AnimatePresence initial={false}>
          {chatHistory.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'coach' && (
                  <div className="shrink-0 mb-1">
                    {renderCoachAvatar()}
                  </div>
                )}
                <div className={`px-4 py-3 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-orange-500 text-white rounded-br-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-md'
                }`}>
                  <MarkdownRenderer content={msg.content} className={`text-sm ${msg.role === 'user' ? 'text-white' : ''}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      <div className="shrink-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
        {step.type === 'text' && (
          <button
            onClick={handleNext}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {language === 'vi' ? 'Tiep theo' : 'Next'} <ArrowRight size={16} />
          </button>
        )}

        {step.type === 'quiz' && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2">
              {step.options?.map((opt, idx) => {
                const isCorrect = idx === step.correctIndex;
                const isSelected = selectedAnswer === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleQuiz(idx)}
                    disabled={selectedAnswer !== null}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm border transition-all ${
                      selectedAnswer === null
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-500/50'
                        : isSelected && isCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                          : isSelected && !isCorrect
                            ? 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{String.fromCharCode(65 + idx)}.</span>
                      <span>{opt}</span>
                      {isSelected && isCorrect && <Check size={14} className="ml-auto text-emerald-500" />}
                      {isSelected && !isCorrect && <span className="ml-auto text-red-500 text-xs">Wrong</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            {showExplanation && step.explanation && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-slate-700 dark:text-slate-300">
                {step.explanation}
              </motion.div>
            )}
            {selectedAnswer !== null && (
              <button
                onClick={handleNext}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {language === 'vi' ? 'Tiep theo' : 'Next'} <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}

        {step.type === 'essay' && (
          <div className="space-y-2">
            <textarea
              value={essayValue}
              onChange={e => setEssayValue(e.target.value)}
              disabled={submitted}
              placeholder={step.placeholder || (language === 'vi' ? 'Nhap cau tra loi cua ban...' : 'Type your answer...')}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
              rows={3}
            />
            {!submitted ? (
              <button
                onClick={handleEssay}
                disabled={!essayValue.trim()}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={14} /> {language === 'vi' ? 'Gui' : 'Submit'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {language === 'vi' ? 'Tiep theo' : 'Next'} <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
