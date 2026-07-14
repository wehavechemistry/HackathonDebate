import { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Play, Send, Lightbulb, Star, Clock, ChevronLeft, Trophy, Activity, CheckCircle2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import { callOpenRouterWithRetry, buildDebateSystemPrompt, buildJudgePrompt, buildHintPrompt } from '../api';
import { getBotAvatar, BotAvatar } from '../components/BotAvatars';
import MarkdownRenderer from '../components/MarkdownRenderer';
import CoachCrab from '../components/CoachCrab';
import type { BotPersonality, DebateMotion, ChatMessage } from '../types';
import { battleDifficultyLevels, battleSides, battleSpeakerOrders } from '../data/content';

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
  const winnerMatch = text.match(/(?:Winner|Chiến thắng|Người thắng|Winner is|Winner:)\s*:\s*\**([^*#\r\n\t|]+)\**/i);
  if (winnerMatch) {
    result.winner = winnerMatch[1].trim();
  } else {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('winner:') || line.toLowerCase().includes('chiến thắng:')) {
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
        
        const isHeader = criteria.toLowerCase().includes('criteria') || criteria.toLowerCase().includes('tiêu chí') || criteria.toLowerCase().includes('hạng mục');
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
  const analysisMatch = text.match(/(?:###?\s*(?:Analysis|Phân tích|Đánh giá|Nhận xét|Nội dung phân tích|Turning Points)\s*[\r\n]+)([\s\S]*?)(?=###?|$)/i);
  if (analysisMatch) {
    result.analysis = analysisMatch[1].trim();
  }

  const feedbackMatch = text.match(/(?:###?\s*(?:Feedback for User|Phản hồi|Góp ý|Feedback|Constructive Feedback|Lời khuyên|Góp ý cho người dùng)\s*[\r\n]+)([\s\S]*?)(?=###?|$)/i);
  if (feedbackMatch) {
    result.feedback = feedbackMatch[1].trim();
  }

  if (!result.analysis && text.includes('###')) {
    const parts = text.split(/###?\s+/);
    for (const part of parts) {
      const pLower = part.toLowerCase();
      if (pLower.startsWith('analysis') || pLower.startsWith('phân tích')) {
        result.analysis = part.substring(part.indexOf('\n')).trim();
      } else if (pLower.startsWith('feedback') || pLower.startsWith('góp ý') || pLower.startsWith('phản hồi')) {
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
  earnedStars: number | null;
  isCustomEngine: boolean;
  userWon: boolean;
}

function JudgmentScorecard({ judgmentText, language, onNewBattle, earnedStars, isCustomEngine, userWon }: JudgmentScorecardProps) {
  const parsed = parseJudgment(judgmentText);

  if (parsed.scores.length === 0) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <MarkdownRenderer content={judgmentText} />
        </div>
        {userWon && !isCustomEngine && earnedStars !== null && (
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map(star => (
              <Star key={star} size={28} className={star <= earnedStars ? 'text-orange-400 fill-orange-400' : 'text-slate-600'} />
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <button
            onClick={onNewBattle}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/20"
          >
            {language === 'vi' ? 'Trận đấu mới' : 'New Battle'}
          </button>
        </div>
      </div>
    );
  }

  const totalRow = parsed.scores.find(s => s.criteria.toLowerCase().includes('total') || s.criteria.toLowerCase().includes('tổng'));
  const criteriaRows = parsed.scores.filter(s => !(s.criteria.toLowerCase().includes('total') || s.criteria.toLowerCase().includes('tổng')));

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
                {language === 'vi' ? 'Kết quả chung cuộc' : 'Final Result'}
              </p>
              <h2 className="text-xl font-black text-white mt-0.5">
                {language === 'vi' ? 'Người thắng: ' : 'Winner: '}
                <span className={userWon ? 'text-emerald-400' : 'text-orange-400'}>
                  {parsed.winner || (userWon ? 'User' : 'AI Opponent')}
                </span>
              </h2>
            </div>
          </div>
          
          {totalRow && (
            <div className="flex items-center gap-4 bg-slate-950/80 px-5 py-3 rounded-xl border border-slate-800/80">
              <div className="text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">{language === 'vi' ? 'Bạn' : 'You'}</span>
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
        {userWon && !isCustomEngine && earnedStars !== null && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3].map(star => (
              <Star key={star} size={24} className={star <= earnedStars ? 'text-orange-400 fill-orange-400' : 'text-slate-600'} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          {language === 'vi' ? 'Chi tiết điểm số' : 'Detailed Score breakdown'}
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
                      <span>{language === 'vi' ? 'Bạn' : 'You'}</span>
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
              {language === 'vi' ? 'Phân tích diễn biến' : 'Debate Analysis'}
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
              {language === 'vi' ? 'Nhận xét & Lời khuyên' : 'Constructive Feedback'}
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
          {language === 'vi' ? 'Trận đấu mới' : 'New Battle'}
        </button>
      </div>
    </div>
  );
}

export default function Battle() {
  const { language, bots, motions, currentUser, aiConfigured, setBotStars, addActivity, incrementTrainingStat } = useStore();

  if (!currentUser) return <Navigate to="/login" />;

  const [phase, setPhase] = useState<'setup' | 'prep' | 'debate' | 'judging' | 'finished'>('setup');
  const [selectedBot, setSelectedBot] = useState<BotPersonality | null>(null);
  const [isCustomEngine, setIsCustomEngine] = useState(false);
  const [setupStep, setSetupStep] = useState<'select' | 'config'>('select');
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
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [judgment, setJudgment] = useState('');
  const [currentTurn, setCurrentTurn] = useState<'user' | 'ai'>('user');
  const [useCustomMotion, setUseCustomMotion] = useState(false);
  const [customMotion, setCustomMotion] = useState('');
  const [enableTimer, setEnableTimer] = useState(false);
  const [notesMd, setNotesMd] = useState(false);
  const [earnedStars, setEarnedStars] = useState<number | null>(null);
  const [rounds, setRounds] = useState(3);
  const [endlessMode, setEndlessMode] = useState(false);
  const [userSpeeches, setUserSpeeches] = useState(0);
  const [aiSpeeches, setAiSpeeches] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceStyle, setVoiceStyle] = useState('default');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);
  const interimRef = useRef('');

  const categories = ['random', ...Array.from(new Set(motions.map(m => m.category))).sort()];

  // Convert a category slug (e.g. "artificial_intelligence") into a readable
  // label ("Artificial Intelligence") when there is no i18n translation for it.
  const formatCategoryLabel = (slug: string) =>
    slug
      .split('_')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const categoryLabel = (slug: string) => {
    const translated = t(`topics.${slug}`, language);
    return translated !== `topics.${slug}` ? translated : formatCategoryLabel(slug);
  };

  const randomizeMotion = useCallback(() => {
    let filtered = motions.filter(m => m.difficulty === difficulty);
    if (category !== 'random') filtered = filtered.filter(m => m.category === category);
    if (filtered.length === 0) filtered = motions.filter(m => m.difficulty === difficulty);
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    setMotion(pick);
  }, [difficulty, category, motions]);

  useEffect(() => {
    if (!useCustomMotion) {
      randomizeMotion();
    }
  }, [difficulty, category, useCustomMotion, randomizeMotion]);

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
  }, [timerRunning, timeRemaining, enableTimer]);

  useEffect(() => {
    if (!enableTimer || !timerRunning || timeRemaining > 0) return;
    if (currentTurn !== 'user' || isLoading) return;
    const timeout = setTimeout(() => {
      const text = inputText.trim();
      if (text) {
        submitSpeechRef.current();
      } else {
        setTimerRunning(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [timeRemaining, timerRunning, enableTimer, currentTurn, isLoading, inputText]);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const localeMap: Record<string, string> = { en: 'en-US', vi: 'vi-VN' };

  const toggleListening = () => {
    if (currentTurn !== 'user' || isLoading) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(debateLang === 'vi' ? 'Trình duyệt không hỗ trợ nhận dạng giọng nói.' : 'Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (enableTimer && !timerRunning && timeRemaining > 0) {
        setTimerRunning(true);
      }
      const recognition = new SpeechRecognition();
      recognition.lang = localeMap[debateLang] || 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      let finalText = '';
      interimRef.current = '';
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) {
            finalText += (finalText ? ' ' : '') + r[0].transcript;
            interimRef.current = '';
            setInterimTranscript('');
          } else {
            interimRef.current = r[0].transcript;
            setInterimTranscript(r[0].transcript);
          }
        }
      };
      recognition.onend = () => {
        setIsListening(false);
        const text = (finalText || interimRef.current).trim();
        if (text && currentTurn === 'user' && !isLoading) {
          setInputText(text);
          submitSpeech(text);
        }
        interimRef.current = '';
        setInterimTranscript('');
        finalText = '';
      };
      recognition.onerror = (e: any) => {
        setIsListening(false);
        interimRef.current = '';
        setInterimTranscript('');
        if (e?.error) {
          const msg = debateLang === 'vi'
            ? `Lỗi ghi âm: ${e.error}`
            : `Recording error: ${e.error}`;
          alert(msg);
        }
      };
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    }
  };

  const startDebate = async () => {
    let activeMotion = motion_;
    if (useCustomMotion && customMotion) {
      activeMotion = {
        id: 'custom_' + Date.now(),
        motion_en: customMotion,
        motion_vi: customMotion,
        difficulty: difficulty,
        category: 'custom'
      } as DebateMotion;
      setMotion(activeMotion);
    }
    if (!activeMotion) return;
    setPhase('debate');
    setRound(1);
    setMessages([]);
    setNotes('');
    setNotesMd(false);
    setHintsUsed(0);
    setUserSpeeches(0);
    setAiSpeeches(0);
    setEarnedStars(null);
    setJudgment('');
    setTimeRemaining(speechTime * 60);
    setTimerRunning(false);

    if (speakerOrder === '2nd') {
      setCurrentTurn('ai');
      setIsLoading(true);
      const sysPrompt = buildDebateSystemPrompt(
        isCustomEngine ? null : selectedBot,
        customStrength,
        debateLang,
        debateLang === 'vi' ? activeMotion.motion_vi : activeMotion.motion_en,
        side,
        speakerOrder,
        isCustomEngine,
      );
      const result = await callOpenRouterWithRetry([
        { role: 'system', content: sysPrompt },
        { role: 'user', content: debateLang === 'vi'
          ? `B\u1eaft \u0111\u1ea7u tranh bi\u1ec7n. B\u1ea1n l\u00e0 di\u1ec5n gi\u1ea3 \u0111\u1ea7u ti\u00ean. H\u00e3y tr\u00ecnh b\u00e0y b\u00e0i m\u1edf \u0111\u1ea7u c\u1ee7a b\u1ea1n.`
          : 'The debate begins. You are the first speaker. Present your opening speech.' },
      ]);
      setMessages([{ role: 'assistant', content: result, timestamp: new Date().toISOString() }]);
      setIsLoading(false);
      setAiSpeeches(1);
      if (voiceEnabled && !isCustomEngine && selectedBot?.voice_style) {
        speakText(result, selectedBot.voice_style);
      }
      setCurrentTurn('user');
      setTimeRemaining(speechTime * 60);
    } else {
      setCurrentTurn('user');
      setTimeRemaining(speechTime * 60);
    }
  };

  const speakText = (text: string, style: string) => {
    if (typeof (window as any).responsiveVoice !== 'undefined') {
      let voiceName = 'UK English Male';
      if (style === 'woman') voiceName = 'UK English Female';
      else if (style === 'boy') voiceName = 'UK English Male';
      else if (style === 'girl') voiceName = 'UK English Female';
      else if (style === 'man') voiceName = 'US English Male';
      (window as any).responsiveVoice.speak(text, voiceName, { rate: 1 });
    }
  };

  const speakTextDefault = (text: string) => {
    if (typeof (window as any).responsiveVoice !== 'undefined') {
      (window as any).responsiveVoice.speak(text, 'UK English Male', { rate: 1 });
    }
  };

  const submitSpeech = async (directContent?: string) => {
    const content = (directContent ?? inputText).trim();
    if (!content || !motion_) return;
    const userMsg: ChatMessage = { role: 'user', content, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    const newUserSpeeches = userSpeeches + 1;
    setUserSpeeches(newUserSpeeches);
    setMessages(newMessages);
    setInputText('');
    setTimerRunning(false);
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

    const chatHistory = newMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const result = await callOpenRouterWithRetry([
      { role: 'system', content: sysPrompt },
      ...chatHistory,
    ]);

    const aiMsg: ChatMessage = { role: 'assistant', content: result, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, aiMsg]);
    const newAiSpeeches = aiSpeeches + 1;
    setAiSpeeches(newAiSpeeches);
    setIsLoading(false);
    
    if (voiceEnabled && !isCustomEngine && selectedBot?.voice_style) {
      speakText(result, selectedBot.voice_style);
    }
    
    setCurrentTurn('user');
    setTimeRemaining(speechTime * 60);
    
    if (!endlessMode) {
      setRound(() => {
        const nextRound = Math.min(newUserSpeeches, rounds);
        return nextRound;
      });
    } else {
      setRound(prev => prev + 1);
    }
  };

  const submitSpeechRef = useRef(submitSpeech);
  submitSpeechRef.current = submitSpeech;

  const requestHint = async () => {
    if (!motion_) return;
    setIsLoading(true);
    const hintPrompt = buildHintPrompt(debateLang);
    const motionText = debateLang === 'vi' ? motion_.motion_vi : motion_.motion_en;
    const lastAiMsg = [...messages].reverse().find(m => m.role === 'assistant');
    const result = await callOpenRouterWithRetry([
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

    const motionText = debateLang === 'vi' ? motion_.motion_vi : motion_.motion_en;
    const aiSide: 'for' | 'against' = side === 'for' ? 'against' : 'for';
    const userSideLabel = t(side === 'for' ? 'battle.for' : 'battle.against', debateLang);
    const aiSideLabel = t(aiSide === 'for' ? 'battle.for' : 'battle.against', debateLang);
    const userName = currentUser?.username || (debateLang === 'vi' ? 'Người dùng' : 'User');
    const opponentName = isCustomEngine ? 'Engine' : (selectedBot?.name || 'AI');

    const judgePrompt = buildJudgePrompt(debateLang, motionText, userSideLabel, aiSideLabel, userName, opponentName);

    const debateLog = messages.filter(m => m.role !== 'system').map(m =>
      m.role === 'user'
        ? `[${userName} (${userSideLabel})]: ${m.content}`
        : `[${opponentName} (${aiSideLabel})]: ${m.content}`
    ).join('\n\n');

    const result = await callOpenRouterWithRetry([
      { role: 'system', content: judgePrompt },
      { role: 'user', content: `--- Debate Transcript ---\n${debateLog}\n\n--- End ---\n\nJudge this debate now.` },
    ]);

    setJudgment(result);
    setIsLoading(false);
    setPhase('finished');

    incrementTrainingStat('debates');
    addActivity({ type: 'battle', title: `${language === 'vi' ? 'Trận đấu với' : 'Battle vs'} ${opponentName}`, detail: motionText.slice(0, 50) });

    // Determine stars
    if (!isCustomEngine && selectedBot) {
      const isWin = result.toLowerCase().includes('user') && result.toLowerCase().includes('winner');
      if (isWin) {
        let stars = 3;
        if (hintsUsed >= 1 && hintsUsed <= 2) stars = 2;
        if (hintsUsed > 2) stars = 1;
        setBotStars(selectedBot.id, stars);
        setEarnedStars(stars);
      } else {
        setEarnedStars(0);
      }
    } else {
      setEarnedStars(0);
    }
  };

  // SETUP PHASE
  if (phase === 'setup') {
    const anySelected = selectedBot || isCustomEngine;

    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <CoachCrab size={36} animate={false} />
          <h1 className="text-xl font-bold text-white">{t('battle.title', language)}</h1>
        </div>

        <AnimatePresence mode="wait">
          {setupStep === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="max-w-4xl mx-auto"
            >
              <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-5 text-center">
                {t('battle.select_bot', language)}
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {bots.map(bot => {
                  const stars = currentUser?.botStars[bot.id] || 0;
                  return (
                    <motion.button
                      key={bot.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setSelectedBot(bot); setIsCustomEngine(false); setTimeout(() => setSetupStep('config'), 150); }}
                      className={`p-4 rounded-xl border text-left transition-all flex flex-col items-center text-center ${
                        selectedBot?.id === bot.id && !isCustomEngine
                          ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/20'
                          : 'border-white/[0.08] bg-slate-900/40 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/5'
                      }`}
                    >
                      <BotAvatar bot={bot} size={56} />
                      <p className="text-sm font-semibold text-white mt-2">{bot.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t('battle.strength', language) || 'Str'}: {bot.displayStrength}</p>
                      {stars > 0 && (
                        <div className="flex gap-0.5 mt-1">
                          {[1, 2, 3].map(s => (
                            <span key={s} className={`text-xs ${s <= stars ? 'text-orange-400' : 'text-slate-600'}`}>★</span>
                          ))}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
                {/* Custom Engine */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setIsCustomEngine(true); setSelectedBot(null); setTimeout(() => setSetupStep('config'), 150); }}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col items-center text-center ${
                    isCustomEngine
                      ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/20'
                      : 'border-white/[0.08] bg-slate-900/40 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/5'
                  }`}
                >
                  <BotAvatar bot={{ avatar: 'engine' }} size={56} />
                  <p className="text-sm font-semibold text-white mt-2">{t('battle.custom_engine', language)}</p>
                  {isCustomEngine && (
                    <p className="text-[11px] text-orange-400">{customStrength}/10</p>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {setupStep === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex flex-col lg:flex-row gap-4"
            >
              {/* Sidebar: Selected Opponent */}
              <motion.div
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className="lg:w-[30%] space-y-3"
              >
                <div className="p-4 rounded-xl bg-slate-900/40 border border-white/[0.08] flex flex-col items-center text-center">
                  {isCustomEngine ? (
                    <>
                      <BotAvatar bot={{ avatar: 'engine' }} size={80} />
                      <p className="text-base font-bold text-white mt-2">{t('battle.custom_engine', language)}</p>
                      <div className="w-full mt-3">
                        <label className="text-[10px] text-slate-500 mb-1 block">{t('battle.strength', language) || 'Strength'}: {customStrength}/10</label>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={customStrength}
                          onChange={e => setCustomStrength(Number(e.target.value))}
                          className="w-full accent-orange-500 h-1"
                        />
                      </div>
                    </>
                  ) : selectedBot ? (
                    <>
                      <BotAvatar bot={selectedBot} size={80} />
                      <p className="text-base font-bold text-white mt-2">{selectedBot.name}</p>
                      <p className="text-xs text-slate-400">{t('battle.strength', language) || 'Str'}: {selectedBot.displayStrength}</p>
                      {(() => {
                        const stars = currentUser?.botStars[selectedBot.id] || 0;
                        return stars > 0 ? (
                          <div className="flex gap-0.5 mt-1">
                            {[1, 2, 3].map(s => (
                              <span key={s} className={`text-sm ${s <= stars ? 'text-orange-400' : 'text-slate-600'}`}>★</span>
                            ))}
                          </div>
                        ) : null;
                      })()}
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-2">
                        {language === 'vi' ? selectedBot.bio_vi : selectedBot.bio_en}
                      </p>
                    </>
                  ) : null}

                  <button
                    onClick={() => setSetupStep('select')}
                    className="mt-4 px-4 py-1.5 text-xs font-medium text-orange-400 hover:text-orange-300 border border-orange-500/30 hover:border-orange-500/50 rounded-lg transition-all"
                  >
                    {language === 'vi' ? 'Chọn đối thủ khác' : 'Change opponent'}
                  </button>
                </div>
              </motion.div>

              {/* Panel: Configure Battle */}
              <motion.div
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}
                className="lg:w-[70%] space-y-2.5"
              >
                <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t('battle.configure', language) || 'Configure Battle'}</h2>

                {/* Motion Source */}
                <div className="p-3 rounded-xl bg-slate-900/30 border border-white/[0.06] space-y-2">
                  <label className="text-xs font-medium text-slate-400">{t('battle.motion_source', language) || 'Motion'}</label>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { setUseCustomMotion(false); setCustomMotion(''); }}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${!useCustomMotion ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {language === 'vi' ? 'Ngẫu nhiên' : 'Random'}
                    </button>
                    <button
                      onClick={() => setUseCustomMotion(true)}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${useCustomMotion ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {language === 'vi' ? 'Tự nhập' : 'Custom'}
                    </button>
                  </div>
                  {useCustomMotion && (
                    <textarea
                      value={customMotion}
                      onChange={e => setCustomMotion(e.target.value)}
                      placeholder={language === 'vi' ? 'Nhập đề bài...' : 'Enter motion text...'}
                      className="w-full px-3 py-2 bg-slate-900/50 border border-white/[0.06] rounded-lg text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                      rows={2}
                    />
                  )}
                  {!useCustomMotion && (
                    <>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-500 mb-1 block">{t('battle.difficulty', language)}</label>
                          <div className="flex gap-1">
                            {battleDifficultyLevels.map(d => (
                              <button key={d} onClick={() => setDifficulty(d)}
                                className={`flex-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${difficulty === d ? 'bg-orange-500 text-white' : 'bg-slate-800/50 text-slate-400'}`}>
                                {d === 'easy' ? (language === 'vi' ? 'Dễ' : 'Easy') : d === 'intermediate' ? (language === 'vi' ? 'TB' : 'Mid') : (language === 'vi' ? 'Khó' : 'Hard')}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-500 mb-1 block">{t('battle.category', language)}</label>
                          <select value={category} onChange={e => setCategory(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg bg-slate-800/50 border border-slate-600 text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500">
                            {categories.map(c => (
                              <option key={c} value={c}>{c === 'random' ? t('battle.random', language) : categoryLabel(c)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {motion_ && (
                        <div className="p-2.5 rounded-lg bg-slate-900/50 border border-white/[0.06]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-500">{t('battle.motion', language)}</span>
                            <button onClick={randomizeMotion} className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-1">
                              <Shuffle size={12} /> {t('battle.randomize', language)}
                            </button>
                          </div>
                          <p className="text-white text-xs font-medium leading-relaxed">{debateLang === 'vi' ? motion_.motion_vi : motion_.motion_en}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Timer */}
                <div className="p-3 rounded-xl bg-slate-900/30 border border-white/[0.06]">
                  <label className="text-xs font-medium text-slate-400 mb-2 block">{t('battle.timer', language) || 'Timer'}</label>
                  <div className="flex gap-1.5">
                    <button onClick={() => setEnableTimer(false)}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${!enableTimer ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                      {language === 'vi' ? 'Tắt' : 'Off'}
                    </button>
                    <button onClick={() => setEnableTimer(true)}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${enableTimer ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                      {language === 'vi' ? 'Bật' : 'On'}
                    </button>
                  </div>
                  {enableTimer && (
                    <div className="mt-2">
                      <label className="text-[10px] text-slate-500 mb-1 block">{t('battle.speech_time', language)}: {speechTime} {t('common.minutes', language)}</label>
                      <input type="range" min={3} max={15} value={speechTime} onChange={e => setSpeechTime(Number(e.target.value))} className="w-full accent-orange-500 h-1" />
                    </div>
                  )}
                </div>

                {/* Prep Time + Rounds Combined */}
                <div className="p-3 rounded-xl bg-slate-900/30 border border-white/[0.06]">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block">{t('battle.prep_time', language)}: {prepTime} {t('common.minutes', language)}</label>
                      <input type="range" min={0} max={5} value={prepTime} onChange={e => setPrepTime(Number(e.target.value))} className="w-full accent-orange-500 h-1" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block">{language === 'vi' ? 'Số vòng' : 'Rounds'}: {rounds >= 10 ? (language === 'vi' ? 'Vô hạn' : 'Endless') : rounds}</label>
                      <input type="range" min={1} max={10} value={rounds} onChange={e => { const v = Number(e.target.value); setRounds(v); setEndlessMode(v >= 10); }} className="w-full accent-orange-500 h-1" />
                    </div>
                  </div>
                </div>

                {/* Speaker Order + Language Combined */}
                <div className="p-3 rounded-xl bg-slate-900/30 border border-white/[0.06]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block">{t('battle.speaker', language)}</label>
                      <div className="flex gap-1">
                        {battleSpeakerOrders.map(o => (
                          <button key={o} onClick={() => setSpeakerOrder(o)}
                            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${speakerOrder === o ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            {o}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block">{t('battle.language', language)}</label>
                      <div className="flex gap-1">
                        {(['en', 'vi'] as const).map(l => (
                          <button key={l} onClick={() => setDebateLang(l)}
                            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${debateLang === l ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            {l === 'en' ? 'EN' : 'VI'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Side (For/Against) */}
                <div className="p-3 rounded-xl bg-slate-900/30 border border-white/[0.06]">
                  <label className="text-[10px] text-slate-500 mb-1.5 block">{t('battle.side', language)}</label>
                  <div className="flex gap-1">
                    {battleSides.map(s => (
                      <button key={s} onClick={() => setSide(s)}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${side === s ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        {t(`battle.${s}`, language)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={startDebate}
                    disabled={(!useCustomMotion && !motion_) || (useCustomMotion && !customMotion) || !anySelected || !aiConfigured}
                    className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
                  >
                    <Play size={16} className="inline mr-2" />
                    {t('battle.start', language)}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // DEBATE / JUDGING / FINISHED PHASE
  const motionText = motion_ ? (debateLang === 'vi' ? motion_.motion_vi : motion_.motion_en) : '';
  const botName = isCustomEngine ? 'Engine' : (selectedBot?.name || 'AI');

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col h-[calc(100vh-4.5rem)] overflow-hidden">
      {/* Premium HUD Banner */}
      <div className="relative overflow-hidden mb-3 p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-orange-500 to-amber-500 h-full" />
        
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={() => setPhase('setup')} 
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all shrink-0"
            title={language === 'vi' ? 'Quay lại thiết lập' : 'Back to setup'}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-widest bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                {motion_?.category ? categoryLabel(motion_.category) : 'Debate'}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                {t(`battle.${difficulty}`, language)}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                {language === 'vi' ? `Vòng ${round}/${rounds}` : `Round ${round}/${rounds}`}
              </span>
            </div>
            <h2 className="text-xs md:text-sm text-slate-800 dark:text-white font-semibold leading-snug truncate" title={motionText}>
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
            {language === 'vi' ? `Lượt ${round}` : `Round ${round}`}
          </span>
          {enableTimer && phase === 'debate' && (
            <>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex flex-col gap-1 min-w-[70px]">
                <span className={`flex items-center justify-between gap-2 font-mono font-bold text-xs px-2 py-1 rounded-md ${
                  timeRemaining <= 30 
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse' 
                    : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                }`}>
                  <Clock size={13} /> {formatTime(timeRemaining)}
                </span>
                {enableTimer && (
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        (speechTime * 60) > 0 ? (timeRemaining / (speechTime * 60)) < 0.3 ? 'bg-red-500' : 'bg-orange-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${((speechTime * 60) > 0 ? (timeRemaining / (speechTime * 60)) * 100 : 0)}%` }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace layout with no outer scrollbars */}
      <div className="flex-1 flex gap-5 min-h-0 overflow-hidden">
        {/* Notes sidebar */}
        <div className="hidden md:flex flex-col w-64 shrink-0 min-h-0">
          <div className="flex-1 bg-white/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col min-h-0 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t('battle.notes', language)}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 dark:text-slate-500">{notes.length} chars</span>
                <button
                  onClick={() => setNotesMd(!notesMd)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  {notesMd ? (language === 'vi' ? 'Sơ' : 'Raw') : (language === 'vi' ? 'MD' : 'MD')}
                </button>
              </div>
            </div>
            {notesMd ? (
              <div className="flex-1 overflow-y-auto scrollbar-thin text-sm text-slate-800 dark:text-slate-200 prose prose-slate dark:prose-invert max-w-none">
                <MarkdownRenderer content={notes || (language === 'vi' ? '*Chưa có ghi chú*' : '*No notes yet*')} />
              </div>
            ) : (
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 resize-none focus:outline-none scrollbar-thin"
                placeholder={language === 'vi' ? 'Ghi chú luận điểm tranh biện của bạn tại đây...' : 'Jot down your debate points or arguments here...'}
              />
            )}
          </div>
        </div>

        {/* Main Arena */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Chat Arena or Scorecard Container - standardized scrollable area */}
          <div className="flex-1 bg-white/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 overflow-y-auto mb-4 min-h-0 shadow-sm scrollbar-thin">
            {phase === 'finished' && judgment ? (
              <div className="space-y-6">
                <JudgmentScorecard 
                  judgmentText={judgment} 
                  language={debateLang} 
                  onNewBattle={() => setPhase('setup')}
                  earnedStars={earnedStars}
                  isCustomEngine={isCustomEngine}
                  userWon={(() => {
                    const parsed = parseJudgment(judgment);
                    const totalRow = parsed.scores.find(s => s.criteria.toLowerCase().includes('total') || s.criteria.toLowerCase().includes('tổng'));
                    const byName = parsed.winner.toLowerCase().includes('user') || parsed.winner.toLowerCase().includes('người dùng');
                    const byScore = !!totalRow && totalRow.user > totalRow.opponent;
                    return byName || byScore;
                  })()}
                />
                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    {language === 'vi' ? 'Transcript trận đấu' : 'Debate Transcript'}
                  </h3>
                  <div className="space-y-4">
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] md:max-w-[75%] px-4 py-2.5 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}>
                          <MarkdownRenderer content={msg.content} className={`text-sm ${msg.role === 'user' ? 'text-white' : ''}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : phase === 'judging' ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="p-5 bg-orange-500/10 rounded-full border border-orange-500/20 text-orange-500 dark:text-orange-400 animate-bounce">
                  <CoachCrab size={60} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    {language === 'vi' ? 'Đang chấm điểm trận đấu...' : 'Judging the debate...'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                    {language === 'vi' ? 'Trọng tài Crab đang xem xét kỹ lưỡng các luận điểm của cả hai bên.' : 'Judge Crab is carefully reviewing and scoring arguments from both sides.'}
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
                      {language === 'vi' ? 'Trận đấu bắt đầu! Hãy trình bày bài phát biểu của bạn.' : 'Debate started! Present your opening speech.'}
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
                        <span className="text-xs mr-1">{language === 'vi' ? 'AI đang lập luận' : 'AI is thinking'}</span>
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
                {enableTimer && currentTurn === 'user' && !timerRunning && !isLoading && (
                  <button
                    onClick={() => { setTimerRunning(true); }}
                    className="w-full py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-xl transition-all border border-orange-500/20 flex items-center justify-center gap-2"
                  >
                    <Play size={13} fill="currentColor" /> {t('battle.start_timer', language)}
                  </button>
                )}

                {!endlessMode && userSpeeches >= rounds && aiSpeeches >= rounds && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium text-center">
                    {language === 'vi' ? 'Đã kết thúc tất cả các vòng. Bạn có thể kết thúc trận đấu.' : 'All rounds completed. You can end the debate.'}
                  </div>
                )}

                <div className="flex gap-2">
                  <textarea
                    value={inputText}
                    onChange={e => {
                      setInputText(e.target.value);
                      if (enableTimer && !timerRunning && timeRemaining > 0 && currentTurn === 'user' && !isLoading) {
                        setTimerRunning(true);
                      }
                    }}
                    placeholder={currentTurn === 'user'
                      ? (language === 'vi' ? 'Nhập phát biểu của bạn tại đây...' : 'Type your speech here...')
                      : (language === 'vi' ? 'Đang chờ bài nói của đối thủ AI...' : 'Waiting for AI opponent to speak...')}
                    disabled={currentTurn !== 'user' || isLoading || (!endlessMode && userSpeeches >= rounds && aiSpeeches >= rounds)}
                    className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none disabled:opacity-50"
                    rows={3}
                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) submitSpeech(); }}
                  />
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => submitSpeech()}
                      disabled={!inputText.trim() || currentTurn !== 'user' || isLoading || (!endlessMode && userSpeeches >= rounds && aiSpeeches >= rounds)}
                      className="flex-1 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all disabled:opacity-50 shadow-sm hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 text-sm font-medium"
                    >
                      <Send size={16} />
                      {t('battle.submit', language)}
                    </button>
                    <button
                      onClick={toggleListening}
                      disabled={currentTurn !== 'user' || isLoading}
                      className={`flex-1 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-sm font-medium ${
                        isListening
                          ? 'bg-red-500 hover:bg-red-600 text-white border border-red-500 animate-pulse'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                      {language === 'vi' ? 'Ghi âm' : 'Record'}
                    </button>
                  </div>
                </div>

              {isListening && (
                <div className="text-xs text-orange-400 italic px-3 py-2 bg-orange-500/5 rounded-lg flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block shrink-0" />
                  {interimTranscript ? (
                    <span><span className="font-semibold not-italic">{language === 'vi' ? 'Đang nghe: ' : 'Listening: '}</span>{interimTranscript}</span>
                  ) : (
                    <span>{language === 'vi' ? 'Đang thu âm...' : 'Recording...'}</span>
                  )}
                </div>
              )}

                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={requestHint}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-yellow-600 dark:text-yellow-400 border border-slate-200 dark:border-slate-800 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <Lightbulb size={14} />
                      {t('battle.hint', language)}
                    </button>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {language === 'vi'
                        ? `Đã dùng ${hintsUsed} gợi ý`
                        : `Hints used: ${hintsUsed}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                        voiceEnabled
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                          : 'bg-slate-100 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                      title={language === 'vi' ? 'Bật/tắt giọng nói' : 'Toggle voice'}
                    >
                      {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                    </button>
                    <button
                      onClick={endDebate}
                      className="px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-650 dark:text-red-400 text-xs font-semibold rounded-lg border border-red-500/20 transition-all"
                    >
                      {t('battle.end_debate', language)}
                    </button>
                  </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
