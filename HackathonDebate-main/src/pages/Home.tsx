import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Swords, Target, Lightbulb } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import CoachCrab from '../components/CoachCrab';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function Home() {
  const { language, announcements } = useStore();

  const features = [
    { icon: BookOpen, title: t('home.features.learn', language), desc: t('home.features.learn.desc', language), to: '/learn', color: 'from-blue-500 to-cyan-500' },
    { icon: Swords, title: t('home.features.battle', language), desc: t('home.features.battle.desc', language), to: '/battle', color: 'from-red-500 to-orange-500' },
    { icon: Target, title: t('home.features.training', language), desc: t('home.features.training.desc', language), to: '/training', color: 'from-green-500 to-emerald-500' },
    { icon: Lightbulb, title: t('home.features.prep', language), desc: t('home.features.prep.desc', language), to: '/prep', color: 'from-purple-500 to-pink-500' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-cyan-500/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <motion.div {...fadeIn} className="mb-8 flex justify-center">
            <CoachCrab size={120} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent"
          >
            {t('home.hero.title', language)}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {t('home.hero.subtitle', language)}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link
              to="/learn"
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:scale-105"
            >
              {t('home.hero.cta', language)}
            </Link>
            <Link
              to="/battle"
              className="px-8 py-3 border border-slate-600 hover:border-orange-500 text-slate-300 hover:text-orange-400 font-semibold rounded-xl transition-all hover:scale-105"
            >
              {t('home.hero.cta2', language)}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Announcements */}
      {announcements.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 mb-12">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            {announcements.map(a => (
              <div key={a.id} className="mb-2 last:mb-0">
                <h3 className="font-semibold text-orange-400">{language === 'vi' ? a.title_vi : a.title_en}</h3>
                <p className="text-sm text-slate-400">{language === 'vi' ? a.content_vi : a.content_en}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.to}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
            >
              <Link
                to={f.to}
                className="group block p-6 rounded-2xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60 transition-all hover:border-slate-600 hover:shadow-xl"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${f.color} mb-4`}>
                  <f.icon size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-orange-400 transition-colors">
                  {f.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick Tips */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="flex items-start gap-4 p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
          <div className="shrink-0">
            <CoachCrab size={50} animate={false} />
          </div>
          <div>
            <h3 className="font-semibold text-orange-400 mb-1">
              {language === 'vi' ? 'M\u1eb9o t\u1eeb Coach Crab' : 'Quick Tip from Coach Crab'}
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              {language === 'vi'
                ? 'H\u00e3y b\u1eaft \u0111\u1ea7u v\u1edbi c\u00e1c b\u00e0i h\u1ecdc c\u01a1 b\u1ea3n, sau \u0111\u00f3 luy\u1ec7n t\u1eadp v\u1edbi c\u00e1c bot AI \u1edf c\u00e1c m\u1ee9c \u0111\u1ed9 kh\u00e1c nhau. \u0110\u1eebng qu\u00ean d\u00f9ng ch\u1ee9c n\u0103ng chu\u1ea9n b\u1ecb tr\u01b0\u1edbc m\u1ed7i tr\u1eadn \u0111\u1ea5u!'
                : 'Start with the beginner lessons, then practice with AI bots at different levels. Don\'t forget to use the Prepare feature before each battle!'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
