import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shuffle, Send, ArrowRight } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import { callOpenRouter, buildRebuttalPracticePrompt, buildSpeechPracticePrompt, buildPOIPracticePrompt, buildKeywordBattlePrompt } from '../api';
import MarkdownRenderer from '../components/MarkdownRenderer';
import CoachCrab from '../components/CoachCrab';
import type { DebateMotion } from '../types';

type Mode = 'menu' | 'rebuttal' | 'speech' | 'poi' | 'keyword';

export default function Training() {
  const { language, motions, aiConfigured, addActivity, incrementTrainingStat } = useStore();

  const [mode, setMode] = useState<Mode>('menu');
  const [difficulty, setDifficulty] = useState<'easy' | 'intermediate' | 'hard'>('easy');
  const [category, setCategory] = useState('random');
  const [selectedMotion, setSelectedMotion] = useState<DebateMotion | null>(null);
  const [generatedArg, setGeneratedArg] = useState('');
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'generate' | 'input' | 'feedback'>('generate');

  const categories = ['random', 'education', 'technology', 'environment', 'economics', 'politics', 'society', 'media', 'culture'];
  const debateLang = language;

  const randomizeMotion = () => {
    let filtered = motions.filter(m => m.difficulty === difficulty);
    if (category !== 'random') filtered = filtered.filter(m => m.category === category);
    if (filtered.length === 0) filtered = motions.filter(m => m.difficulty === difficulty);
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    setSelectedMotion(pick);
    return pick;
  };

  const generateArgument = async () => {
    const motion = randomizeMotion();
    if (!motion) return;
    setIsLoading(true);
    setStep('input');
    const motionText = debateLang === 'vi' ? motion.motion_vi : motion.motion_en;
    const prompt = debateLang === 'vi'
      ? 'Tao mot luan diem NGAN GON (50-100 tu) ung ho de bai sau. Chi viet luan diem, khong them gi khac.'
      : 'Generate a BRIEF argument (50-100 words) supporting the following motion. Only the argument, nothing else.';
    const result = await callOpenRouter([
      { role: 'system', content: prompt },
      { role: 'user', content: motionText },
    ]);
    setGeneratedArg(result);
    setIsLoading(false);
  };

  const generatePOIArgument = async () => {
    const motion = randomizeMotion();
    if (!motion) return;
    setIsLoading(true);
    setStep('input');
    const motionText = debateLang === 'vi' ? motion.motion_vi : motion.motion_en;
    const prompt = debateLang === 'vi'
      ? 'Tao mot luan diem NGAN GON (30-60 tu) ve de bai nay. Chi viet luan diem.'
      : 'Generate a SHORT argument (30-60 words) about this motion. Only the argument.';
    const result = await callOpenRouter([
      { role: 'system', content: prompt },
      { role: 'user', content: motionText },
    ]);
    setGeneratedArg(result);
    setIsLoading(false);
  };

  const submitRebuttal = async () => {
    if (!userInput.trim()) return;
    setIsLoading(true);
    const prompt = buildRebuttalPracticePrompt(debateLang);
    const result = await callOpenRouter([
      { role: 'system', content: prompt },
      { role: 'user', content: `Original argument:\n${generatedArg}\n\nUser's rebuttal:\n${userInput}` },
    ]);
    setFeedback(result);
    setStep('feedback');
    setIsLoading(false);
    incrementTrainingStat('rebuttals');
    addActivity({ type: 'training', title: language === 'vi' ? 'Luy\u1ec7n ph\u1ea3n bi\u1ec7n' : 'Rebuttal Practice' });
  };

  const submitSpeech = async () => {
    if (!userInput.trim()) return;
    setIsLoading(true);
    const motionText = selectedMotion ? (debateLang === 'vi' ? selectedMotion.motion_vi : selectedMotion.motion_en) : '';
    const prompt = buildSpeechPracticePrompt(debateLang);
    const result = await callOpenRouter([
      { role: 'system', content: prompt },
      { role: 'user', content: `Motion: ${motionText}\n\nUser's speech:\n${userInput}` },
    ]);
    setFeedback(result);
    setStep('feedback');
    setIsLoading(false);
    incrementTrainingStat('speeches');
    addActivity({ type: 'training', title: language === 'vi' ? 'Luy\u1ec7n di\u1ec5n thuy\u1ebft' : 'Speech Practice' });
  };

  const submitPOI = async () => {
    if (!userInput.trim()) return;
    setIsLoading(true);
    const prompt = buildPOIPracticePrompt(debateLang);
    const result = await callOpenRouter([
      { role: 'system', content: prompt },
      { role: 'user', content: `Original argument:\n${generatedArg}\n\nUser's POI:\n${userInput}` },
    ]);
    setFeedback(result);
    setStep('feedback');
    setIsLoading(false);
    incrementTrainingStat('pois');
    addActivity({ type: 'training', title: language === 'vi' ? 'Luy\u1ec7n POI' : 'POI Practice' });
  };

  const submitKeywords = async () => {
    if (!userInput.trim()) return;
    setIsLoading(true);
    const motionText = selectedMotion ? (debateLang === 'vi' ? selectedMotion.motion_vi : selectedMotion.motion_en) : '';
    const prompt = buildKeywordBattlePrompt(debateLang);
    const result = await callOpenRouter([
      { role: 'system', content: prompt },
      { role: 'user', content: `Motion: ${motionText}\n\n5 keywords: ${userInput}` },
    ]);
    setFeedback(result);
    setStep('feedback');
    setIsLoading(false);
    incrementTrainingStat('keywordBattles');
    addActivity({ type: 'training', title: language === 'vi' ? 'Tr\u1eadn t\u1eeb kh\u00f3a' : 'Keyword Battle' });
  };

  const reset = () => {
    setStep('generate');
    setGeneratedArg('');
    setUserInput('');
    setFeedback('');
  };

  if (mode === 'menu') {
    const modes: { key: Mode; title: string; desc: string; color: string }[] = [
      { key: 'rebuttal', title: t('training.rebuttal', language), desc: t('training.rebuttal.desc', language), color: 'from-red-500 to-orange-500' },
      { key: 'speech', title: t('training.speech', language), desc: t('training.speech.desc', language), color: 'from-blue-500 to-cyan-500' },
      { key: 'poi', title: t('training.poi', language), desc: t('training.poi.desc', language), color: 'from-green-500 to-emerald-500' },
      { key: 'keyword', title: t('training.keyword', language), desc: t('training.keyword.desc', language), color: 'from-purple-500 to-pink-500' },
    ];

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-2xl bg-slate-900/50 border border-white/[0.06] shadow-xl">
            <CoachCrab size={32} animate={false} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{t('training.title', language)}</h1>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {modes.map((m, i) => (
            <motion.button
              key={m.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => { setMode(m.key); reset(); }}
              className="text-left p-6 rounded-2xl border border-white/[0.06] bg-slate-900/50 hover:bg-slate-900/80 transition-all hover:border-white/[0.1] group glass-card"
            >
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${m.color} mb-4 shadow-lg shadow-black/20`}>
                <ArrowRight size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-orange-400 transition-colors">{m.title}</h3>
              <p className="text-sm text-slate-400">{m.desc}</p>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  const modeLabel = mode === 'rebuttal' ? t('training.rebuttal', language)
    : mode === 'speech' ? t('training.speech', language)
    : mode === 'poi' ? t('training.poi', language)
    : t('training.keyword', language);

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

      {/* Motion Settings for rebuttal/speech/keyword */}
      {(mode !== 'poi' || step === 'generate') && step === 'generate' && (
        <div className="space-y-4 mb-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">{t('battle.difficulty', language)}</label>
              <div className="flex gap-2">
                {(['easy', 'intermediate', 'hard'] as const).map(d => (
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

          <button
            onClick={() => {
              if (!aiConfigured) return;
              if (mode === 'poi') generatePOIArgument();
              else if (mode === 'keyword' || mode === 'speech') {
                const m = randomizeMotion();
                if (m) { setStep('input'); }
              }
              else generateArgument();
            }}
            disabled={!aiConfigured}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            <Shuffle size={16} className="inline mr-2" />
            {t('training.generate', language)}
          </button>
        </div>
      )}

      {/* Input Step */}
      {step === 'input' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Display motion */}
          {selectedMotion && (
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">{t('battle.motion', language)}</p>
              <p className="text-white font-medium">{debateLang === 'vi' ? selectedMotion.motion_vi : selectedMotion.motion_en}</p>
            </div>
          )}

          {/* Generated argument (for rebuttal/poi) */}
          {generatedArg && (mode === 'rebuttal' || mode === 'poi') && (
            <div className="p-4 rounded-xl bg-slate-700/20 border border-slate-600/30">
              <p className="text-xs text-orange-400 mb-2">{language === 'vi' ? 'Lu\u1eadn \u0111i\u1ec3m \u0111\u1ed1i th\u1ee7:' : 'Opponent\'s argument:'}</p>
              <MarkdownRenderer content={generatedArg} className="text-sm" />
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <CoachCrab size={50} />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  {mode === 'keyword'
                    ? (language === 'vi' ? 'Nh\u1eadp 5 t\u1eeb kh\u00f3a (c\u00e1ch nhau b\u1eb1ng d\u1ea5u ph\u1ea9y):' : 'Enter 5 keywords (comma separated):')
                    : mode === 'poi'
                    ? (language === 'vi' ? 'Vi\u1ebft POI c\u1ee7a b\u1ea1n:' : 'Write your POI:')
                    : mode === 'rebuttal'
                    ? (language === 'vi' ? 'Vi\u1ebft ph\u1ea3n bi\u1ec7n c\u1ee7a b\u1ea1n:' : 'Write your rebuttal:')
                    : (language === 'vi' ? 'Vi\u1ebft b\u00e0i ph\u00e1t bi\u1ec3u c\u1ee7a b\u1ea1n:' : 'Write your speech:')}
                </label>
                <textarea
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  rows={mode === 'keyword' || mode === 'poi' ? 3 : 6}
                  placeholder={mode === 'keyword' ? 'economy, growth, poverty, jobs, tax' : ''}
                />
              </div>

              <button
                onClick={() => {
                  if (mode === 'rebuttal') submitRebuttal();
                  else if (mode === 'speech') submitSpeech();
                  else if (mode === 'poi') submitPOI();
                  else submitKeywords();
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

      {/* Feedback Step */}
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
