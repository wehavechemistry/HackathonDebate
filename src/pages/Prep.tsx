import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { t } from '../i18n';
import { callOpenRouter, buildPrepPrompt } from '../api';
import MarkdownRenderer from '../components/MarkdownRenderer';
import CoachCrab from '../components/CoachCrab';

export default function Prep() {
  const { language, aiConfigured, addActivity, addNote } = useStore();
  const [topic, setTopic] = useState('');
  const [position, setPosition] = useState<'for' | 'against'>('for');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generate = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    const prompt = buildPrepPrompt(language);
    const positionLabel = language === 'vi'
      ? (position === 'for' ? '\u1ee6ng h\u1ed9 (Ch\u00ednh ph\u1ee7)' : 'Ph\u1ea3n \u0111\u1ed1i (\u0110\u1ed1i l\u1eadp)')
      : (position === 'for' ? 'Government (For)' : 'Opposition (Against)');
    const res = await callOpenRouter([
      { role: 'system', content: prompt },
      { role: 'user', content: `Motion: "${topic}"\nPosition: ${positionLabel}` },
    ]);
    setResult(res);
    setIsLoading(false);
    addActivity({ type: 'prep', title: language === 'vi' ? 'Chu\u1ea9n b\u1ecb debate' : 'Debate Prep', detail: topic.slice(0, 50) });
  };

  const saveAsNote = () => {
    if (!result) return;
    addNote(`Prep: ${topic.slice(0, 40)}`, result);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 rounded-2xl bg-slate-900/50 border border-white/[0.06] shadow-xl">
          <CoachCrab size={32} animate={false} />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">{t('prep.title', language)}</h1>
      </div>

      {!aiConfigured && (
        <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 text-sm backdrop-blur-sm">
          {language === 'vi' ? 'AI chỉ được quản lý bởi admin. Liên hệ admin để cấu hình.' : 'AI access is controlled by admin. Please ask an admin to configure AI for the system.'}
        </div>
      )}

      <div className="glass-card p-6 space-y-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-3">{t('prep.topic', language)}</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="w-full px-4 py-3 bg-slate-950/50 border border-white/[0.06] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 cyber-input"
            placeholder={language === 'vi' ? 'Nhập đề bài tranh biện...' : 'Enter debate motion...'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-3">{t('prep.position', language)}</label>
          <div className="flex gap-2 p-1 bg-slate-950/50 border border-white/[0.06] rounded-xl">
            <button
              onClick={() => setPosition('for')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                position === 'for' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t('battle.for', language)}
            </button>
            <button
              onClick={() => setPosition('against')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                position === 'against' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t('battle.against', language)}
            </button>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={!topic.trim() || isLoading || !aiConfigured}
          className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl transition-all hover:scale-[1.01] shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow"
        >
          {isLoading
            ? (language === 'vi' ? 'Đang tạo...' : 'Generating...')
            : t('prep.generate', language)}
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <CoachCrab size={60} />
        </div>
      )}

      {result && !isLoading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-slate-900/50 backdrop-blur-md border border-white/[0.06] rounded-2xl p-6 shadow-xl shadow-slate-950/20">
            <MarkdownRenderer content={result} />
          </div>
          <button
            onClick={saveAsNote}
            className="mt-6 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-all border border-white/[0.06]"
          >
            {language === 'vi' ? 'Lưu vào ghi chú' : 'Save to Notes'}
          </button>
        </motion.div>
      )}
    </div>
  );
}
