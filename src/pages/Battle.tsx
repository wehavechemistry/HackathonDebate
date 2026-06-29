import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Play, Send, Lightbulb, Star, Clock, ChevronLeft, Trophy, Activity, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import { callOpenRouter, buildDebateSystemPrompt, buildJudgePrompt, buildHintPrompt } from '../api';
import { getBotAvatar } from '../components/BotAvatars';
import MarkdownRenderer from '../components/MarkdownRenderer';
import CoachCrab from '../components/CoachCrab';
import type { BotPersonality, DebateMotion, ChatMessage } from '../types';

interface ScoreRow {
  criteria: string;
  user: number;
  opponent: number;
  maxScore: number;
}

interface ParsedJudgment {
  winner: string;
  scores: ScoreRow[];
  analysis: string;
  feedback: string;
  rawMarkdown: string;
}

function parseScoreValue(str: string): { score: number; max: number } {
  const match = str.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) {
    return { score: parseInt(match[1]), max: parseInt(match[2]) };
  }
  const numMatch = str.match(/(\d+)/);
  if (numMatch) {
    return { score: parseInt(numMatch[1]), max: 10 };
  }
  return { score: 0, max: 10 };
}

function parseJudgment(text: string): ParsedJudgment {
  const result: ParsedJudgment = {
    winner: '',
    scores: [],
    analysis: '',
    feedback: '',
    rawMarkdown: text
  };

  if (!text) return result;

  // 1. Winner
  const winnerMatch = text.match(/(?:Winner|ChiĂĄĹĹźn thĂĄĹĹťng|NgÄÂ°ĂĄĹĽÂi thĂĄĹĹťng|Winner is|Winner:)\s*:\s*\**([^*#\r\n\t|]+)\**/i);
  if (winnerMatch) {
    result.winner = winnerMatch[1].trim();
  } else {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('winner:') || line.toLowerCase().includes('chiĂĄĹĹźn thĂĄĹĹťng:')) {
        const parts = line.split(':');
        if (parts.length > 1) {
          result.winner = parts[1].replace(/\*\*/g, '').replace(/#/g, '').trim();
          break;
        }
      }
    }
  }

  if (!result.winner) {
    if (text.toLowerCase().includes('winner is user') || text.toLowerCase().includes('user wins')) {
      result.winner = 'User';
    } else if (text.toLowerCase().includes('winner is ai') || text.toLowerCase().includes('ai wins')) {
      result.winner = 'AI Opponent';
    }
  }

  // 2. Score Breakdown
  const lines = text.split('\n');
  const tableRows: ScoreRow[] = [];
  
  for (const line of lines) {
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 3) {
        const criteria = parts[0];
        const user = parts[1];
        const opponent = parts[2];
        
        const isHeader = criteria.toLowerCase().includes('criteria') || criteria.toLowerCase().includes('tiÄĹu chÄÂ­') || criteria.toLowerCase().includes('hĂĄĹÄng mĂĄĹĽÄ˝c');
        const isDivider = criteria.includes('---') || user.includes('---');
        
        if (isHeader || isDivider) {
          continue;
        }
        
        const parsedUser = parseScoreValue(user);
        const parsedOpponent = parseScoreValue(opponent);
        
        tableRows.push({
          criteria: criteria.replace(/\*\*/g, '').trim(),
          user: parsedUser.score,
          opponent: parsedOpponent.score,
          maxScore: parsedUser.max,
        });
      }
    }
  }
  result.scores = tableRows;

  // 3. Analysis & Feedback
  const analysisMatch = text.match(/(?:###?\s*(?:Analysis|PhÄËn tÄÂ­ch|ĂÂÄÄnh giÄÄ|NhĂĄĹÂ­n xÄĹ t|NĂĄĹĽÂi dung phÄËn tÄÂ­ch|Turning Points)\s*[\r\n]+)([\s\S]*?)(?=###?|$)/i);
  if (analysisMatch) {
    result.analysis = analysisMatch[1].trim();
  }

  const feedbackMatch = text.match(/(?:###?\s*(?:Feedback for User|PhĂĄĹĹn hĂĄĹĽÂi|GĂĄĹĽĹi ÄË|Feedback|Constructive Feedback|LĂĄĹĽÂi khuyÄĹn|GĂĄĹĽĹi ÄË cho ngÄÂ°ĂĄĹĽÂi dÄĹĄng)\s*[\r\n]+)([\s\S]*?)(?=###?|$)/i);
  if (feedbackMatch) {
    result.feedback = feedbackMatch[1].trim();
  }

  if (!result.analysis && text.includes('###')) {
    const parts = text.split(/###?\s+/);
    for (const part of parts) {
      const pLower = part.toLowerCase();
      if (pLower.startsWith('analysis') || pLower.startsWith('phÄËn tÄÂ­ch')) {
        result.analysis = part.substring(part.indexOf('\n')).trim();
      } else if (pLower.startsWith('feedback') || pLower.startsWith('gĂĄĹĽĹi ÄË') || pLower.startsWith('phĂĄĹĹn hĂĄĹĽÂi')) {
        result.feedback = part.substring(part.indexOf('\n')).trim();
      }
    }
  }
  
  return result;
}

interface JudgmentScorecardProps {
  judgmentText: string;
  language: 'en' | 'vi';
  onNewBattle: () => void;
}

function JudgmentScorecard({ judgmentText, language, onNewBattle }: JudgmentScorecardProps) {
  const parsed = parseJudgment(judgmentText);
  
  if (parsed.scores.length === 0) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <MarkdownRenderer content={judgmentText} />
        </div>
        <div className="flex justify-end">
          <button
            onClick={onNewBattle}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/20"
          >
            {language === 'vi' ? 'TrĂĄĹÂ­n ĂÂĂĄĹÄ˝u mĂĄĹĽÂi' : 'New Battle'}
          </button>
        </div>
      </div>
    );
  }

  const totalRow = parsed.scores.find(s => s.criteria.toLowerCase().includes('total') || s.criteria.toLowerCase().includes('tĂĄĹĽÂng'));
  const criteriaRows = parsed.scores.filter(s => !(s.criteria.toLowerCase().includes('total') || s.criteria.toLowerCase().includes('tĂĄĹĽÂng')));
  const userWon = parsed.winner.toLowerCase().includes('user') || parsed.winner.toLowerCase().includes('ngÄÂ°ĂĄĹĽÂi dÄĹĄng') || 
                  (totalRow && totalRow.user > totalRow.opponent);

  return (
    <div className="space-y-6 pb-6">
      <div className={`relative overflow-hidden rounded-2xl border p-6 transition-all ${
        userWon 
          ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-slate-950/60 to-slate-950/80 shadow-emerald-950/20' 
          : 'border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-slate-950/60 to-slate-950/80 shadow-orange-950/20'
      } shadow-lg`}>
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl" />
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl ${userWon ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                {language === 'vi' ? 'KĂĄĹĹźt quĂĄĹĹ chung cuĂĄĹĽÂc' : 'Final Result'}
              </p>
              <h2 className="text-xl font-black text-white mt-0.5">
                {language === 'vi' ? 'NgÄÂ°ĂĄĹĽÂi thĂĄĹĹťng: ' : 'Winner: '}
                <span className={userWon ? 'text-emerald-400' : 'text-orange-400'}>
                  {parsed.winner || (userWon ? 'User' : 'AI Opponent')}
                </span>
              </h2>
            </div>
          </div>
          
          {totalRow && (
            <div className="flex items-center gap-4 bg-slate-950/80 px-5 py-3 rounded-xl border border-slate-800/80">
              <div className="text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">{language === 'vi' ? 'BĂĄĹÄn' : 'You'}</span>
                <span className="text-xl font-extrabold text-orange-400">{totalRow.user}</span>
                <span className="text-xs text-slate-500">/{totalRow.maxScore}</span>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div className="text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">AI</span>
                <span className="text-xl font-extrabold text-slate-300">{totalRow.opponent}</span>
                <span className="text-xs text-slate-500">/{totalRow.maxScore}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          {language === 'vi' ? 'Chi tiĂĄĹĹźt ĂÂiĂĄĹĽÂm sĂĄĹĽÂ' : 'Detailed Score breakdown'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {criteriaRows.map((row, idx) => {
            const userPercent = (row.user / row.maxScore) * 100;
            const opponentPercent = (row.opponent / row.maxScore) * 100;
            
            return (
              <div key={idx} className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <span className="font-semibold text-slate-200 text-sm">{row.criteria}</span>
                  <div className="flex gap-2 text-xs font-mono">
                    <span className="text-orange-400 font-bold">{row.user}</span>
                    <span className="text-slate-600">vs</span>
                    <span className="text-slate-300">{row.opponent}</span>
                    <span className="text-slate-500">/{row.maxScore}</span>
                  </div>
                </div>
                
                <div className="space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>{language === 'vi' ? 'BĂĄĹÄn' : 'You'}</span>
                      <span className="font-bold">{row.user}/{row.maxScore}</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/50">
                      <div 
                        className="bg-gradient-to-r from-orange-600 to-orange-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${userPercent}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>AI Opponent</span>
                      <span className="font-bold">{row.opponent}/{row.maxScore}</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/50">
                      <div 
                        className="bg-gradient-to-r from-slate-700 to-slate-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${opponentPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {parsed.analysis && (
        <div className="bg-slate-950/20 border border-slate-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3 border-b border-slate-800/80 pb-2">
            <Activity className="w-4 h-4 text-orange-400" />
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">
              {language === 'vi' ? 'PhÄËn tÄÂ­ch diĂĄĹĽÂn biĂĄĹĹźn' : 'Debate Analysis'}
            </h3>
          </div>
          <MarkdownRenderer content={parsed.analysis} className="text-sm prose-slate" />
        </div>
      )}

      {parsed.feedback && (
        <div className="bg-slate-950/20 border border-slate-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3 border-b border-slate-800/80 pb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">
              {language === 'vi' ? 'NhĂĄĹÂ­n xÄĹ t & LĂĄĹĽÂi khuyÄĹn' : 'Constructive Feedback'}
            </h3>
          </div>
          <MarkdownRenderer content={parsed.feedback} className="text-sm prose-slate" />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onNewBattle}
          className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:scale-[1.01]"
        >
          {language === 'vi' ? 'TrĂĄĹÂ­n ĂÂĂĄĹÄ˝u mĂĄĹĽÂi' : 'New Battle'}
        </button>
      </div>
    </div>
  );
}

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

    // Determine stars
    if (!isCustomEngine && selectedBot) {
      const isWin = result.toLowerCase().includes('user') && result.toLowerCase().includes('winner');
      if (isWin) {
        let stars = 3;
        if (hintsUsed >= 1 && hintsUsed <= 3) stars = 2;
        if (hintsUsed > 3) stars = 1;
        setBotStars(selectedBot.id, stars);
      }
    }
  };

  // SETUP PHASE
  if (phase === 'setup') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <CoachCrab size={40} animate={false} />
            <h1 className="text-2xl font-bold text-white">{t('battle.title', language)}</h1>
          </div>

          {/* Bot Selection */}
          <div className="mb-8">
            <h2 className="text-sm font-medium text-slate-400 mb-4">{t('battle.select_bot', language)}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {bots.map(bot => {
                const stars = currentUser?.botStars[bot.id] || 0;
                return (
                  <button
                    key={bot.id}
                    onClick={() => { setSelectedBot(bot); setIsCustomEngine(false); }}
                    className={`p-4 rounded-2xl border transition-all text-left ${
                      selectedBot?.id === bot.id && !isCustomEngine
                        ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/20'
                        : 'border-white/[0.08] bg-slate-900/40 hover:border-white/[0.15] hover:bg-white/5'
                    }`}
                  >
                    <div className="flex justify-center mb-3">{getBotAvatar(bot.avatar, 48)}</div>
                    <p className="text-sm font-medium text-white text-center">{bot.name}</p>
                    <p className="text-xs text-slate-400 text-center mt-1">
                      {t('battle.strength', language)}: {bot.displayStrength}
                    </p>
                    {stars > 0 && (
                      <div className="flex justify-center gap-0.5 mt-2">
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
                className={`p-4 rounded-2xl border transition-all ${
                  isCustomEngine
                    ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/20'
                    : 'border-white/[0.08] bg-slate-900/40 hover:border-white/[0.15] hover:bg-white/5'
                }`}
              >
                <div className="flex justify-center mb-3">{getBotAvatar('engine', 48)}</div>
                <p className="text-sm font-medium text-white text-center">{t('battle.custom_engine', language)}</p>
                {isCustomEngine && (
                  <div className="mt-3">
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 p-5 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/20">
              <div className="flex items-center gap-4 mb-3">
                {getBotAvatar(selectedBot.avatar, 40)}
                <div>
                  <p className="font-medium text-white">{selectedBot.name}</p>
                  <p className="text-xs text-slate-400">{t('battle.strength', language)}: {selectedBot.displayStrength}</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{language === 'vi' ? selectedBot.bio_vi : selectedBot.bio_en}</p>
            </motion.div>
          )}

          {/* Motion Settings */}
          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-3">{t('battle.difficulty', language)}</label>
              <div className="flex gap-2 p-1 bg-slate-900/40 border border-white/[0.08] rounded-xl">
                {(['easy', 'intermediate', 'hard'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      difficulty === d ? 'bg-white/10 text-white shadow-lg shadow-black/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {t(`battle.${d}`, language)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-3">{t('battle.category', language)}</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/50 border border-white/[0.06] text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'random' ? t('battle.random', language) : (t(`topics.${c}`, language) || c)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Motion Display */}
          {motion_ && (
            <div className="mb-8 p-5 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-400">{t('battle.motion', language)}</label>
                <button onClick={randomizeMotion} className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300">
                  <Shuffle size={14} /> {t('battle.randomize', language)}
                </button>
              </div>
              <p className="text-white font-medium text-lg">{debateLang === 'vi' ? motion_.motion_vi : motion_.motion_en}</p>
            </div>
          )}

          {/* Battle Settings */}
          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-3">{t('battle.side', language)}</label>
              <div className="flex gap-2 p-1 bg-slate-900/40 border border-white/[0.08] rounded-xl">
                <button
                  onClick={() => setSide('for')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    side === 'for' ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-black/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {t('battle.for', language)}
                </button>
                <button
                  onClick={() => setSide('against')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    side === 'against' ? 'bg-red-500/20 text-red-400 shadow-lg shadow-black/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {t('battle.against', language)}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-3">{t('battle.speaker', language)}</label>
              <div className="flex gap-2 p-1 bg-slate-900/40 border border-white/[0.08] rounded-xl">
                {(['1st', '2nd'] as const).map(o => (
                  <button
                    key={o}
                    onClick={() => setSpeakerOrder(o)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      speakerOrder === o ? 'bg-white/10 text-white shadow-lg shadow-black/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-3">
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
              <label className="block text-sm font-medium text-slate-400 mb-3">
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
              <label className="block text-sm font-medium text-slate-400 mb-3">{t('battle.language', language)}</label>
              <div className="flex gap-2 p-1 bg-slate-900/40 border border-white/[0.08] rounded-xl">
                {(['en', 'vi'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setDebateLang(l)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      debateLang === l ? 'bg-white/10 text-white shadow-lg shadow-black/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {l === 'en' ? 'English' : 'Ti\u1ebfng Vi\u1ec7t'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!aiConfigured && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm">
              {language === 'vi' ? 'AI ch b   11 c quy bt cho admin. Li ean h ec admin  11 ec  11 bi c e0u h ecnh.' : 'AI access is controlled by admin. Please ask an admin to configure AI for the system.'}
            </div>
          )}

          <button
            onClick={startDebate}
            disabled={!motion_ || (!selectedBot && !isCustomEngine) || !aiConfigured}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl transition-all hover:scale-[1.01] shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow"
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
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-4.5rem)] overflow-hidden">
      {/* Premium HUD Banner */}
      <div className="relative overflow-hidden mb-5 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-orange-500 to-amber-500 h-full" />
        
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={() => setPhase('setup')} 
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all shrink-0"
            title={language === 'vi' ? 'Quay láşĄi thiáşżt láş­p' : 'Back to setup'}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded-full">
                {motion_?.category ? (t(`topics.${motion_.category}`, language) || motion_.category) : 'Debate'}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {t(`battle.${difficulty}`, language)}
              </span>
            </div>
            <h2 className="text-sm md:text-base text-slate-800 dark:text-white font-semibold truncate max-w-md md:max-w-2xl" title={motionText}>
              {motionText}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm shrink-0 font-medium">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
            side === 'for' 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
              : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
          }`}>
            {t(`battle.${side === 'for' ? 'for' : 'against'}`, language)}
          </span>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <span className="text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800/60 px-2 py-1 rounded-md">
            {language === 'vi' ? `LĆ°áťŁt ${round}` : `Round ${round}`}
          </span>
          {phase === 'debate' && (
            <>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
              <span className={`flex items-center gap-1.5 font-mono font-bold px-2 py-1 rounded-md ${
                timeRemaining <= 30 
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse' 
                  : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
              }`}>
                <Clock size={15} /> {formatTime(timeRemaining)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Workspace layout with no outer scrollbars */}
      <div className="flex-1 flex gap-5 min-h-0 overflow-hidden">
        {/* Notes sidebar */}
        <div className="hidden md:flex flex-col w-64 shrink-0 min-h-0">
          <div className="flex-1 bg-white/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col min-h-0 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t('battle.notes', language)}</h3>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">{notes.length} chars</span>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 resize-none focus:outline-none scrollbar-thin"
              placeholder={language === 'vi' ? 'Ghi chĂş luáş­n Äiáťm tranh biáťn cáť§a báşĄn táşĄi ÄĂ˘y...' : 'Jot down your debate points or arguments here...'}
            />
          </div>
        </div>

        {/* Main Arena */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Chat Arena or Scorecard Container - standardized scrollable area */}
          <div className="flex-1 bg-white/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 overflow-y-auto mb-4 min-h-0 shadow-sm scrollbar-thin">
            {phase === 'finished' && judgment ? (
              <JudgmentScorecard 
                judgmentText={judgment} 
                language={debateLang} 
                onNewBattle={() => setPhase('setup')} 
              />
            ) : phase === 'judging' ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="p-5 bg-orange-500/10 rounded-full border border-orange-500/20 text-orange-500 dark:text-orange-400 animate-bounce">
                  <CoachCrab size={60} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    {language === 'vi' ? 'Äang cháşĽm Äiáťm tráş­n ÄáşĽu...' : 'Judging the debate...'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                    {language === 'vi' ? 'Tráťng tĂ i Crab Äang xem xĂŠt káťš lĆ°áťĄng cĂĄc luáş­n Äiáťm cáť§a cáşŁ hai bĂŞn.' : 'Judge Crab is carefully reviewing and scoring arguments from both sides.'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 space-y-3">
                    <div className="p-4 bg-orange-500/10 rounded-2xl">
                      <CoachCrab size={54} animate={false} />
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {language === 'vi' ? 'Tráş­n ÄáşĽu báşŻt Äáş§u! HĂŁy trĂŹnh bĂ y bĂ i phĂĄt biáťu cáť§a báşĄn.' : 'Debate started! Present your opening speech.'}
                    </p>
                  </div>
                )}

                <div className="space-y-5">
                  <AnimatePresence initial={false}>
                    {messages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}
                      >
                        {msg.role === 'system' ? (
                          <div className="max-w-xl px-4 py-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 dark:border-orange-500/10 shadow-sm text-center">
                            <MarkdownRenderer content={msg.content} className="text-sm text-orange-600 dark:text-orange-300" />
                          </div>
                        ) : (
                          <div className={`max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                            <div className={`flex items-center gap-2 mb-1.5 text-xs text-slate-500 dark:text-slate-400 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                              {msg.role === 'assistant' && (
                                <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                  {getBotAvatar(isCustomEngine ? 'engine' : (selectedBot?.avatar || 'engine'), 20)}
                                </div>
                              )}
                              <span className="font-semibold">{msg.role === 'user' ? (currentUser?.username || 'You') : botName}</span>
                              <span className="text-[10px] text-slate-400">
                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <div className={`px-5 py-3.5 rounded-2xl shadow-sm border ${
                              msg.role === 'user'
                                ? 'bg-orange-500 dark:bg-orange-500/10 border-orange-500 text-white dark:text-orange-100'
                                : 'bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
                            }`}>
                              <MarkdownRenderer 
                                content={msg.content} 
                                className={`text-sm ${msg.role === 'user' ? 'prose-p:text-white dark:prose-p:text-slate-100 prose-headings:text-white prose-strong:text-white prose-ol:text-white prose-ul:text-white' : ''}`} 
                              />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {isLoading && (
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm">
                      <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-slate-200 dark:border-slate-700 animate-pulse">
                        {getBotAvatar(isCustomEngine ? 'engine' : (selectedBot?.avatar || 'engine'), 20)}
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/40 px-3 py-2 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                        <span className="text-xs mr-1">{language === 'vi' ? 'AI Äang láş­p luáş­n' : 'AI is thinking'}</span>
                        {[0, 1, 2].map(i => (
                          <motion.div 
                            key={i} 
                            className="w-1.5 h-1.5 bg-orange-500 dark:bg-orange-400 rounded-full" 
                            animate={{ y: [0, -4, 0] }} 
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </>
            )}
          </div>

          {/* Controls - Sticky at bottom */}
          {phase === 'debate' && (
            <div className="space-y-2 shrink-0">
              {currentTurn === 'user' && !timerRunning && !isLoading && (
                <button
                  onClick={() => { setTimerRunning(true); }}
                  className="w-full py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-xl transition-all border border-orange-500/20 flex items-center justify-center gap-2"
                >
                  <Play size={13} fill="currentColor" /> {t('battle.start_timer', language)}
                </button>
              )}

              <div className="flex gap-2">
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={currentTurn === 'user'
                    ? (language === 'vi' ? 'Nháş­p phĂĄt biáťu cáť§a báşĄn táşĄi ÄĂ˘y...' : 'Type your speech here...')
                    : (language === 'vi' ? 'Äang cháť bĂ i nĂłi cáť§a Äáťi tháť§ AI...' : 'Waiting for AI opponent to speak...')}
                  disabled={currentTurn !== 'user' || isLoading}
                  className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none disabled:opacity-50"
                  rows={3}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) submitSpeech(); }}
                />
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={submitSpeech}
                    disabled={!inputText.trim() || currentTurn !== 'user' || isLoading}
                    className="flex-1 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all disabled:opacity-50 shadow-sm hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center"
                    title={t('battle.submit', language)}
                  >
                    <Send size={16} />
                  </button>
                  <button
                    onClick={requestHint}
                    disabled={isLoading}
                    className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-yellow-600 dark:text-yellow-400 border border-slate-200 dark:border-slate-800 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center"
                    title={t('battle.hint', language)}
                  >
                    <Lightbulb size={16} />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center px-1">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {language === 'vi' 
                    ? `ÄĂŁ dĂšng ${hintsUsed} gáťŁi Ă˝ | NháşĽn Ctrl+Enter Äáť gáť­i` 
                    : `Hints used: ${hintsUsed} | Ctrl+Enter to send`}
                </p>
                <button
                  onClick={endDebate}
                  className="px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-650 dark:text-red-400 text-xs font-semibold rounded-lg border border-red-500/20 transition-all"
                >
                  {t('battle.end_debate', language)}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
