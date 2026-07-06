import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, ChevronUp, ChevronDown, MessageSquare, Loader2, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import MarkdownRenderer from '../components/MarkdownRenderer';
import CoachCrab from '../components/CoachCrab';
import type { Post, Reply } from '../types';
import { communityPostCategories } from '../data/content';

export default function Community() {
  const { currentUser, language, posts, fetchPosts, createPost, deletePost, updatePost, fetchReplies, createReply, votePost, voteReply, replies } = useStore();
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'general' as (typeof communityPostCategories)[number] });
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    const result = await fetchPosts(1, 20, 'en');
    setTotal(result.total);
    setPage(1);
    setLoading(false);
  };

  const loadMore = async () => {
    setLoading(true);
    const result = await fetchPosts(page + 1, 20, 'en');
    setPage(p => p + 1);
    setLoading(false);
  };

  const handleVote = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const currentVote = post.user_vote || 0;
    const newVote = currentVote === 1 ? 0 : 1;
    await votePost(postId, newVote as 1 | -1);
  };

  const handleDownvote = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const currentVote = post.user_vote || 0;
    const newVote = currentVote === -1 ? 0 : -1;
    await votePost(postId, newVote as 1 | -1);
  };

  const handleReplyVote = async (replyId: string) => {
    const reply = replies.find(r => r.id === replyId);
    if (!reply) return;
    const currentVote = reply.user_vote || 0;
    const newVote = currentVote === 1 ? 0 : 1;
    await voteReply(replyId, newVote as 1 | -1);
  };

  const openPost = async (post: Post) => {
    setSelectedPostId(post.id);
    setView('detail');
    if (post.reply_count && post.reply_count > 0) {
      await fetchReplies(post.id);
    }
  };

  const submitPost = async () => {
    if (!form.title || !form.content) return;
    const success = await createPost(form.title, form.title, form.content, form.content, 'en', form.category);
    if (success) {
      setCreating(false);
      setForm({ title: '', content: '', category: 'general' });
      loadPosts();
    }
  };

  const submitReply = async () => {
    if (!selectedPostId || !replyContent.trim()) return;
    const success = await createReply(selectedPostId, replyContent, replyContent, undefined, 'en');
    if (success) {
      setReplyContent('');
      setReplying(false);
      await fetchReplies(selectedPostId);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (window.confirm(t('admin.delete', language))) {
      await deletePost(postId);
      setView('list');
      setSelectedPostId(null);
      loadPosts();
    }
  };

  const postReplies = replies.filter(r => r.post_id === selectedPostId);
  const selectedPost = posts.find(p => p.id === selectedPostId);

  if (view === 'detail' && selectedPost) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => { setView('list'); setSelectedPostId(null); }}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-orange-400 mb-6 transition-colors"
        >
          <ChevronLeft size={16} />
          {t('common.back', language)}
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white mb-2">{selectedPost.title_en}</h1>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>by {selectedPost.author_name}</span>
                  <span>{new Date(selectedPost.created_at).toLocaleDateString()}</span>
                  <span className="px-2 py-0.5 bg-slate-700/50 rounded capitalize">{selectedPost.category}</span>
                </div>
              </div>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => handleDeletePost(selectedPost.id)}
                  className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleVote(selectedPost.id)}
                  className={`p-1 transition-colors ${selectedPost.user_vote === 1 ? 'text-orange-400' : 'text-slate-400 hover:text-orange-400'}`}
                >
                  <ChevronUp size={18} />
                </button>
                <span className="text-sm font-medium w-8 text-center">{selectedPost.upvotes - selectedPost.downvotes}</span>
                <button
                  onClick={() => handleDownvote(selectedPost.id)}
                  className={`p-1 transition-colors ${selectedPost.user_vote === -1 ? 'text-red-400' : 'text-slate-400 hover:text-red-400'}`}
                >
                  <ChevronDown size={18} />
                </button>
              </div>
              <div className="flex items-center gap-1 text-sm text-slate-400">
                <MessageSquare size={14} />
                <span>{selectedPost.reply_count || 0}</span>
              </div>
            </div>

            <MarkdownRenderer content={selectedPost.content_en} />
          </div>

          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">{t('common.reply', language) || 'Replies'}</h3>
            
            {postReplies.length === 0 ? (
              <p className="text-slate-500 text-sm">{language === 'vi' ? 'Chưa có trả lời nào.' : 'No replies yet.'}</p>
            ) : (
              <div className="space-y-4">
                {postReplies.map(reply => (
                  <div key={reply.id} className="border-b border-slate-700/50 pb-4 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-white">{reply.author_name}</span>
                        <span className="text-slate-500">{new Date(reply.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleReplyVote(reply.id)}
                          className={`p-0.5 transition-colors ${reply.user_vote === 1 ? 'text-orange-400' : 'text-slate-400 hover:text-orange-400'}`}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <span className="text-xs font-medium w-6 text-center">{reply.upvotes - reply.downvotes}</span>
                        <button
                          onClick={() => {
                            const r = replies.find(rep => rep.id === reply.id);
                            if (r) {
                              const cv = r.user_vote || 0;
                              const nv = cv === -1 ? 0 : -1;
                              voteReply(reply.id, nv as 1 | -1);
                            }
                          }}
                          className={`p-0.5 transition-colors ${reply.user_vote === -1 ? 'text-red-400' : 'text-slate-400 hover:text-red-400'}`}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </div>
                    <MarkdownRenderer content={reply.content_en} className="text-sm" />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-700/50">
              <button
                onClick={() => setReplying(!replying)}
                className="mb-3 text-sm text-orange-400 hover:text-orange-300 transition-colors"
              >
                {replying ? t('common.cancel', language) : (t('common.reply', language) || 'Reply')}
              </button>
              
              <AnimatePresence>
                {replying && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                <div className="space-y-3">
                  <textarea
                    value={replyContent}
                    onChange={e => setReplyContent(e.target.value)}
                    placeholder="Write your reply... (Markdown supported)"
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    rows={3}
                  />
                  <button
                    onClick={submitReply}
                    disabled={!replyContent.trim()}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm rounded-lg transition-all"
                  >
                    {t('admin.save', language) || 'Submit'}
                  </button>
                </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CoachCrab size={40} animate={false} />
          <h1 className="text-2xl font-bold text-white">{t('nav.community', language) || 'Community'}</h1>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-all"
        >
          <Plus size={14} />
          {t('admin.create_post', language) || 'Create Post'}
        </button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 mb-6 space-y-4"
          >
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value as (typeof communityPostCategories)[number] })}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {communityPostCategories.map(c => (
                <option key={c} value={c} className="capitalize">{c}</option>
              ))}
            </select>
            <div className="space-y-3">
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Post title"
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                placeholder="Post content... (Markdown supported)"
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                rows={4}
              />
              <div className="flex gap-2">
                <button
                  onClick={submitPost}
                  disabled={!form.title || !form.content}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm rounded-lg transition-all"
                >
                  {t('admin.save', language) || 'Submit'}
                </button>
                <button
                  onClick={() => setCreating(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-all"
                >
                  {t('admin.cancel', language)}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {posts.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-slate-800/20 rounded-2xl border border-slate-700/30">
          {language === 'vi' ? 'Chưa có bài viết nào. Hãy là người đầu tiên tạo bài!' : 'No posts yet. Be the first to create one!'}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {posts.map((post, i) => (
              <motion.button
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => openPost(post)}
                className="w-full text-left p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-lg mb-1 group-hover:text-orange-400 transition-colors">
                      {post.title_en}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                      <span>by {post.author_name}</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      <span className="px-2 py-0.5 bg-slate-700/50 rounded capitalize">{post.category}</span>
                    </div>
                    <p className="text-slate-400 text-sm line-clamp-2">
                      {post.content_en}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1 text-xs">
                      <ChevronUp size={14} className={post.user_vote === 1 ? 'text-orange-400' : 'text-slate-400'} />
                      <span className="font-medium">{post.upvotes - post.downvotes}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <MessageSquare size={14} />
                      <span>{post.reply_count || 0}</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      {posts.length < total && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-white text-sm rounded-lg transition-all flex items-center gap-2 mx-auto"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? t('common.loading', language) : (t('common.load_more', language) || 'Load More')}
          </button>
        </div>
      )}
    </div>
  );
}