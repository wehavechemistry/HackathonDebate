import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Play, Send, Lightbulb, Star, Clock, ChevronLeft } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import { callOpenRouter, buildDebateSystemPrompt, buildJudgePrompt, buildHintPrompt } from '../api';
import { getBotAvatar } from '../components/BotAvatars';
import MarkdownRenderer from '../components/MarkdownRenderer';
import CoachCrab from '../components/CoachCrab';
import type { BotPersonality, DebateMotion, ChatMessage } from '../types';

export default function Battle() {
  const { language, bots, motions, currentUser, aiConfigured, setBotStars, addActivity, incrementTrainingStat } = useStore();

  const [phase, setPhase] = useState<'setup' | 'prep' | 'debate' | 'judging' | 'finished'>('setup');
  const [selectedBot, setSelectedBot] = useState<BotPersonality | null>(null);
  const [isCustomEngine, setIsCustomEngine] = useState(false);
  const [customStrength, setCustomStrength] = useState(4);
  const [difficulty, setDifficulty] = useState<'easy' | 'intermediate' | 'hard'>('easy');
  const [category, setCategory] = useState('random');
  const [motion_, setMotion] = useState<DebateMotion | null>(null);
  const [side, setSide] = useState<'for' | 'against'>('for');
  const [speakerOrder, setSpeakerOrder] = useState<'1st' | '2nd'>('1st');
  const [speechTime, setSpeechTime] = useState(6);
  const [prepTime, setPrepTime] = useState(0);
  const [debateLang, setDebateLang] = useState<'en' | 'vi'>(language === 'vi' ? 'vi' : 'en');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notes, setNotes] = useState('');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [round, setRound] = useState(1);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [judgment, setJudgment] = useState('');
  const [currentTurn, setCurrentTurn] = useState<'user' | 'ai'>('user');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const categories = ['random', 'education', 'technology', 'environment', 'economics', 'politics', 'society', 'media', 'culture'];

  const randomizeMotion = useCallback(() => {
    let filtered = motions.filter(m => m.difficulty === difficulty);
    if (category !== 'random') filtered = filtered.filter(m => m.category === category);
    if (filtered.length === 0) filtered = motions.filter(m => m.difficulty === difficulty);
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    setMotion(pick);
  }, [difficulty, category, motions]);

  useEffect(() => {
    randomizeMotion();
  }, [difficulty, category, randomizeMotion]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (timerRunning && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, timeRemaining]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const startDebate = async () => {
    if (!motion_) return;
    setPhase('debate');
    setRound(1);
    setMessages([]);
    setHintsUsed(0);
    setTimeRemaining(speechTime * 60);

    if (speakerOrder === '2nd') {
      setCurrentTurn('ai');
      setIsLoading(true);
      const sysPrompt = buildDebateSystemPrompt(
        isCustomEngine ? null : selectedBot,
        customStrength,
        debateLang,
        debateLang === 'vi' ? motion_.motion_vi : motion_.motion_en,
        side,
        speakerOrder,
        isCustomEngine,
      );
      const result = await callOpenRouter([
        { role: 'system', content: sysPrompt },
        { role: 'user', content: debateLang === 'vi'
          ? `B\u1eaft \u0111\u1ea7u tranh bi\u1ec7n. B\u1ea1n l\u00e0 di\u1ec5n gi\u1ea3 \u0111\u1ea7u ti\u00ean. H\u00e3y tr\u00ecnh b\u00e0y b\u00e0i m\u1edf \u0111\u1ea7u c\u1ee7a b\u1ea1n.`
          : 'The debate begins. You are the first speaker. Present your opening speech.' },
      ]);
      setMessages([{ role: 'assistant', content: result, timestamp: new Date().toISOString() }]);
      setIsLoading(false);
      setCurrentTurn('user');
      setTimeRemaining(speechTime * 60);
    } else {
      setCurrentTurn('user');
      setTimeRemaining(speechTime * 60);
    }
  };

  const submitSpeech = async () => {
    if (!inputText.trim() || !motion_) return;
    const userMsg: ChatMessage = { role: 'user', content: inputText.trim(), timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setTimerRunning(false);
    setCurrentTurn('ai');
    setIsLoading(true);
    setRound(prev => prev + 1);

    const sysPrompt = buildDebateSystemPrompt(
      isCustomEngine ? null : selectedBot,
      customStrength,
      debateLang,
      debateLang === 'vi' ? motion_.motion_vi : motion_.motion_en,
      side,
      speakerOrder,
      isCustomEngine,
    );

    const chatHistory = newMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const result = await callOpenRouter([
      { role: 'system', content: sysPrompt },
      ...chatHistory,
    ]);

    const aiMsg: ChatMessage = { role: 'assistant', content: result, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
    setCurrentTurn('user');
    setTimeRemaining(speechTime * 60);
  };

  const requestHint = async () => {
    if (!motion_) return;
    setIsLoading(true);
    const hintPrompt = buildHintPrompt(debateLang);
    const motionText = debateLang === 'vi' ? motion_.motion_vi : motion_.motion_en;
    const lastAiMsg = [...messages].reverse().find(m => m.role === 'assistant');
    const result = await callOpenRouter([
      { role: 'system', content: hintPrompt },
      { role: 'user', content: `Motion: ${motionText}\nMy side: ${side}\n${lastAiMsg ? `Opponent said: ${lastAiMsg.content.slice(0, 300)}` : ''}\nGive me a quick hint.` },
    ]);
    setHintsUsed(prev => prev + 1);
    const hintMsg: ChatMessage = { role: 'system', content: `**Hint:** ${result}`, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, hintMsg]);
    setIsLoading(false);
  };

  const endDebate = async () => {
    if (!motion_) return;
    setPhase('judging');
    setIsLoading(true);
    setTimerRunning(false);

    const judgePrompt = buildJudgePrompt(debateLang);
    const motionText = debateLang === 'vi' ? motion_.motion_vi : motion_.motion_en;
    const debateLog = messages.filter(m => m.role !== 'system').map(m =>
      `[${m.role === 'user' ? 'User' : 'AI'}]: ${m.content}`
    ).join('\n\n');

    const result = await callOpenRouter([
      { role: 'system', content: judgePrompt },
      { role: 'user', content: `Motion: "${motionText}"\nUser side: ${side}\n\n--- Debate Transcript ---\n${debateLog}\n\n--- End ---\n\nJudge this debate.` },
    ]);

    setJudgment(result);
    setIsLoading(false);
    setPhase('finished');

    incrementTrainingStat('debates');
    const botName = isCustomEngine ? 'Engine' : (selectedBot?.name || 'AI');
    addActivity({ type: 'battle', title: `${language === 'vi' ? 'Tr\u1eadn \u0111\u1ea5u v\u1edbi' : 'Battle vs'} ${botName}`, detail: motionText.slice(0, 50) });

    // Thay đoạn "// Determine stars" cũ bằng:

    // Determine stars
    if (!isCustomEngine && selectedBot) {
      // Parse điểm từ dòng "SCORE: X/40"
      const scoreMatch = result.match(/SCORE:\s*(\d+)\/40/i);
      const rawScore = scoreMatch ? parseInt(scoreMatch[1]) : 0;
      const score = (rawScore / 40) * 10; // Quy về thang 10

      const isWin = score > 8;

      if (isWin) {
        let stars = 3;
        if (hintsUsed === 1) stars = 2;
        if (hintsUsed >= 2) stars = 1;
        setBotStars(selectedBot.id, stars);
      } else {
        setBotStars(selectedBot.id, 0); // Thua → 0 sao
      }
    }
  };

  // SETUP PHASE
  if (phase === 'setup') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <CoachCrab size={40} animate={false} />
            <h1 className="text-2xl font-bold text-white">{t('battle.title', language)}</h1>
          </div>

          {/* Bot Selection */}
          <div className="mb-6">
            <h2 className="text-sm font-medium text-slate-400 mb-3">{t('battle.select_bot', language)}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {bots.map(bot => {
                const stars = currentUser?.botStars[bot.id] || 0;
                return (
                  <button
                    key={bot.id}
                    onClick={() => { setSelectedBot(bot); setIsCustomEngine(false); }}
                    className={`p-3 rounded-xl border transition-all text-left ${
                      selectedBot?.id === bot.id && !isCustomEngine
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex justify-center mb-2">{getBotAvatar(bot.avatar, 48)}</div>
                    <p className="text-sm font-medium text-white text-center">{bot.name}</p>
                    <p className="text-xs text-slate-400 text-center mt-1">
                      {t('battle.strength', language)}: {bot.displayStrength}
                    </p>
                    {stars > 0 && (
                      <div className="flex justify-center gap-0.5 mt-1">
                        {[1, 2, 3].map(s => (
                          <Star key={s} size={12} className={s <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
              {/* Custom Engine */}
              <button
                onClick={() => { setIsCustomEngine(true); setSelectedBot(null); }}
                className={`p-3 rounded-xl border transition-all ${
                  isCustomEngine
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-center mb-2">{getBotAvatar('engine', 48)}</div>
                <p className="text-sm font-medium text-white text-center">{t('battle.custom_engine', language)}</p>
                {isCustomEngine && (
                  <div className="mt-2">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={customStrength}
                      onChange={e => setCustomStrength(Number(e.target.value))}
                      className="w-full accent-orange-500"
                    />
                    <p className="text-xs text-center text-orange-400">{customStrength}/10</p>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Bot Bio */}
          {selectedBot && !isCustomEngine && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-2">
                {getBotAvatar(selectedBot.avatar, 40)}
                <div>
                  <p className="font-medium text-white">{selectedBot.name}</p>
                  <p className="text-xs text-slate-400">{t('battle.strength', language)}: {selectedBot.displayStrength}</p>
                </div>
              </div>
              <p className="text-sm text-slate-300">{language === 'vi' ? selectedBot.bio_vi : selectedBot.bio_en}</p>
            </motion.div>
          )}

          {/* Motion Settings */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">{t('battle.difficulty', language)}</label>
              <div className="flex gap-2">
                {(['easy', 'intermediate', 'hard'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      difficulty === d ? 'bg-orange-500 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t(`battle.${d}`, language)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">{t('battle.category', language)}</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'random' ? t('battle.random', language) : (t(`topics.${c}`, language) || c)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Motion Display */}
          {motion_ && (
            <div className="mb-6 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-400">{t('battle.motion', language)}</label>
                <button onClick={randomizeMotion} className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300">
                  <Shuffle size={14} /> {t('battle.randomize', language)}
                </button>
              </div>
              <p className="text-white font-medium">{debateLang === 'vi' ? motion_.motion_vi : motion_.motion_en}</p>
            </div>
          )}

          {/* Battle Settings */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">{t('battle.side', language)}</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSide('for')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    side === 'for' ? 'bg-green-500 text-white' : 'bg-slate-800/50 text-slate-400'
                  }`}
                >
                  {t('battle.for', language)}
                </button>
                <button
                  onClick={() => setSide('against')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    side === 'against' ? 'bg-red-500 text-white' : 'bg-slate-800/50 text-slate-400'
                  }`}
                >
                  {t('battle.against', language)}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">{t('battle.speaker', language)}</label>
              <div className="flex gap-2">
                {(['1st', '2nd'] as const).map(o => (
                  <button
                    key={o}
                    onClick={() => setSpeakerOrder(o)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      speakerOrder === o ? 'bg-orange-500 text-white' : 'bg-slate-800/50 text-slate-400'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                {t('battle.speech_time', language)}: {speechTime} {t('common.minutes', language)}
              </label>
              <input
                type="range"
                min={3}
                max={15}
                value={speechTime}
                onChange={e => setSpeechTime(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                {t('battle.prep_time', language)}: {prepTime} {t('common.minutes', language)}
              </label>
              <input
                type="range"
                min={0}
                max={5}
                value={prepTime}
                onChange={e => setPrepTime(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">{t('battle.language', language)}</label>
              <div className="flex gap-2">
                {(['en', 'vi'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setDebateLang(l)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      debateLang === l ? 'bg-orange-500 text-white' : 'bg-slate-800/50 text-slate-400'
                    }`}
                  >
                    {l === 'en' ? 'English' : 'Ti\u1ebfng Vi\u1ec7t'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!aiConfigured && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
              {language === 'vi' ? 'AI chb 11c quybt cho admin. Li ean hec admin 11 ec 11bi c e0u h ecnh.' : 'AI access is controlled by admin. Please ask an admin to configure AI for the system.'}
            </div>
          )}

          <button
            onClick={startDebate}
            disabled={!motion_ || (!selectedBot && !isCustomEngine) || !aiConfigured}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl transition-all hover:scale-[1.01] shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={18} className="inline mr-2" />
            {t('battle.start', language)}
          </button>
        </motion.div>
      </div>
    );
  }

  // DEBATE / JUDGING / FINISHED PHASE
  const motionText = motion_ ? (debateLang === 'vi' ? motion_.motion_vi : motion_.motion_en) : '';
  const botName = isCustomEngine ? 'Engine' : (selectedBot?.name || 'AI');

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 h-[calc(100vh-5rem)]">
      {/* HUD */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <button onClick={() => setPhase('setup')} className="text-slate-400 hover:text-white">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400">{t('battle.motion', language)}</p>
          <p className="text-sm text-white font-medium truncate">{motionText}</p>
        </div>
        <div className="flex items-center gap-3 text-sm shrink-0">
          <span className={`px-2 py-1 rounded text-xs font-medium ${side === 'for' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {t(`battle.${side === 'for' ? 'for' : 'against'}`, language)}
          </span>
          <span className="text-slate-400">R{round}</span>
          <span className={`flex items-center gap-1 font-mono ${timeRemaining <= 30 ? 'text-red-400' : 'text-orange-400'}`}>
            <Clock size={14} /> {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100%-5rem)]">
        {/* Notes sidebar */}
        <div className="hidden md:flex flex-col w-64 shrink-0">
          <div className="flex-1 bg-slate-800/30 border border-slate-700/50 rounded-xl p-3 flex flex-col">
            <h3 className="text-xs font-medium text-slate-400 mb-2">{t('battle.notes', language)}</h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 resize-none focus:outline-none"
              placeholder={language === 'vi' ? 'Ghi ch\u00fa c\u1ee7a b\u1ea1n...' : 'Your notes...'}
            />
          </div>
        </div>

        {/* Main Arena */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 overflow-y-auto mb-3">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <CoachCrab size={60} animate={false} />
                <p className="mt-3 text-sm">{language === 'vi' ? 'Tr\u1eadn \u0111\u1ea5u b\u1eaft \u0111\u1ea7u! H\u00e3y tr\u00ecnh b\u00e0y b\u00e0i ph\u00e1t bi\u1ec3u c\u1ee7a b\u1ea1n.' : 'Debate started! Present your speech.'}</p>
              </div>
            )}

            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-4 ${msg.role === 'user' ? 'flex justify-end' : msg.role === 'system' ? 'flex justify-center' : 'flex justify-start'}`}
                >
                  {msg.role === 'system' ? (
                    <div className="max-w-lg px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                      <MarkdownRenderer content={msg.content} className="text-sm text-orange-300" />
                    </div>
                  ) : (
                    <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {msg.role === 'assistant' && getBotAvatar(isCustomEngine ? 'engine' : (selectedBot?.avatar || 'engine'), 24)}
                        <span className="text-xs text-slate-500">{msg.role === 'user' ? (currentUser?.username || 'You') : botName}</span>
                      </div>
                      <div className={`px-4 py-3 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-orange-500/20 border border-orange-500/30'
                          : 'bg-slate-700/30 border border-slate-600/30'
                      }`}>
                        <MarkdownRenderer content={msg.content} className="text-sm" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                {getBotAvatar(isCustomEngine ? 'engine' : (selectedBot?.avatar || 'engine'), 24)}
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 bg-orange-400 rounded-full" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Controls */}
          {phase === 'debate' && (
            <div className="space-y-2">
              {currentTurn === 'user' && !timerRunning && !isLoading && (
                <button
                  onClick={() => { setTimerRunning(true); }}
                  className="w-full py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-sm rounded-lg transition-all"
                >
                  <Play size={14} className="inline mr-1" /> {t('battle.start_timer', language)}
                </button>
              )}

              <div className="flex gap-2">
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={currentTurn === 'user'
                    ? (language === 'vi' ? 'Nh\u1eadp b\u00e0i ph\u00e1t bi\u1ec3u c\u1ee7a b\u1ea1n...' : 'Type your speech...')
                    : (language === 'vi' ? '\u0110ang ch\u1edd AI...' : 'Waiting for AI...')}
                  disabled={currentTurn !== 'user' || isLoading}
                  className="flex-1 px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none disabled:opacity-50"
                  rows={3}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) submitSpeech(); }}
                />
                <div className="flex flex-col gap-1">
                  <button
                    onClick={submitSpeech}
                    disabled={!inputText.trim() || currentTurn !== 'user' || isLoading}
                    className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all disabled:opacity-50"
                    title={t('battle.submit', language)}
                  >
                    <Send size={16} />
                  </button>
                  <button
                    onClick={requestHint}
                    disabled={isLoading}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-yellow-400 rounded-lg transition-all disabled:opacity-50"
                    title={t('battle.hint', language)}
                  >
                    <Lightbulb size={16} />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  {language === 'vi' ? `G\u1ee3i \u00fd \u0111\u00e3 d\u00f9ng: ${hintsUsed}` : `Hints used: ${hintsUsed}`} | Ctrl+Enter {language === 'vi' ? '\u0111\u1ec3 g\u1eedi' : 'to send'}
                </p>
                <button
                  onClick={endDebate}
                  className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-all"
                >
                  {t('battle.end_debate', language)}
                </button>
              </div>
            </div>
          )}

          {/* Judgment Display */}
          {phase === 'finished' && judgment && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 max-h-80 overflow-y-auto">
              <MarkdownRenderer content={judgment} />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setPhase('setup')}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-all"
                >
                  {language === 'vi' ? 'Tr\u1eadn m\u1edbi' : 'New Battle'}
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'judging' && isLoading && (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 text-center">
              <CoachCrab size={50} />
              <p className="mt-2 text-sm text-slate-400">{language === 'vi' ? '\u0110ang ch\u1ea5m \u0111i\u1ec3m...' : 'Judging...'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
