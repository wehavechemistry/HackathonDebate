import { useStore } from './store';
import type { BotPersonality } from './types';
import { renderPrompt } from './prompts';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const REFUSAL_PATTERNS = [
  /i('m| am) sorry, but i cannot assist/i,
  /i cannot assist with/i,
  /i('m| am) not able to/i,
  /as an ai, i cannot/i,
  /i('m| am) unable to/i,
];

function parseApiErrorStatus(result: string): number | null {
  const match = result.match(/\[API Error:\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function isRetryableError(result: string): boolean {
  if (!result) return false;
  const status = parseApiErrorStatus(result);
  if (status !== null) {
    return RETRYABLE_STATUS.has(status);
  }
  const lower = result.toLowerCase();
  return REFUSAL_PATTERNS.some(p => p.test(lower));
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function callOpenRouter(messages: ChatMessage[]): Promise<string> {
  const { aiConfigured } = useStore.getState();
  if (!aiConfigured) {
    return '[Error: AI is not configured. Please ask an admin to configure the AI service.]';
  }

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const err = await response.text();
      return `[API Error: ${response.status} - ${err}]`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || data.response || '[No response from AI]';
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return `[Error: ${msg}]`;
  }
}

export async function callOpenRouterWithRetry(messages: ChatMessage[], attempt = 1): Promise<string> {
  const result = await callOpenRouter(messages);
  if (isRetryableError(result) && attempt < 3) {
    await sleep(attempt * 1000);
    return callOpenRouterWithRetry(messages, attempt + 1);
  }
  return result;
}

export function buildDebateSystemPrompt(
  bot: BotPersonality | null,
  customStrength: number,
  language: string,
  motion: string,
  side: 'for' | 'against',
  speakerOrder: '1st' | '2nd',
  isCustomEngine: boolean,
): string {
  const aiSide = side === 'for' ? 'against' : 'for';
  const aiSideLabel = language === 'vi'
    ? (aiSide === 'for' ? 'Ủng hộ (Chính phủ)' : 'Phản đối (Đối lập)')
    : (aiSide === 'for' ? 'Government (For)' : 'Opposition (Against)');

  const langInstruction = language === 'vi'
    ? 'You MUST respond entirely in Vietnamese with proper diacritics (dau). Do NOT use English.'
    : 'You MUST respond entirely in English. Do NOT use Vietnamese.';

  const ctx: Record<string, string | number> = {
    motion,
    lang_instruction: langInstruction,
    user_side_label: side === 'for'
      ? (language === 'vi' ? 'Ủng hộ (Chính phủ)' : 'Government (For)')
      : (language === 'vi' ? 'Phản đối (Đối lập)' : 'Opposition (Against)'),
    opponent_side_label: aiSideLabel,
    ai_side_label: aiSideLabel,
    side,
    speaker_order: speakerOrder,
    display_strength: customStrength,
  };

  if (!isCustomEngine && bot) {
    ctx.personality = bot.hiddenPrompt;
    ctx.name = bot.name;
    const k = bot.knowledge, l = bot.logic, r = bot.rebuttal, v = bot.vocabulary, cr = bot.creativity, co = bot.confidence;
    ctx.knowledge = k;
    ctx.logic = l;
    ctx.rebuttal = r;
    ctx.vocabulary = v;
    ctx.creativity = cr;
    ctx.confidence = co;
    ctx.skill_profile = `Your hidden skill profile (DO NOT reveal these numbers):
- Knowledge: ${k}/10 ${k <= 3 ? '(very limited - miss many facts)' : k <= 6 ? '(average knowledge)' : '(extensive knowledge)'}
- Logic: ${l}/10 ${l <= 3 ? '(weak logic - make logical errors)' : l <= 6 ? '(decent logic)' : '(strong logical chains)'}
- Rebuttal: ${r}/10 ${r <= 3 ? '(fail most rebuttals)' : r <= 6 ? '(address some points)' : '(sharp, precise rebuttals)'}
- Vocabulary: ${v}/10 ${v <= 3 ? '(very simple words only)' : v <= 6 ? '(normal vocabulary)' : '(sophisticated vocabulary)'}
- Creativity: ${cr}/10 ${cr <= 3 ? '(predictable arguments)' : cr <= 6 ? '(some creative angles)' : '(unique, creative perspectives)'}
- Confidence: ${co}/10 ${co <= 3 ? '(hesitant, unsure)' : co <= 6 ? '(moderately confident)' : '(very confident, assertive)'}

CRITICAL: You MUST stay within these skill limits. 
If Knowledge is 2, you genuinely lack knowledge - make factual mistakes.
If Logic is 3, your reasoning should have gaps.
If Rebuttal is 1, you should fail to address opponent's arguments properly.
A strength ${bot.displayStrength} bot should feel like strength ${bot.displayStrength}. NEVER secretly debate better than assigned.`;
  }

  return renderPrompt('battle_bot', ctx);
}

export function buildJudgePrompt(
  language: string,
  motion: string,
  userSideLabel: string,
  aiSideLabel: string,
  userName: string,
  opponentName: string,
): string {
  const ctx: Record<string, string | number> = {
    motion,
    lang_instruction: language === 'vi'
      ? 'You are a professional debate judge. Respond entirely in Vietnamese with proper diacritics.'
      : 'You are a professional debate judge. Respond entirely in English.',
    user_name: userName,
    opponent_name: opponentName,
    user_side_label: userSideLabel,
    ai_side_label: aiSideLabel,
    opponent_side_label: aiSideLabel,
  };
  return renderPrompt('judge', ctx);
}

export function buildHintPrompt(language: string): string {
  const ctx: Record<string, string | number> = {
    lang_instruction: language === 'vi'
      ? 'Ban la tro ly debate. Cho mot goi y SIEU NGAN GON (1-2 cau) ve y tuong luan diem hoac phan bien. Khong giai thich dai. Chi goi y.'
      : 'You are a debate assistant. Give ONE ultra-brief hint (1-2 sentences) about an argument idea or rebuttal angle. Do not explain at length. Just hint.',
  };
  return renderPrompt('hint', ctx);
}

export function buildRebuttalPracticePrompt(language: string): string {
  const ctx: Record<string, string | number> = {
    lang_instruction: language === 'vi'
      ? `Ban la huan luyen vien debate. Danh gia bai phan bien cua nguoi dung. Tra loi NGAN GON bang markdown:
## Danh gia phan bien
- **Diem manh**: ...
- **Diem yeu**: ...
- **Diem tong**: X/10
- **Goi y cai thien**: ...`
      : `You are a debate coach. Evaluate the user's rebuttal. Respond BRIEFLY in markdown:
## Rebuttal Evaluation
- **Strengths**: ...
- **Weaknesses**: ...
- **Score**: X/10
- **Improvement tips**: ...`,
  };
  return renderPrompt('rebuttal', ctx);
}

export function buildSpeechPracticePrompt(language: string): string {
  const ctx: Record<string, string | number> = {
    lang_instruction: language === 'vi'
      ? `Ban la huan luyen vien debate. Danh gia bai phat bieu cua nguoi dung. Tra loi NGAN GON bang markdown:
## Danh gia bai phat bieu
- **Cau truc**: X/10
- **Lap luan**: X/10
- **Bang chung**: X/10
- **Trinh bay**: X/10
- **Tong diem**: X/40
- **Goi y**: ...`
      : `You are a debate coach. Evaluate the user's speech. Respond BRIEFLY in markdown:
## Speech Evaluation
- **Structure**: X/10
- **Argumentation**: X/10
- **Evidence**: X/10
- **Delivery**: X/10
- **Total**: X/40
- **Tips**: ...`,
  };
  return renderPrompt('speech', ctx);
}

export function buildPOIPracticePrompt(language: string): string {
  const ctx: Record<string, string | number> = {
    lang_instruction: language === 'vi'
      ? `Ban la huan luyen vien debate. Danh gia POI cua nguoi dung. Tra loi NGAN GON bang markdown:
## Danh gia POI
- **Sac ben**: X/10
- **Lien quan**: X/10
- **Ap luc**: X/10
- **Tong**: X/30
- **Nhan xet**: ...`
      : `You are a debate coach. Evaluate the user's POI. Respond BRIEFLY in markdown:
## POI Evaluation
- **Sharpness**: X/10
- **Relevance**: X/10
- **Pressure**: X/10
- **Total**: X/30
- **Comment**: ...`,
  };
  return renderPrompt('poi', ctx);
}

export function buildKeywordBattlePrompt(language: string): string {
  const ctx: Record<string, string | number> = {
    lang_instruction: language === 'vi'
      ? `Ban la debate AI. Nguoi dung cho 5 tu khoa. Hay xay dung mot luan diem debate NGAN GON (100-200 tu) tu cac tu khoa do. Sau do DANH GIA luan diem cua nguoi dung:
## Luan diem tu tu khoa
[Luan diem]
## Danh gia
- **Sang tao**: X/10
- **Lien ket**: X/10
- **Thuyet phuc**: X/10`
      : `You are a debate AI. The user gives 5 keywords. Build a BRIEF debate argument (100-200 words) from those keywords. Then EVALUATE:
## Argument from Keywords
[Argument]
## Evaluation
- **Creativity**: X/10
- **Coherence**: X/10
- **Persuasiveness**: X/10`,
  };
  return renderPrompt('keyword', ctx);
}

export function buildPrepPrompt(language: string): string {
  const ctx: Record<string, string | number> = {
    lang_instruction: language === 'vi'
      ? `Ban la tro ly chuan bi debate. Voi de bai va vi tri duoc cho, hay tao ban chuan bi NGAN GON, SU DUNG MARKDOWN:

## Luan diem chinh
- [3 luan diem, moi cai 1-2 cau + tu khoa]

## Phan bien tiem nang cua doi thu
- [3 phan bien co the gap]

## Doi pho phan bien
- [Cach tra loi tung phan bien]

## POI chung ta co the neu
- [3 POI sac ben]

## POI chong lai chung ta + Tra loi
- [3 POI + cau tra loi]

## Ban thao bai mo dau
[200-300 tu, **tu khoa** duoc in dam]`
      : `You are a debate prep assistant. Given the motion and position, create a BRIEF prep sheet using MARKDOWN:

## Key Arguments
- [3 arguments, each 1-2 sentences + keywords]

## Potential Opponent Rebuttals
- [3 likely rebuttals]

## Counters to Rebuttals
- [How to answer each rebuttal]

## POIs We Can Raise
- [3 sharp POIs]

## POIs Against Us + Answers
- [3 POIs + answers]

## Opening Speech Draft
[200-300 words, **keywords** bolded]`,
  };
  return renderPrompt('prep', ctx);
}

export function buildFallacyGenPrompt(language: string): string {
  const ctx: Record<string, string | number> = {
    lang_instruction: language === 'vi'
      ? 'Ban la tro ly debate. Viet mot lap luan NGAN (50-100 tu) ve de bai duoc cho, trong do CO Y chua DUNG MOT loi nguy bien logic (vd: nguoi rom, danh vao ca nhan, doc doan, nhan qua sai, khai quat voi, gia dinh sai...). KHONG noi ten loi nguy bien. Chi viet lap luan.'
      : 'You are a debate assistant. Write a SHORT argument (50-100 words) on the given motion that DELIBERATELY contains ONE logical fallacy (e.g. straw man, ad hominem, slippery slope, false cause, hasty generalization, false dilemma...). Do NOT name the fallacy. Only write the argument.',
  };
  return renderPrompt('fallacy_gen', ctx);
}

export function buildFallacySpottingPrompt(language: string): string {
  const ctx: Record<string, string | number> = {
    lang_instruction: language === 'vi'
      ? `Ban la huan luyen vien debate. Lap luan duoc cho co chua MOT loi nguy bien logic. Danh gia xem nguoi dung co xac dinh dung loi nguy bien va giai thich dung khong. Tra loi NGAN GON bang markdown:
## Danh gia soi loi logic
- **Loi nguy bien thuc te**: ...
- **Nguoi dung xac dinh dung khong**: Co/Khong/Mot phan
- **Nhan xet giai thich**: ...
- **Diem**: X/10`
      : `You are a debate coach. The given argument contains ONE logical fallacy. Evaluate whether the user correctly identified and explained it. Respond BRIEFLY in markdown:
## Fallacy Spotting Evaluation
- **Actual fallacy**: ...
- **Did user identify it correctly**: Yes/No/Partially
- **Explanation feedback**: ...
- **Score**: X/10`,
  };
  return renderPrompt('fallacy_spot', ctx);
}

export function buildWeighingGenPrompt(language: string): string {
  const ctx: Record<string, string | number> = {
    lang_instruction: language === 'vi'
      ? `Ban la tro ly debate. Voi de bai duoc cho, viet HAI lap luan NGAN doi lap nhau (moi cai 30-50 tu): mot lap luan UNG HO va mot lap luan PHAN DOI. Dinh dang:
## Lap luan A (Ung ho)
[lap luan]
## Lap luan B (Phan doi)
[lap luan]`
      : `You are a debate assistant. Given the motion, write TWO SHORT competing arguments (30-50 words each): one FOR and one AGAINST. Format:
## Argument A (For)
[argument]
## Argument B (Against)
[argument]`,
  };
  return renderPrompt('weighing_gen', ctx);
}

export function buildWeighingPracticePrompt(language: string): string {
  const ctx: Record<string, string | number> = {
    lang_instruction: language === 'vi'
      ? `Ban la huan luyen vien debate. Danh gia bai phan tich CAN NHAC SO SANH (weighing) cua nguoi dung giua hai lap luan doi lap. Tra loi NGAN GON bang markdown:
## Danh gia can nhac so sanh
- **Su dung tieu chi can nhac** (pham vi/muc do/xac suat/kha nang dao nguoc): ...
- **Tinh thuyet phuc**: ...
- **Diem manh**: ...
- **Diem yeu**: ...
- **Diem**: X/10`
      : `You are a debate coach. Evaluate the user's WEIGHING analysis comparing two competing arguments. Respond BRIEFLY in markdown:
## Weighing Evaluation
- **Use of weighing criteria** (scope/severity/probability/reversibility): ...
- **Persuasiveness**: ...
- **Strengths**: ...
- **Weaknesses**: ...
- **Score**: X/10`,
  };
  return renderPrompt('weighing_practice', ctx);
}

export function buildCaseBuildingPrompt(language: string): string {
  const ctx: Record<string, string | number> = {
    lang_instruction: language === 'vi'
      ? `Ban la huan luyen vien debate. Danh gia HE THONG LUAN DIEM (case) day du cua nguoi dung cho de bai va vi tri duoc cho. Mot case tot can co: mo hinh, phan chia doi (neu co), 2-3 luan diem manh, phan bien phu dau, can nhac so sanh. Tra loi NGAN GON bang markdown:
## Danh gia he thong luan diem
- **Mo hinh / dinh nghia**: X/10
- **Chat luong luan diem**: X/10
- **Phan bien phu dau**: X/10
- **Can nhac so sanh**: X/10
- **Tong diem**: X/40
- **Goi y cai thien**: ...`
      : `You are a debate coach. Evaluate the user's FULL CASE for the given motion and position. A strong case should include: a model/definition, team split (if applicable), 2-3 strong developed arguments, preemptive rebuttal, and weighing. Respond BRIEFLY in markdown:
## Case Building Evaluation
- **Model / definition**: X/10
- **Argument quality**: X/10
- **Preemptive rebuttal**: X/10
- **Weighing**: X/10
- **Total**: X/40
- **Improvement tips**: ...`,
  };
  return renderPrompt('case_building', ctx);
}

export function buildFramingPracticePrompt(language: string): string {
  const ctx: Record<string, string | number> = {
    lang_instruction: language === 'vi'
      ? `Ban la huan luyen vien debate. Danh gia doan KHUNG LAP LUAN (framing) cua nguoi dung cho de bai duoc cho. Mot khung tot kiem soat cach giam khao nhin nhan tranh luan (vd: quyen, vi loi, nguyen tac, thuc dung). Tra loi NGAN GON bang markdown:
## Danh gia khung lap luan
- **Loai khung su dung**: ...
- **Tinh ro rang**: X/10
- **Tinh thuyet phuc**: X/10
- **Goi y cai thien**: ...
- **Diem**: X/10`
      : `You are a debate coach. Evaluate the user's FRAMING paragraph for the given motion. A good frame controls how the judge interprets the debate (e.g. rights-based, utilitarian, principled, pragmatic). Respond BRIEFLY in markdown:
## Framing Evaluation
- **Frame type used**: ...
- **Clarity**: X/10
- **Persuasiveness**: X/10
- **Improvement tips**: ...
- **Score**: X/10`,
  };
  return renderPrompt('framing', ctx);
}
