import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { Sun, Moon, Globe } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import CoachCrab from '../components/CoachCrab';

export default function Settings() {
  const { currentUser, language, theme, toggleTheme, toggleLanguage } = useStore();

  if (!currentUser) return <Navigate to="/login" />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <CoachCrab size={40} animate={false} />
        <h1 className="text-2xl font-bold text-white">{t('settings.title', language)}</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-white">{t('settings.theme', language)}</h3>
              <p className="text-sm text-slate-400">{theme === 'dark' ? 'Dark' : 'Light'}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="p-3 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-white transition-all"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white">{t('settings.language', language)}</h3>
              <p className="text-sm text-slate-400">{language === 'en' ? 'English' : 'Tiếng Việt'}</p>
            </div>
            <button
              onClick={toggleLanguage}
              className="p-3 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-white transition-all flex items-center gap-2"
            >
              <Globe size={20} />
              <span className="text-sm font-medium">{language.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}