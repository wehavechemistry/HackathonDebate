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
      <div className="flex items-center gap-3 mb-6">
        <CoachCrab size={40} animate={false} />
        <h1 className="text-2xl font-bold text-white">{t('prep.title', language)}</h1>
      </div>

      {!aiConfigured && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
          {language === 'vi' ? 'AI chỉ được quản lý bởi admin. Liên hệ admin để cấu hình.' : 'AI access is controlled by admin. Please ask an admin to configure AI for the system.'}
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">{t('prep.topic', language)}</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder={language === 'vi' ? 'Nh\u1eadp \u0111\u1ec1 b\u00e0i tranh bi\u1ec7n...' : 'Enter debate motion...'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">{t('prep.position', language)}</label>
          <div className="flex gap-2">
            <button
              onClick={() => setPosition('for')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                position === 'for' ? 'bg-green-500 text-white' : 'bg-slate-800/50 text-slate-400'
              }`}
            >
              {t('battle.for', language)}
            </button>
            <button
              onClick={() => setPosition('against')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                position === 'against' ? 'bg-red-500 text-white' : 'bg-slate-800/50 text-slate-400'
              }`}
            >
              {t('battle.against', language)}
            </button>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={!topic.trim() || isLoading || !aiConfigured}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
        >
          {isLoading
            ? (language === 'vi' ? '\u0110ang t\u1ea1o...' : 'Generating...')
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
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
            <MarkdownRenderer content={result} />
          </div>
          <button
            onClick={saveAsNote}
            className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-all"
          >
            {language === 'vi' ? 'L\u01b0u v\u00e0o ghi ch\u00fa' : 'Save to Notes'}
          </button>
        </motion.div>
      )}
    </div>
  );
}
