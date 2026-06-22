import { useStore } from './store';
import type { BotPersonality } from './types';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
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
    ? (aiSide === 'for' ? 'Ung ho (Chinh phu)' : 'Phan doi (Doi lap)')
    : (aiSide === 'for' ? 'Government (For)' : 'Opposition (Against)');

  const langInstruction = language === 'vi'
    ? 'You MUST respond entirely in Vietnamese with proper diacritics (dau). Do NOT use English.'
    : 'You MUST respond entirely in English. Do NOT use Vietnamese.';

  if (isCustomEngine || !bot) {
    const s = customStrength;
    const skillDesc = s <= 2
      ? 'You are extremely weak. Make very simple arguments, miss obvious points, use basic vocabulary, fail most rebuttals. Sound like someone who has never debated before.'
      : s <= 4
      ? 'You are a beginner. Make simple arguments with some basic reasoning. Occasionally miss key points. Use simple vocabulary. Rebuttals are weak.'
      : s <= 6
      ? 'You are average. Make decent arguments with reasonable evidence. Good vocabulary. Rebuttals address main points but may miss some nuances.'
      : s <= 8
      ? 'You are advanced. Make strong, well-structured arguments with good evidence. Use sophisticated vocabulary. Rebuttals are sharp and address key weaknesses.'
      : 'You are a master debater. Make devastating arguments with deep analysis, comparative weighing, strong evidence, and expert vocabulary. Your rebuttals are surgical and demolish opponent arguments.';

    return `You are a debate opponent in a practice debate.
${langInstruction}

Motion: "${motion}"
Your side: ${aiSideLabel}
Speaker order: The user is ${speakerOrder} speaker, you are the other.
Skill level: ${s}/10

${skillDesc}

RULES:
- Respond with your debate speech only. No meta-commentary.
- Keep speeches concise (150-400 words).
- Stay on topic. Address the motion directly.
- If user spoke before you, reference and rebut their points.
- Do NOT greet or introduce yourself casually. Debate directly.
- Use markdown formatting for clarity.`;
  }

  const personality = bot.hiddenPrompt;
  const k = bot.knowledge, l = bot.logic, r = bot.rebuttal, v = bot.vocabulary, cr = bot.creativity, co = bot.confidence;

  const skillProfile = `Your hidden skill profile (DO NOT reveal these numbers):
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

  return `You are ${bot.name}, a debate opponent with a specific personality.
${langInstruction}

PERSONALITY: ${personality}

${skillProfile}

Motion: "${motion}"
Your side: ${aiSideLabel}
Speaker order: The user is ${speakerOrder} speaker, you are the other.

RULES:
- Roleplay the personality FIRST, debate skill SECOND.
- Respond with your debate speech only. No meta-commentary about being AI.
- Keep speeches concise (100-400 words depending on skill level - lower skill = shorter).
- Stay on topic. Address the motion directly.
- If user spoke before you, reference their points according to your rebuttal skill.
- Do NOT greet casually. Debate directly while maintaining personality.
- Use markdown formatting for clarity.
- Personality affects HOW you argue. Skill profile affects HOW WELL you argue.`;
}

export function buildJudgePrompt(language: string): string {
  const lang = language === 'vi'
    ? `You are a professional debate judge. Respond entirely in Vietnamese with proper diacritics.`
    : `You are a professional debate judge. Respond entirely in English.`;

  return `${lang}

Evaluate the debate based on these criteria with suggested weights:
- Argumentation (40-50%): Quality, depth, and structure of arguments
- Evidence (20-30%): Use of examples, data, and real-world references
- Rebuttal (20-30%): How well each side addressed opponent's arguments
- Delivery (10-20%): Clarity, coherence, persuasiveness

Provide your judgment in this format:
## Winner: [User/AI Opponent]

### Score Breakdown
| Criteria | User | AI Opponent |
|----------|------|-------------|
| Argumentation | X/10 | X/10 |
| Evidence | X/10 | X/10 |
| Rebuttal | X/10 | X/10 |
| Delivery | X/10 | X/10 |
| **Total** | **X/40** | **X/40** |

### Analysis
[Brief analysis of key moments and turning points]

### Feedback for User
[Constructive feedback - what to improve]`;
}

export function buildHintPrompt(language: string): string {
  return language === 'vi'
    ? 'Ban la tro ly debate. Cho mot goi y SIEU NGAN GON (1-2 cau) ve y tuong luan diem hoac phan bien. Khong giai thich dai. Chi goi y.'
    : 'You are a debate assistant. Give ONE ultra-brief hint (1-2 sentences) about an argument idea or rebuttal angle. Do not explain at length. Just hint.';
}

export function buildRebuttalPracticePrompt(language: string): string {
  return language === 'vi'
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
- **Improvement tips**: ...`;
}

export function buildSpeechPracticePrompt(language: string): string {
  return language === 'vi'
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
- **Tips**: ...`;
}

export function buildPOIPracticePrompt(language: string): string {
  return language === 'vi'
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
- **Comment**: ...`;
}

export function buildKeywordBattlePrompt(language: string): string {
  return language === 'vi'
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
- **Persuasiveness**: X/10`;
}

export function buildPrepPrompt(language: string): string {
  return language === 'vi'
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
[200-300 words, **keywords** bolded]`;
}
