import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shuffle, Send, ArrowRight, Award, Flame, Zap, MessageSquare, Mic, FileText, Sparkles, ClipboardList } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import {
  callOpenRouterWithRetry,
  buildRebuttalPracticePrompt,
  buildSpeechPracticePrompt,
  buildPOIPracticePrompt,
  buildFramingPracticePrompt,
} from '../api';
import MarkdownRenderer from '../components/MarkdownRenderer';
import CoachCrab from '../components/CoachCrab';
import type { DebateMotion } from '../types';
import { battleDifficultyLevels, battleSides, trainingModePresets } from '../data/content';

type Mode = 'menu' | 'rebuttal' | 'speech' | 'poi' | 'framing';

export default function Training() {
  const store = useStore();
  const { language, motions, aiConfigured, addActivity, incrementTrainingStat, addTrainingScore, penalizeTraining } = store;
  const totalXp = store.currentUser?.totalXp || 0;
  const tier = store.currentUser?.tier || 'bronze';
  const streak = store.currentUser?.streak || 0;

  if (!store.currentUser) return <Navigate to="/login" />;

  const [mode, setMode] = useState<Mode>('menu');
  const [difficulty, setDifficulty] = useState<'easy' | 'intermediate' | 'hard'>('easy');
  const [category, setCategory] = useState('random');
  const [side, setSide] = useState<'for' | 'against'>('for');
  const [selectedMotion, setSelectedMotion] = useState<DebateMotion | null>(null);
  const [generatedArg, setGeneratedArg] = useState('');
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'generate' | 'input' | 'feedback'>('generate');
  const [useCustomMotion, setUseCustomMotion] = useState(false);
  const [customMotion, setCustomMotion] = useState('');

  const categories = ['random', ...Array.from(new Set(motions.map(m => m.category))).sort()];
  const debateLang = language;

  const motionOnlyModes: Mode[] = ['speech', 'framing'];

  const randomizeMotion = () => {
    let filtered = motions.filter(m => m.difficulty === difficulty);
    if (category !== 'random') filtered = filtered.filter(m => m.category === category);
    if (filtered.length === 0) filtered = motions.filter(m => m.difficulty === difficulty);
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    setSelectedMotion(pick);
    return pick;
  };

  const getActiveMotionText = () => {
    if (useCustomMotion && customMotion) return customMotion;
    return selectedMotion ? (debateLang === 'vi' ? selectedMotion.motion_vi : selectedMotion.motion_en) : '';
  };

  const generateArgument = async () => {
    setIsLoading(true);
    setStep('input');
    const motionText = getActiveMotionText();
    const prompt = debateLang === 'vi'
      ? 'Tao mot luan diem NGAN GON (50-100 tu) ung ho de bai sau. Chi viet luan diem, khong them gi khac.'
      : 'Generate a BRIEF argument (50-100 words) supporting the following motion. Only the argument, nothing else.';
    const result = await callOpenRouterWithRetry([
      { role: 'system', content: prompt },
      { role: 'user', content: motionText },
    ]);
    setGeneratedArg(result);
    if (!useCustomMotion) {
      const m = randomizeMotion();
      if (m) setSelectedMotion(m);
    }
    setIsLoading(false);
  };

const generatePOIArgument = async () => {
    const motionText = getActiveMotionText();
    if (!motionText) return;
    setIsLoading(true);
    setStep('input');
    const prompt = debateLang === 'vi'
      ? 'Tao mot luan diem NGAN GON (30-60 tu) ve de bai nay. Chi viet luan diem.'
      : 'Generate a SHORT argument (30-60 words) about this motion. Only the argument.';
    const result = await callOpenRouterWithRetry([
      { role: 'system', content: prompt },
      { role: 'user', content: motionText },
    ]);
    setGeneratedArg(result);
    if (!useCustomMotion) {
      const m = randomizeMotion();
      if (m) setSelectedMotion(m);
    }
    setIsLoading(false);
  };

  const submitRebuttal = async () => {
    if (!userInput.trim()) return;
    setIsLoading(true);
    const prompt = buildRebuttalPracticePrompt(debateLang);
    const result = await callOpenRouterWithRetry([
      { role: 'system', content: prompt },
      { role: 'user', content: `Original argument:\n${generatedArg}\n\nUser's rebuttal:\n${userInput}` },
    ]);
    setFeedback(result);
    setStep('feedback');
    setIsLoading(false);
    incrementTrainingStat('rebuttals');
    await addTrainingScore('rebuttals', 25);
    addActivity({ type: 'training', title: language === 'vi' ? 'Luyện phản biện' : 'Rebuttal Practice' });
  };

  const submitSpeech = async () => {
    if (!userInput.trim()) return;
    setIsLoading(true);
    const motionText = getActiveMotionText();
    const sideLabel = side === 'for' ? t('battle.for', language) : t('battle.against', language);
    const prompt = buildSpeechPracticePrompt(debateLang);
    const result = await callOpenRouterWithRetry([
      { role: 'system', content: prompt },
      { role: 'user', content: `Motion: "${motionText}"\nSide: ${sideLabel}\n\nUser's speech:\n${userInput}` },
    ]);
    setFeedback(result);
    setStep('feedback');
    setIsLoading(false);
    incrementTrainingStat('speeches');
    await addTrainingScore('speeches', 30);
    addActivity({ type: 'training', title: language === 'vi' ? 'Luyện diễn thuyết' : 'Speech Practice' });
  };

const submitPOI = async () => {
    if (!userInput.trim()) return;
    setIsLoading(true);
    const prompt = buildPOIPracticePrompt(debateLang);
    const result = await callOpenRouterWithRetry([
      { role: 'system', content: prompt },
      { role: 'user', content: `Original argument:\n${generatedArg}\n\nUser's POI:\n${userInput}` },
    ]);
    setFeedback(result);
    setStep('feedback');
    setIsLoading(false);
    incrementTrainingStat('pois');
    await addTrainingScore('pois', 20);
    addActivity({ type: 'training', title: language === 'vi' ? 'Luyện POI' : 'POI Practice' });
  };

  const submitFraming = async () => {
    if (!userInput.trim()) return;
    setIsLoading(true);
    const motionText = selectedMotion ? (debateLang === 'vi' ? selectedMotion.motion_vi : selectedMotion.motion_en) : '';
    const sideLabel = side === 'for' ? t('battle.for', language) : t('battle.against', language);
    const prompt = buildFramingPracticePrompt(debateLang);
    const result = await callOpenRouterWithRetry([
      { role: 'system', content: prompt },
      { role: 'user', content: `Motion: "${motionText}"\nSide: ${sideLabel}\n\nUser's framing:\n${userInput}` },
    ]);
    setFeedback(result);
    setStep('feedback');
    setIsLoading(false);
    incrementTrainingStat('framing');
    await addTrainingScore('framing', 25);
    addActivity({ type: 'training', title: language === 'vi' ? 'Luy\u1ec7n khung l\u1eadp lu\u1eadn' : 'Framing Practice' });
  };

  const reset = () => {
    setStep('generate');
    setGeneratedArg('');
    setUserInput('');
    setFeedback('');
    setUseCustomMotion(false);
    setCustomMotion('');
  };

  if (mode === 'menu') {
    const modes = trainingModePresets.map(mode => ({
      ...mode,
      title: t(mode.titleKey, language),
      desc: t(mode.descKey, language),
      icon: mode.icon,
    }));

    const xpForNext = tier === 'bronze' ? 100 : tier === 'silver' ? 500 : tier === 'gold' ? 2000 : 5000;
    const xpProgress = Math.min(totalXp / xpForNext, 1);
    const tierColor = tier === 'bronze' ? 'text-amber-600' : tier === 'silver' ? 'text-slate-300' : tier === 'gold' ? 'text-yellow-400' : 'text-cyan-400';
    const tierLabel = language === 'vi'
      ? ({ bronze: 'Đồng', silver: 'Bạc', gold: 'Vàng', diamond: 'Kim Cương' }[tier] || 'Đồng')
      : tier.charAt(0).toUpperCase() + tier.slice(1);

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-2xl bg-slate-900/50 border border-white/[0.06] shadow-xl">
            <CoachCrab size={32} animate={false} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{t('training.title', language)}</h1>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap size={14} className="text-orange-400" />
              <span className="text-[10px] uppercase tracking-wider text-slate-500">XP</span>
            </div>
            <p className="text-base font-bold text-white">{totalXp} <span className="text-xs font-normal text-slate-500">/ {xpForNext}</span></p>
            <div className="mt-1.5 h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all" style={{ width: `${xpProgress * 100}%` }} />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
            <div className="flex items-center gap-1.5 mb-1">
              <Award size={14} className="text-yellow-400" />
              <span className="text-[10px] uppercase tracking-wider text-slate-500">{language === 'vi' ? 'Hạng' : 'Tier'}</span>
            </div>
            <p className={`text-base font-bold ${tierColor}`}>{tierLabel}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
            <div className="flex items-center gap-1.5 mb-1">
              <Flame size={14} className="text-red-400" />
              <span className="text-[10px] uppercase tracking-wider text-slate-500">{language === 'vi' ? 'Chuỗi' : 'Streak'}</span>
            </div>
            <p className="text-base font-bold text-white">{streak} <span className="text-xs font-normal text-slate-500">{language === 'vi' ? 'ngày' : 'days'}</span></p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {modes.map((m, i) => (
            <motion.button
              key={m.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
transition={{ delay: i * 0.05 }}
               onClick={() => { setMode(m.key); reset(); }}
               className="text-left p-6 rounded-2xl border border-white/[0.06] bg-slate-900/50 hover:bg-slate-900/80 transition-all hover:border-white/[0.1] hover:translate-y-[-4px] group glass-card"
             >
               <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${m.color} mb-4 shadow-lg shadow-black/20`}>
                 <m.icon size={20} className="text-white" />
               </div>
               <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-orange-400 transition-colors">{m.title}</h3>
               <p className="text-sm text-slate-400 mb-3">{m.desc}</p>
               <div className="flex items-center justify-between text-xs">
                 <span className="text-orange-400 font-medium flex items-center gap-1">
                   <Zap size={12} /> +{m.xp} XP
                 </span>
                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                   m.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                   m.difficulty === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                   'bg-rose-500/20 text-rose-400'
                 }`}>
                   {language === 'vi' ? (
                     m.difficulty === 'Easy' ? 'Dễ' :
                     m.difficulty === 'Medium' ? 'TB' : 'Khó'
                   ) : m.difficulty}
                 </span>
               </div>
               <p className="text-[10px] text-slate-500 mt-1">{m.time}</p>
             </motion.button>
           ))}
         </div>
       </div>
     );
   }

  const modeLabel = mode === 'rebuttal' ? t('training.rebuttal', language)
    : mode === 'speech' ? t('training.speech', language)
    : mode === 'poi' ? t('training.poi', language)
    : t('training.framing', language);

  const showsGeneratedArg = generatedArg && (mode === 'rebuttal' || mode === 'poi');
  const generatedArgLabel = language === 'vi' ? 'Lu\u1eadn \u0111i\u1ec3m c\u1ee7a \u0111\u1ed1i th\u1ee7:' : 'Opponent\'s argument:';

  const inputLabel = mode === 'poi'
    ? (language === 'vi' ? 'Vi\u1ebft POI c\u1ee7a b\u1ea1n:' : 'Write your POI:')
    : mode === 'rebuttal'
    ? (language === 'vi' ? 'Vi\u1ebft ph\u1ea3n bi\u1ec7n c\u1ee7a b\u1ea1n:' : 'Write your rebuttal:')
    : mode === 'speech'
    ? (language === 'vi' ? 'Vi\u1ebft b\u00e0i ph\u00e1t bi\u1ec3u c\u1ee7a b\u1ea1n:' : 'Write your speech:')
    : (language === 'vi' ? 'Vi\u1ebft \u0111o\u1ea1n khung l\u1eadp lu\u1eadn:' : 'Write your framing paragraph:');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={() => setMode('menu')} className="text-sm text-slate-400 hover:text-orange-400 mb-4 transition-colors">
        {t('common.back', language)}
      </button>

      <div className="flex items-center gap-3 mb-6">
        <CoachCrab size={36} animate={false} />
        <h1 className="text-xl font-bold text-white">{modeLabel}</h1>
      </div>

      {!aiConfigured && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
          {language === 'vi' ? 'AI chỉ được quản lý bởi admin. Liên hệ admin để cấu hình.' : 'AI access is controlled by admin. Please ask an admin to configure AI for the system.'}
        </div>
      )}

      {step === 'generate' && (
        <div className="space-y-4 mb-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">{t('battle.difficulty', language)}</label>
              <div className="flex gap-2">
                {battleDifficultyLevels.map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${difficulty === d ? 'bg-orange-500 text-white' : 'bg-slate-800/50 text-slate-400'}`}>
                    {t(`battle.${d}`, language)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">{t('battle.category', language)}</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'random' ? t('battle.random', language) : (t(`topics.${c}`, language) || c)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Motion Toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">{t('battle.motion_source', language) || 'Motion Source'}</label>
            <div className="flex gap-1.5">
              <button onClick={() => { setUseCustomMotion(false); setCustomMotion(''); }}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${!useCustomMotion ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                {language === 'vi' ? 'Ngẫu nhiên' : 'Random'}
              </button>
              <button onClick={() => setUseCustomMotion(true)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${useCustomMotion ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                {language === 'vi' ? 'Tự nhập' : 'Custom'}
              </button>
            </div>
            {useCustomMotion && (
              <textarea
                value={customMotion}
                onChange={e => setCustomMotion(e.target.value)}
                placeholder={language === 'vi' ? 'Nhập đề bài...' : 'Enter your motion...'}
                className="w-full px-3 py-2 mt-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                rows={2}
              />
            )}
          </div>

          {(mode === 'speech' || mode === 'framing') && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">{t('battle.side', language)}</label>
              <div className="flex gap-2">
                {battleSides.map(s => (
                  <button key={s} onClick={() => setSide(s)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${side === s ? 'bg-orange-500 text-white' : 'bg-slate-800/50 text-slate-400'}`}>
                    {t(`battle.${s}`, language)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              if (!aiConfigured) return;
              if (mode === 'poi') generatePOIArgument();
              else if (motionOnlyModes.includes(mode)) {
                const m = randomizeMotion();
                if (m || useCustomMotion) { setStep('input'); }
              }
              else generateArgument();
            }}
            disabled={!aiConfigured || (useCustomMotion && !customMotion)}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            <Shuffle size={16} className="inline mr-2" />
            {t('training.generate', language)}
          </button>
        </div>
      )}

      {step === 'input' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {selectedMotion && !useCustomMotion && (
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">{t('battle.motion', language)}</p>
              <p className="text-white font-medium">{debateLang === 'vi' ? selectedMotion.motion_vi : selectedMotion.motion_en}</p>
              {(mode === 'speech' || mode === 'framing') && (
                <p className="text-xs text-orange-400 mt-2">{t('battle.side', language)}: {side === 'for' ? t('battle.for', language) : t('battle.against', language)}</p>
              )}
            </div>
          )}

          {useCustomMotion && (
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">{t('battle.motion', language)}</p>
              <p className="text-white font-medium">{customMotion}</p>
              {(mode === 'speech' || mode === 'framing') && (
                <p className="text-xs text-orange-400 mt-2">{t('battle.side', language)}: {side === 'for' ? t('battle.for', language) : t('battle.against', language)}</p>
              )}
            </div>
          )}

          {showsGeneratedArg && (
            <div className="p-4 rounded-xl bg-slate-700/20 border border-slate-600/30">
              <p className="text-xs text-orange-400 mb-2">{generatedArgLabel}</p>
              <MarkdownRenderer content={generatedArg} className="text-sm" />
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <CoachCrab size={50} />
              <p className="text-sm text-slate-400 animate-pulse">
                {language === 'vi' ? 'AI \u0111ang t\u1ea1o lu\u1eadn \u0111i\u1ec3m...' : 'AI is generating argument...'}
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">{inputLabel}</label>
                <textarea
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  rows={mode === 'poi' ? 3 : 6}
                  placeholder=""
                />
              </div>

              <button
                onClick={() => {
                  if (mode === 'rebuttal') submitRebuttal();
                  else if (mode === 'speech') submitSpeech();
                  else if (mode === 'poi') submitPOI();
                  else submitFraming();
                }}
                disabled={!userInput.trim()}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                <Send size={16} className="inline mr-2" />
                {t('training.submit', language)}
              </button>
            </>
          )}
        </motion.div>
      )}

      {step === 'feedback' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="p-5 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <h3 className="font-semibold text-orange-400 mb-3">{t('training.feedback', language)}</h3>
            <MarkdownRenderer content={feedback} className="text-sm" />
          </div>
          <button
            onClick={reset}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-all"
          >
            {language === 'vi' ? 'Luy\u1ec7n ti\u1ebfp' : 'Practice Again'}
          </button>
        </motion.div>
      )}
    </div>
  );
}
