import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Calendar, BarChart3, BookOpen, Bookmark, FileText, Shield, Save } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import CoachCrab from '../components/CoachCrab';

export default function Profile() {
  const { currentUser, language, updateCurrentUser, lessons } = useStore();
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  if (!currentUser) return <Navigate to="/login" />;

  const handleSaveUsername = () => {
    if (newUsername.trim().length >= 2) {
      updateCurrentUser({ username: newUsername.trim() });
      setEditing(false);
    }
  };

  const completedCount = currentUser.completedLessons.length;
  const totalLessons = lessons.length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <User size={28} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      className="px-3 py-1 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      autoFocus
                    />
                    <button onClick={handleSaveUsername} className="p-1.5 bg-orange-500 rounded-lg text-white">
                      <Save size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className={`text-xl font-bold ${
                      currentUser.role === 'head_admin' || currentUser.role === 'admin' ? 'text-orange-400' : 'text-white'
                    }`}>
                      {currentUser.username}
                    </h1>
                    {(currentUser.role === 'admin' || currentUser.role === 'head_admin') && (
                      <Shield size={16} className="text-orange-400" />
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-slate-400 mt-1">
                <Calendar size={14} />
                {t('profile.joined', language)}: {new Date(currentUser.joinDate).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
              </div>
              <p className="text-xs text-slate-500 mt-1">{currentUser.email}</p>
            </div>
          </div>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setNewUsername(currentUser.username); }}
              className="mt-3 text-xs text-orange-400 hover:text-orange-300 transition-colors"
            >
              {t('profile.change_username', language)}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-orange-400" />
            {t('profile.stats', language)}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: language === 'vi' ? 'Tr\u1eadn \u0111\u1ea5u' : 'Debates', value: currentUser.trainingStats.debates || 0 },
              { label: language === 'vi' ? 'Ph\u1ea3n bi\u1ec7n' : 'Rebuttals', value: currentUser.trainingStats.rebuttals || 0 },
              { label: language === 'vi' ? 'Di\u1ec5n thuy\u1ebft' : 'Speeches', value: currentUser.trainingStats.speeches || 0 },
              { label: 'POIs', value: currentUser.trainingStats.pois || 0 },
              { label: language === 'vi' ? 'T\u1eeb kh\u00f3a' : 'Keyword Battles', value: currentUser.trainingStats.keywordBattles || 0 },
              { label: language === 'vi' ? 'Soi l\u1ed7i logic' : 'Fallacy Spotting', value: currentUser.trainingStats.fallacySpotting || 0 },
              { label: language === 'vi' ? 'C\u00e2n nh\u1eafc so s\u00e1nh' : 'Weighing', value: currentUser.trainingStats.weighing || 0 },
              { label: language === 'vi' ? 'X\u00e2y h\u1ec7 th\u1ed1ng' : 'Case Building', value: currentUser.trainingStats.caseBuilding || 0 },
              { label: language === 'vi' ? 'Khung l\u1eadp lu\u1eadn' : 'Framing', value: currentUser.trainingStats.framing || 0 },
              { label: language === 'vi' ? 'B\u00e0i h\u1ecdc' : 'Lessons', value: `${completedCount}/${totalLessons}` },
            ].map((stat, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-900/30 text-center">
                <p className="text-2xl font-bold text-orange-400">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Completed Lessons */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-orange-400" />
            {t('profile.completed_lessons', language)} ({completedCount})
          </h2>
          {completedCount === 0 ? (
            <p className="text-slate-500 text-sm">{language === 'vi' ? 'Ch\u01b0a ho\u00e0n th\u00e0nh b\u00e0i h\u1ecdc n\u00e0o.' : 'No completed lessons yet.'}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {currentUser.completedLessons.map(lid => {
                const lesson = lessons.find(l => l.id === lid);
                if (!lesson) return null;
                return (
                  <span key={lid} className="px-3 py-1 text-xs bg-green-500/10 text-green-400 rounded-full">
                    {language === 'vi' ? lesson.title_vi : lesson.title_en}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Saved Notes */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
            <FileText size={18} className="text-orange-400" />
            {t('profile.saved_notes', language)} ({currentUser.savedNotes.length})
          </h2>
          {currentUser.savedNotes.length === 0 ? (
            <p className="text-slate-500 text-sm">{language === 'vi' ? 'Ch\u01b0a c\u00f3 ghi ch\u00fa.' : 'No notes yet.'}</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {currentUser.savedNotes.map(note => (
                <div key={note.id} className="p-3 rounded-lg bg-slate-900/30">
                  <p className="text-sm text-white font-medium">{note.title}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{note.content.slice(0, 100)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
