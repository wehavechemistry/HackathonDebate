import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, BookOpen } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import MarkdownRenderer from '../components/MarkdownRenderer';
import CoachCrab from '../components/CoachCrab';

export default function Topics() {
  const { language, topics } = useStore();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const categories = [
    { key: 'education', label: t('topics.education', language), color: 'from-blue-500 to-cyan-500' },
    { key: 'technology', label: t('topics.technology', language), color: 'from-purple-500 to-violet-500' },
    { key: 'environment', label: t('topics.environment', language), color: 'from-green-500 to-emerald-500' },
    { key: 'economics', label: t('topics.economics', language), color: 'from-yellow-500 to-amber-500' },
    { key: 'politics', label: t('topics.politics', language), color: 'from-red-500 to-rose-500' },
    { key: 'society', label: t('topics.society', language), color: 'from-teal-500 to-cyan-500' },
    { key: 'media', label: t('topics.media', language), color: 'from-indigo-500 to-blue-500' },
    { key: 'culture', label: t('topics.culture', language), color: 'from-pink-500 to-rose-500' },
    { key: 'misc', label: t('topics.misc', language), color: 'from-slate-500 to-gray-500' },
  ];

  // View single topic
  if (activeTopic) {
    const topic = topics.find(tp => tp.id === activeTopic);
    if (!topic) return null;
    const content = language === 'vi' ? topic.content_vi : topic.content_en;
    const title = language === 'vi' ? topic.title_vi : topic.title_en;

    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => setActiveTopic(null)}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-orange-400 mb-6 transition-colors"
        >
          <ChevronLeft size={16} />
          {t('common.back', language)}
        </button>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-white mb-4">{title}</h1>
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
            <MarkdownRenderer content={content} />
          </div>
        </motion.div>
      </div>
    );
  }

  // View category
  if (activeCategory) {
    const catTopics = topics.filter(tp => tp.category === activeCategory);
    const catLabel = categories.find(c => c.key === activeCategory)?.label || activeCategory;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => setActiveCategory(null)}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-orange-400 mb-6 transition-colors"
        >
          <ChevronLeft size={16} />
          {t('common.back', language)}
        </button>
        <h1 className="text-2xl font-bold text-white mb-6">{catLabel}</h1>
        {catTopics.length === 0 ? (
          <p className="text-slate-500">{language === 'vi' ? 'Ch\u01b0a c\u00f3 ch\u1ee7 \u0111\u1ec1 n\u00e0o.' : 'No topics yet.'}</p>
        ) : (
          <div className="space-y-3">
            {catTopics.map((tp, i) => (
              <motion.button
                key={tp.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveTopic(tp.id)}
                className="w-full text-left flex items-center gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50 transition-all group"
              >
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <BookOpen size={18} className="text-orange-400" />
                </div>
                <span className="text-white font-medium group-hover:text-orange-400 transition-colors">
                  {language === 'vi' ? tp.title_vi : tp.title_en}
                </span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Category grid
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <CoachCrab size={40} animate={false} />
        <h1 className="text-2xl font-bold text-white">{t('topics.title', language)}</h1>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <AnimatePresence>
          {categories.map((cat, i) => {
            const count = topics.filter(tp => tp.category === cat.key).length;
            return (
              <motion.button
                key={cat.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveCategory(cat.key)}
                className="text-left p-5 rounded-2xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60 transition-all hover:border-slate-600 group"
              >
                <div className={`inline-flex p-2 rounded-lg bg-gradient-to-r ${cat.color} mb-3`}>
                  <BookOpen size={20} className="text-white" />
                </div>
                <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors">{cat.label}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {count} {language === 'vi' ? 'ch\u1ee7 \u0111\u1ec1' : 'topics'}
                </p>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
