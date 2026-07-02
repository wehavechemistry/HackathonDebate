import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Users, Bot, FileText, Megaphone, Plus, Trash2, Edit3, Shield, Ban, Pin, Save, X, Key, CheckCircle, XCircle, ArrowUpDown, ArrowUp, ArrowDown, MessageSquare } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import MarkdownRenderer from '../components/MarkdownRenderer';
import CoachCrab from '../components/CoachCrab';
import type { Lesson, Topic, BotPersonality, Announcement, Post } from '../types';

type Tab = 'lessons' | 'users' | 'bots' | 'topics' | 'announcements' | 'announcements_manage' | 'ai_keys' | 'create_admin' | 'community' | 'prompts';

export default function Admin() {
  const store = useStore();
  const { currentUser, language, users, lessons, topics, bots, announcements, fetchPrompts, updatePrompt } = store;
  const [tab, setTab] = useState<Tab>('lessons');

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'head_admin')) {
    return <Navigate to="/" />;
  }

  const isHeadAdmin = currentUser.role === 'head_admin';

  const tabs: { key: Tab; label: string; icon: React.ElementType; headOnly?: boolean }[] = [
    { key: 'lessons', label: t('admin.lessons', language), icon: BookOpen },
    { key: 'users', label: t('admin.users', language), icon: Users },
    { key: 'bots', label: t('admin.bots', language), icon: Bot },
    { key: 'topics', label: t('admin.topics', language), icon: FileText },
    { key: 'announcements_manage', label: t('admin.announcements_manage', language), icon: Megaphone },
    { key: 'community', label: t('admin.community', language), icon: FileText },
    { key: 'prompts', label: 'AI Prompts', icon: MessageSquare },
    { key: 'ai_keys', label: t('admin.ai_keys', language), icon: Key },
    { key: 'create_admin', label: t('admin.create_admin', language), icon: Shield, headOnly: true },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <CoachCrab size={40} animate={false} />
        <h1 className="text-2xl font-bold text-white">{t('admin.title', language)}</h1>
        <Shield size={20} className="text-orange-400" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.filter(tb => !tb.headOnly || isHeadAdmin).map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === tb.key ? 'bg-orange-500 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <tb.icon size={16} />
            {tb.label}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {tab === 'lessons' && <LessonsManager />}
        {tab === 'users' && <UsersManager />}
        {tab === 'bots' && <BotsManager />}
        {tab === 'topics' && <TopicsManager />}
        {tab === 'announcements_manage' && <AnnouncementsManager />}
        {tab === 'community' && <CommunityManager />}
        {tab === 'prompts' && <PromptsManager />}
        {tab === 'ai_keys' && <AiKeysManager />}
        {tab === 'create_admin' && isHeadAdmin && <CreateAdmin />}
      </motion.div>
    </div>
  );
}

function LessonsManager() {
  const { lessons, language, addLesson, updateLesson, deleteLesson, reorderLessons } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Lesson>>({});

  const moveLesson = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...lessons].sort((a, b) => {
      if (a.level !== b.level) return a.level.localeCompare(b.level);
      return a.order - b.order;
    });
    const idx = sorted.findIndex(l => l.id === id);
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const newSorted = [...sorted];
    [newSorted[idx], newSorted[newIdx]] = [newSorted[newIdx], newSorted[idx]];
    await reorderLessons(newSorted.map(l => l.id));
  };

  const startCreate = () => {
    setForm({ id: 'l_' + Date.now(), level: 'beginner', title_en: '', title_vi: '', content_en: '', content_vi: '', order: lessons.length + 1, pinned: false });
    setCreating(true);
    setEditing(null);
  };

  const startEdit = (lesson: Lesson) => {
    setForm({ ...lesson });
    setEditing(lesson.id);
    setCreating(false);
  };

  const saveForm = () => {
    if (!form.title_en || !form.title_vi) return;
    if (creating) {
      addLesson(form as Lesson);
    } else if (editing) {
      updateLesson(editing, form);
    }
    setEditing(null);
    setCreating(false);
    setForm({});
  };

  const cancel = () => { setEditing(null); setCreating(false); setForm({}); };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">{t('admin.lessons', language)} ({lessons.length})</h2>
        <button onClick={startCreate} className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-all">
          <Plus size={14} /> {t('admin.create_lesson', language)}
        </button>
      </div>

      {(creating || editing) && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 mb-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Level</label>
              <select value={form.level || 'beginner'} onChange={e => setForm({ ...form, level: e.target.value as Lesson['level'] })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Order</label>
              <input type="number" value={form.order || 1} onChange={e => setForm({ ...form, order: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Title (EN)</label>
              <input type="text" value={form.title_en || ''} onChange={e => setForm({ ...form, title_en: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Title (VI)</label>
              <input type="text" value={form.title_vi || ''} onChange={e => setForm({ ...form, title_vi: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Content (EN) - Markdown</label>
            <textarea value={form.content_en || ''} onChange={e => setForm({ ...form, content_en: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" rows={8} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Content (VI) - Markdown</label>
            <textarea value={form.content_vi || ''} onChange={e => setForm({ ...form, content_vi: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" rows={8} />
          </div>
          {form.content_en && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Preview (EN)</p>
              <div className="p-3 rounded-lg bg-slate-900/30 max-h-40 overflow-y-auto">
                <MarkdownRenderer content={form.content_en} className="text-sm" />
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={saveForm} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-all flex items-center gap-1">
              <Save size={14} /> {t('admin.save', language)}
            </button>
            <button onClick={cancel} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-all flex items-center gap-1">
              <X size={14} /> {t('admin.cancel', language)}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {lessons.sort((a, b) => { if (a.level !== b.level) return a.level.localeCompare(b.level); return a.order - b.order; }).map(l => (
          <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 group">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${
                l.level === 'beginner' ? 'bg-green-500/20 text-green-400' :
                l.level === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>{l.level.slice(0, 3)}</span>
              <span className="text-sm text-white truncate">{language === 'vi' ? l.title_vi : l.title_en}</span>
              {l.pinned && <Pin size={12} className="text-orange-400 shrink-0" />}
            </div>
             <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => moveLesson(l.id, 'up')} className="p-1.5 text-slate-400 hover:text-orange-400 transition-colors" title="Move Up">
                <ArrowUp size={14} />
              </button>
              <button onClick={() => moveLesson(l.id, 'down')} className="p-1.5 text-slate-400 hover:text-orange-400 transition-colors" title="Move Down">
                <ArrowDown size={14} />
              </button>
              <button onClick={() => updateLesson(l.id, { pinned: !l.pinned })} className="p-1.5 text-slate-400 hover:text-orange-400 transition-colors" title={l.pinned ? 'Unpin' : 'Pin'}>
                <Pin size={14} />
              </button>
              <button onClick={() => startEdit(l)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"><Edit3 size={14} /></button>
              <button onClick={() => deleteLesson(l.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersManager() {
  const { users, language, banUser, unbanUser, deleteUser, fetchUsers } = useStore();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Permanently delete this user?')) {
      await deleteUser(id);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">{t('admin.users', language)} ({users.length})</h2>
      <div className="space-y-2">
        {users.map(user => (
          <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium truncate ${user.role !== 'user' ? 'text-orange-400' : 'text-white'}`}>{user.username}</p>
                {user.role !== 'user' && <Shield size={12} className="text-orange-400 shrink-0" />}
                {user.banned && <span className="text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Banned</span>}
              </div>
              <p className="text-xs text-slate-500">{user.email} | {user.role}</p>
            </div>
            {user.role === 'user' && (
              <div className="shrink-0 flex gap-1">
                {user.banned ? (
                  <button onClick={() => unbanUser(user.id)} className="px-3 py-1 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-all">
                    {t('admin.unban', language)}
                  </button>
                ) : (
                  <button onClick={() => banUser(user.id)} className="px-3 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-all">
                    {t('admin.ban', language)}
                  </button>
                )}
                <button onClick={() => handleDelete(user.id)} className="p-1 text-slate-400 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BotsManager() {
  const { bots, language, addBot, updateBot, deleteBot, reorderBots } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<BotPersonality>>({});

  const moveBot = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...bots].sort((a, b) => (a.order_num || 0) - (b.order_num || 0) || a.id.localeCompare(b.id));
    const idx = sorted.findIndex(b => b.id === id);
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const newSorted = [...sorted];
    [newSorted[idx], newSorted[newIdx]] = [newSorted[newIdx], newSorted[idx]];
    await reorderBots(newSorted.map(b => b.id));
  };

  const startCreate = () => {
    setForm({ id: 'bot_' + Date.now(), name: '', avatar: 'engine', bio_en: '', bio_vi: '', displayStrength: 5, hiddenPrompt: '', knowledge: 5, logic: 5, rebuttal: 5, vocabulary: 5, creativity: 5, confidence: 5 });
    setCreating(true);
    setEditing(null);
  };

  const startEdit = (bot: BotPersonality) => {
    setForm({ ...bot });
    setEditing(bot.id);
    setCreating(false);
  };

  const saveForm = () => {
    if (!form.name) return;
    if (creating) addBot(form as BotPersonality);
    else if (editing) updateBot(editing, form);
    setEditing(null); setCreating(false); setForm({});
  };

  const cancel = () => { setEditing(null); setCreating(false); setForm({}); };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">{t('admin.bots', language)} ({bots.length})</h2>
        <button onClick={startCreate} className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg">
          <Plus size={14} /> Add Bot
        </button>
      </div>

      {(creating || editing) && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 mb-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Avatar</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {['duy', 'thai', 'han', 'bach', 'dung', 'tom', 'engine'].map(avatarId => (
                  <button
                    key={avatarId}
                    type="button"
                    onClick={() => setForm({ ...form, avatar: avatarId })}
                    className={`w-10 h-10 rounded-full border-2 overflow-hidden transition-all ${
                      form.avatar === avatarId ? 'border-orange-500 shadow-lg shadow-orange-500/30' : 'border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <img src={`/avatars/${avatarId}.png`} alt={avatarId} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <input type="text" value={form.avatar || ''} onChange={e => setForm({ ...form, avatar: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Custom avatar id" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Bio (EN)</label>
              <textarea value={form.bio_en || ''} onChange={e => setForm({ ...form, bio_en: e.target.value })} rows={3}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Bio (VI)</label>
              <textarea value={form.bio_vi || ''} onChange={e => setForm({ ...form, bio_vi: e.target.value })} rows={3}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Display Strength: {form.displayStrength}</label>
            <input type="range" min={1} max={10} step={0.5} value={form.displayStrength || 5} onChange={e => setForm({ ...form, displayStrength: Number(e.target.value) })} className="w-full accent-orange-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Hidden Personality Prompt (Markdown)</label>
            <textarea value={form.hiddenPrompt || ''} onChange={e => setForm({ ...form, hiddenPrompt: e.target.value })} rows={4}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none font-mono" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {(['knowledge', 'logic', 'rebuttal', 'vocabulary', 'creativity', 'confidence'] as const).map(stat => (
              <div key={stat}>
                <label className="block text-xs text-slate-400 mb-1 capitalize">{stat}: {(form as Record<string, number>)[stat] || 5}</label>
                <input type="range" min={1} max={10} value={(form as Record<string, number>)[stat] || 5}
                  onChange={e => setForm({ ...form, [stat]: Number(e.target.value) })} className="w-full accent-orange-500" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={saveForm} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg flex items-center gap-1"><Save size={14} /> Save</button>
            <button onClick={cancel} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg flex items-center gap-1"><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {bots.map(bot => (
          <div key={bot.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 group">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm text-white font-medium">{bot.name}</span>
              <span className="text-xs text-slate-400">Str: {bot.displayStrength}</span>
            </div>
             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => moveBot(bot.id, 'up')} className="p-1.5 text-slate-400 hover:text-orange-400" title="Move Up"><ArrowUp size={14} /></button>
              <button onClick={() => moveBot(bot.id, 'down')} className="p-1.5 text-slate-400 hover:text-orange-400" title="Move Down"><ArrowDown size={14} /></button>
              <button onClick={() => startEdit(bot)} className="p-1.5 text-slate-400 hover:text-blue-400"><Edit3 size={14} /></button>
              <button onClick={() => deleteBot(bot.id)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopicsManager() {
  const { topics, language, addTopic, updateTopic, deleteTopic, reorderTopics } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Topic>>({});

  const categories = ['education', 'technology', 'environment', 'economics', 'politics', 'society', 'media', 'culture', 'misc'];

  const moveTopic = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...topics].sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
    const idx = sorted.findIndex(t => t.id === id);
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const newSorted = [...sorted];
    [newSorted[idx], newSorted[newIdx]] = [newSorted[newIdx], newSorted[idx]];
    await reorderTopics(newSorted.map(t => t.id));
  };

  const startCreate = () => {
    setForm({ id: 't_' + Date.now(), category: 'education', title_en: '', title_vi: '', content_en: '', content_vi: '' });
    setCreating(true); setEditing(null);
  };

  const startEdit = (topic: Topic) => {
    setForm({ ...topic }); setEditing(topic.id); setCreating(false);
  };

  const saveForm = () => {
    if (!form.title_en || !form.title_vi) return;
    if (creating) addTopic(form as Topic);
    else if (editing) updateTopic(editing, form);
    setEditing(null); setCreating(false); setForm({});
  };

  const cancel = () => { setEditing(null); setCreating(false); setForm({}); };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">{t('admin.topics', language)} ({topics.length})</h2>
        <button onClick={startCreate} className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg">
          <Plus size={14} /> Add Topic
        </button>
      </div>

      {(creating || editing) && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 mb-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <select value={form.category || 'education'} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
           </div>
           <div>
             <label className="block text-xs text-slate-400 mb-1">Thumbnail</label>
             <div className="flex flex-wrap gap-2 mb-2">
               {categories.map(cat => (
                 <button
                   key={cat}
                   type="button"
                   onClick={() => setForm({ ...form, image_id: cat })}
                   className={`w-12 h-12 rounded-lg border-2 overflow-hidden transition-all ${
                     form.image_id === cat ? 'border-orange-500 shadow-lg shadow-orange-500/30' : 'border-slate-700 hover:border-slate-500'
                   }`}
                 >
                   <img src={`/topic-thumbnails/${cat}.png`} alt={cat} className="w-full h-full object-cover" />
                 </button>
               ))}
             </div>
             <input type="text" value={form.image_id || ''} onChange={e => setForm({ ...form, image_id: e.target.value })}
               className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Custom image id (leave empty for none)" />
           </div>
           <div className="grid sm:grid-cols-2 gap-4">
             <div>
               <label className="block text-xs text-slate-400 mb-1">Title (EN)</label>
              <input type="text" value={form.title_en || ''} onChange={e => setForm({ ...form, title_en: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Title (VI)</label>
              <input type="text" value={form.title_vi || ''} onChange={e => setForm({ ...form, title_vi: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Content (EN) - Markdown</label>
            <textarea value={form.content_en || ''} onChange={e => setForm({ ...form, content_en: e.target.value })} rows={6}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Content (VI) - Markdown</label>
            <textarea value={form.content_vi || ''} onChange={e => setForm({ ...form, content_vi: e.target.value })} rows={6}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={saveForm} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg flex items-center gap-1"><Save size={14} /> Save</button>
            <button onClick={cancel} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg flex items-center gap-1"><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {topics.map(tp => (
          <div key={tp.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 group">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded capitalize shrink-0">{tp.category}</span>
              <span className="text-sm text-white truncate">{language === 'vi' ? tp.title_vi : tp.title_en}</span>
            </div>
             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => moveTopic(tp.id, 'up')} className="p-1.5 text-slate-400 hover:text-orange-400" title="Move Up"><ArrowUp size={14} /></button>
              <button onClick={() => moveTopic(tp.id, 'down')} className="p-1.5 text-slate-400 hover:text-orange-400" title="Move Down"><ArrowDown size={14} /></button>
              <button onClick={() => startEdit(tp)} className="p-1.5 text-slate-400 hover:text-blue-400"><Edit3 size={14} /></button>
              <button onClick={() => deleteTopic(tp.id)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnouncementsManager() {
  const { announcements, language, addAnnouncement, deleteAnnouncement, updateAnnouncement } = useStore();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title_en: '', title_vi: '', content_en: '', content_vi: '' });

  const save = () => {
    if (!form.title_en) return;
    addAnnouncement({ id: 'ann_' + Date.now(), ...form, createdAt: new Date().toISOString() });
    setCreating(false);
    setForm({ title_en: '', title_vi: '', content_en: '', content_vi: '' });
  };

  const startEdit = (ann: any) => {
    setForm({ title_en: ann.title_en, title_vi: ann.title_vi || '', content_en: ann.content_en, content_vi: ann.content_vi || '' });
    setEditingId(ann.id);
    setCreating(false);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateAnnouncement(editingId, form);
    setEditingId(null);
    setForm({ title_en: '', title_vi: '', content_en: '', content_vi: '' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">{t('admin.announcements_manage', language)}</h2>
        <button onClick={() => setCreating(true)} className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg">
          <Plus size={14} /> Add
        </button>
      </div>

      {(creating || editingId) && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 mb-6 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="text" value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })} placeholder="Title (EN)"
              className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <input type="text" value={form.title_vi} onChange={e => setForm({ ...form, title_vi: e.target.value })} placeholder="Title (VI)"
              className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <textarea value={form.content_en} onChange={e => setForm({ ...form, content_en: e.target.value })} placeholder="Content (EN)" rows={3}
              className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
            <textarea value={form.content_vi} onChange={e => setForm({ ...form, content_vi: e.target.value })} placeholder="Content (VI)" rows={3}
              className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={editingId ? saveEdit : save} className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg flex items-center gap-1"><Save size={14} /> {editingId ? 'Update' : 'Save'}</button>
            <button onClick={() => { setCreating(false); setEditingId(null); }} className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg"><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {announcements.map(a => (
          <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 group">
            <div className="min-w-0">
              <p className="text-sm text-white font-medium">{language === 'vi' ? a.title_vi : a.title_en}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleDateString()}</p>
                <span className="text-xs text-slate-400">Votes: {((a as any).upvotes || 0) - ((a as any).downvotes || 0)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => startEdit(a)} className="p-1.5 text-slate-400 hover:text-blue-400"><Edit3 size={14} /></button>
              <button onClick={() => deleteAnnouncement(a.id)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommunityManager() {
  const { posts, language, deletePost, updatePost, fetchPosts } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ upvotes: 0, downvotes: 0 });

  useEffect(() => {
    fetchPosts(1, 50);
  }, [fetchPosts]);

  const startEditVotes = (post: Post) => {
    setEditForm({ upvotes: post.upvotes, downvotes: post.downvotes });
    setEditingId(post.id);
  };

  const saveEditVotes = async () => {
    if (!editingId) return;
    await updatePost(editingId, editForm);
    setEditingId(null);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">{t('admin.community', language)} ({posts.length})</h2>
      <div className="space-y-2">
        {posts.map(post => (
          <div key={post.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 group">
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">{language === 'vi' ? post.title_vi : post.title_en}</p>
              <p className="text-xs text-slate-500">by {post.author_name} | Votes: {post.upvotes - post.downvotes}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => startEditVotes(post)} className="p-1.5 text-slate-400 hover:text-blue-400" title="Edit votes"><Edit3 size={14} /></button>
              <button onClick={() => deletePost(post.id)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingId(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-4">Edit Post Votes</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Upvotes</label>
                <input type="number" value={editForm.upvotes} onChange={e => setEditForm({ ...editForm, upvotes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Downvotes</label>
                <input type="number" value={editForm.downvotes} onChange={e => setEditForm({ ...editForm, downvotes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveEditVotes} className="flex-1 py-2 bg-orange-500 text-white text-sm rounded-lg">Save</button>
                <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-slate-700 text-white text-sm rounded-lg">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PromptsManager() {
  const { language, fetchPrompts, updatePrompt } = useStore();
  const [prompts, setPrompts] = useState<Record<string, { key: string; content_en: string; content_vi: string }>>({});
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ content_en: '', content_vi: '' });

  const promptKeys = [
    'battle_bot',
    'judge',
    'hint',
    'prep',
    'rebuttal',
    'speech',
    'poi',
    'keyword',
    'fallacy_gen',
    'fallacy_spot',
    'weighing_gen',
    'weighing_practice',
    'case_building',
    'framing',
  ];

  const load = async () => {
    setLoading(true);
    const data = await fetchPrompts();
    setPrompts(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (key: string) => {
    const p = prompts[key] || { key, content_en: '', content_vi: '' };
    setEditForm({ content_en: p.content_en, content_vi: p.content_vi });
    setEditingKey(key);
  };

  const saveEdit = async () => {
    if (!editingKey) return;
    await updatePrompt(editingKey, editForm.content_en, editForm.content_vi);
    await load();
    setEditingKey(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">AI Prompts</h2>
        <button onClick={load} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">
          Refresh
        </button>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Templates support placeholders like {'{motion}'}, {'{personality}'}, {'{lang_instruction}'}, {'{skill_profile}'}, etc. They will be replaced at runtime.
      </p>

      {loading && <p className="text-sm text-slate-400">Loading...</p>}

      <div className="space-y-2">
        {promptKeys.map(key => {
          const p = prompts[key];
          return (
            <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 group">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white font-medium">{key}</p>
                <p className="text-xs text-slate-500 truncate">{p ? p.content_en.slice(0, 80) : 'Not set'}</p>
              </div>
              <button onClick={() => startEdit(key)} className="p-1.5 text-slate-400 hover:text-blue-400 shrink-0">
                <Edit3 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {editingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingKey(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-4">Edit Prompt: {editingKey}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">English</label>
                <textarea
                  value={editForm.content_en}
                  onChange={e => setEditForm({ ...editForm, content_en: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none font-mono"
                  rows={6}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Vietnamese</label>
                <textarea
                  value={editForm.content_vi}
                  onChange={e => setEditForm({ ...editForm, content_vi: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none font-mono"
                  rows={6}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={saveEdit} className="flex-1 py-2 bg-orange-500 text-white text-sm rounded-lg">Save</button>
                <button onClick={() => setEditingKey(null)} className="flex-1 py-2 bg-slate-700 text-white text-sm rounded-lg">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AiKeysManager() {
  const { aiKeys, language, fetchAiKeys, addAiKey, updateAiKey, deleteAiKey } = useStore();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ apiKey: string; model: string; priority: number }>({ apiKey: '', model: 'openrouter/auto', priority: 0 });

  useEffect(() => {
    fetchAiKeys();
  }, [fetchAiKeys]);

  const save = async () => {
    if (!form.apiKey) return;
    await addAiKey(form.apiKey, form.model, form.priority);
    setCreating(false);
    setForm({ apiKey: '', model: 'openrouter/auto', priority: 0 });
  };

  const toggleEnabled = async (key: typeof aiKeys[0]) => {
    await updateAiKey(key.id, { enabled: !key.enabled });
  };

  const handleDelete = async (id: string) => {
    await deleteAiKey(id);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">{t('admin.ai_keys', language)} ({aiKeys.length})</h2>
        <button onClick={() => setCreating(true)} className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg">
          <Plus size={14} /> {t('admin.add_key', language)}
        </button>
      </div>

      {creating && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 mb-6 space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('admin.key_api_key', language)}</label>
            <input type="text" value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono" placeholder="sk-or-v1-..." />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('admin.key_model', language)}</label>
            <input type="text" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="openrouter/auto" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('admin.key_priority', language)} (higher = tried first)</label>
            <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg flex items-center gap-1"><Save size={14} /> {t('admin.save_key', language)}</button>
            <button onClick={() => setCreating(false)} className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg"><X size={14} /> {t('admin.cancel', language)}</button>
          </div>
        </div>
      )}

      {aiKeys.length === 0 && !creating && (
        <div className="p-6 text-center text-slate-500 text-sm bg-slate-800/20 rounded-xl border border-slate-700/30">
          {t('admin.no_ai_keys', language)}
        </div>
      )}

      <div className="space-y-2">
        {aiKeys.sort((a, b) => b.priority - a.priority).map(k => (
          <div key={k.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 group">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono truncate max-w-[200px]">{k.api_key.slice(0, 16)}...</span>
                {k.enabled ? <CheckCircle size={12} className="text-green-400 shrink-0" /> : <XCircle size={12} className="text-red-400 shrink-0" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500">{k.model}</span>
                <span className="text-xs text-slate-600">prio: {k.priority}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => toggleEnabled(k)} className="p-1.5 text-slate-400 hover:text-green-400 transition-colors" title={k.enabled ? t('admin.disable_key', language) : t('admin.enable_key', language)}>
                {k.enabled ? <CheckCircle size={14} /> : <XCircle size={14} />}
              </button>
              <button onClick={() => handleDelete(k.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors" title={t('admin.delete_key', language)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateAdmin() {
  const { language, createAdminAccount } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [msg, setMsg] = useState('');

  const handleCreate = async () => {
    if (!email || !password || !username) return;
    const res = await createAdminAccount(email, password, username);
    if (res.success) {
      setMsg(language === 'vi' ? 'Tạo tài khoản quản trị thành công!' : 'Admin account created successfully!');
      setEmail(''); setPassword(''); setUsername('');
    } else {
      setMsg(res.error || (language === 'vi' ? 'Email đã tồn tại.' : 'Email already exists.'));
    }
  };

  return (
    <div className="max-w-md">
      <h2 className="text-lg font-semibold text-white mb-4">{t('admin.create_admin', language)}</h2>
      {msg && <div className="p-3 mb-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 text-sm">{msg}</div>}
      <div className="space-y-3">
        <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username"
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <button onClick={handleCreate} className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-all">
          {t('admin.create_admin', language)}
        </button>
      </div>
    </div>
  );
}
