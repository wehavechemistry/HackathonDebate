import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronUp, ChevronDown, Calendar } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import MarkdownRenderer from '../components/MarkdownRenderer';
import CoachCrab from '../components/CoachCrab';
import type { Announcement } from '../types';

export default function Announcements() {
  const { language, announcements, voteAnnouncement, updateAnnouncement, deleteAnnouncement } = useStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title_en: '', title_vi: '', content_en: '', content_vi: '' });

  const handleVote = async (announcementId: string) => {
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) return;
    const currentVote = (announcement as any).user_vote || 0;
    const newVote = currentVote === 1 ? 0 : 1;
    await voteAnnouncement(announcementId, newVote as 1 | -1);
  };

  const startEdit = (announcement: Announcement & { upvotes?: number; downvotes?: number; user_vote?: number }) => {
    setEditForm({ title_en: announcement.title_en, title_vi: announcement.title_vi || '', content_en: announcement.content_en, content_vi: announcement.content_vi || '' });
    setEditingId(announcement.id);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateAnnouncement(editingId, editForm);
    setEditingId(null);
    setEditForm({ title_en: '', title_vi: '', content_en: '', content_vi: '' });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <CoachCrab size={40} animate={false} />
        <h1 className="text-2xl font-bold text-white">{t('nav.announcements', language) || 'Announcements'}</h1>
      </div>

      {announcements.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-slate-800/20 rounded-2xl border border-slate-700/30">
          {language === 'vi' ? 'Chưa có thông báo nào.' : 'No announcements yet.'}
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {announcements.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium text-lg">
                        {a.title_en}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <Calendar size={12} />
                        <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 text-xs">
                        <button
                          onClick={() => handleVote(a.id)}
                          className={`p-1 transition-colors ${((a as any).user_vote === 1 ? 'text-orange-400' : 'text-slate-400 hover:text-orange-400')}`}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <span className="font-medium w-6 text-center">{(a as any).upvotes - (a as any).downvotes || 0}</span>
                      </div>
                    </div>
                  </div>

                  {expandedId === a.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-slate-700/50"
                    >
                      <MarkdownRenderer content={a.content_en} />
                    </motion.div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                      className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      {expandedId === a.id ? t('common.back', language) : (t('common.view', language) || 'View')}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}