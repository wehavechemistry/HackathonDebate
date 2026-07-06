import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import CoachCrab from '../components/CoachCrab';
import { useEffect } from 'react';
import { homeFeatureCards } from '../data/content';
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function Home() {
  const { language, announcements, motions } = useStore();
  useEffect(() => {
    fetch('/restart_server', { method: 'POST' });
  }, []);
  
  const randomMotion = motions.length > 0 
    ? motions[Math.floor(Math.random() * motions.length)]
    : null;
  
  const features = homeFeatureCards.map(card => ({
    ...card,
    title: t(card.titleKey, language),
    desc: t(card.descKey, language),
  }));

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-6 pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-cyan-500/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-cyan-500/20 rounded-full blur-[128px]" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
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
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium rounded-xl shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95 animate-pulse-glow"
            >
              {t('home.hero.cta', language)}
            </Link>
            <Link
              to="/battle"
              className="px-8 py-3 border border-white/[0.08] hover:border-orange-500 bg-white/5 text-slate-300 hover:text-orange-400 font-medium rounded-xl transition-all hover:scale-105 active:scale-95"
            >
              {t('home.hero.cta2', language)}
            </Link>
          </motion.div>
         </div>
       </section>

       {/* Daily Motion Card */}
       {randomMotion && (
         <section className="max-w-5xl mx-auto px-6 pb-8">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1, duration: 0.5 }}
             className="p-6 bg-slate-900/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/20"
           >
             <div className="flex items-center gap-3 mb-3">
               <CalendarDays size={20} className="text-orange-400" />
               <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wider">{language === 'vi' ? 'Đề bài hôm nay' : 'Daily Motion'}</h3>
             </div>
             <p className="text-lg text-white mb-4">{language === 'vi' ? randomMotion.motion_vi : randomMotion.motion_en}</p>
             <div className="flex gap-2">
               <Link
                 to="/battle"
                 className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-all"
               >
                 {language === 'vi' ? 'Tranh luận ngay' : 'Debate Now'}
               </Link>
               <Link
                 to="/prep"
                 className="px-4 py-2 border border-white/[0.08] hover:border-orange-500 text-slate-300 hover:text-orange-400 text-sm font-medium rounded-lg transition-all"
               >
                 {language === 'vi' ? 'Chuẩn bị' : 'Prepare'}
               </Link>
             </div>
           </motion.div>
         </section>
       )}

       {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
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
                  className="group block p-6 bg-slate-900/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/20 hover:border-white/[0.15] hover:bg-white/5 hover:translate-y-[-4px] transition-all duration-300"
                >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${f.color} mb-4`}>
                  <f.icon size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                  {f.title}
                </h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">{f.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick Tips */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="flex items-start gap-4 p-6 bg-slate-900/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/20">
          <div className="shrink-0">
            <CoachCrab size={50} animate={false} />
          </div>
          <div>
            <h3 className="font-semibold text-orange-400 mb-1">
              {language === 'vi' ? 'Mẹo từ Coach Crab' : 'Quick Tip from Coach Crab'}
            </h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              {language === 'vi'
                ? 'Hãy bắt đầu với các bài học cơ bản, sau đó luyện tập với các bot AI ở các mức độ khác nhau. Đừng quên dùng chức năng chuẩn bị trước mỗi trận đấu!'
                : 'Start with the beginner lessons, then practice with AI bots at different levels. Don\'t forget to use the Prepare feature before each battle!'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
