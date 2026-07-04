export interface LessonStep {
  id: string;
  type: 'text' | 'quiz' | 'essay' | 'end';
  coachText: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  placeholder?: string;
  nextId: string | null;
}

export interface LessonScript {
  id: string;
  title: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  xpReward: number;
  coachId?: string;
  coachName?: string;
  steps: LessonStep[];
}

export const lessons: LessonScript[] = [
  {
    id: 'l1_arguments',
    title: 'Build Your First Argument',
    level: 'beginner',
    description: 'Learn the 3 pillars of a strong debate argument.',
    xpReward: 50,
    coachId: 'crab',
    coachName: 'Coach Crab',
    steps: [
      {
        id: 'l1_s1',
        type: 'text',
        coachText: "Hey there! I'm Coach Crab. Ready to learn how to argue like a pro? Today we're starting with the basics: what makes a strong argument?",
        nextId: 'l1_s2',
      },
      {
        id: 'l1_s2',
        type: 'text',
        coachText: "A strong argument has 3 parts:\n\n1. **Claim** — What you want the judge to believe.\n2. **Warrant** — Why your claim is true.\n3. **Impact** — Why it matters.\n\nThink of it like a sandwich: the claim is the bread, the warrant is the filling, and the impact is the sauce that makes it memorable!",
        nextId: 'l1_s3',
      },
      {
        id: 'l1_s3',
        type: 'quiz',
        coachText: "Quick check! Which of these is NOT part of a strong argument?",
        options: ['Claim', 'Warrant', 'Storytelling', 'Impact'],
        correctIndex: 2,
        explanation: "Storytelling can help make your argument memorable, but it is not one of the three core structural parts. The core is Claim + Warrant + Impact.",
        nextId: 'l1_s4',
      },
      {
        id: 'l1_s4',
        type: 'text',
        coachText: "Exactly! Now try this: 'We should ban single-use plastics because they pollute our oceans and harm marine life.'\n\n- **Claim**: Ban single-use plastics.\n- **Warrant**: They pollute oceans and harm marine life.\n- **Impact**: Protecting marine ecosystems preserves biodiversity and food chains.\n\nSee how each part works together?",
        nextId: 'l1_s5',
      },
      {
        id: 'l1_s5',
        type: 'essay',
        coachText: "Your turn! Give me ONE claim you personally believe in. Just one sentence. Don't worry about being perfect — just say what you think.",
        placeholder: 'Type your claim here...',
        nextId: 'l1_s6',
      },
      {
        id: 'l1_s6',
        type: 'text',
        coachText: "Awesome! Whether you wrote about school uniforms, video games, or pineapple on pizza — you just made a claim. That is debate in a nutshell.\n\nNext time, we will learn how to respond to opponents. See you there!",
        nextId: null,
      },
    ],
  },
  {
    id: 'l2_rebuttals',
    title: 'Fight Back: Rebuttals 101',
    level: 'beginner',
    description: 'Learn how to respond to opponent arguments effectively.',
    xpReward: 60,
    coachId: 'crab',
    coachName: 'Coach Crab',
    steps: [
      {
        id: 'l2_s1',
        type: 'text',
        coachText: "Welcome back! Last time we learned how to build arguments. Today? How to DESTROY opponent arguments. Just kidding... maybe. Let us learn rebuttals!",
        nextId: 'l2_s2',
      },
      {
        id: 'l2_s2',
        type: 'text',
        coachText: "A good rebuttal has a simple structure:\n\n1. **Restate** their argument briefly.\n2. **Attack** the weak point (untrue, irrelevant, or harmful).\n3. **Explain** why your side is better.\n\nDo not ignore what they said. Acknowledge it, then prove why it does not matter.",
        nextId: 'l2_s3',
      },
      {
        id: 'l2_s3',
        type: 'quiz',
        coachText: "Pop quiz! What is the BEST way to start a rebuttal?",
        options: [
          '"They are completely wrong!"',
          '"My opponent claims that... however..."',
          '"I do not agree with anything they said."',
          '"Let me tell you why my side is better."',
        ],
        correctIndex: 1,
        explanation: "Start by briefly restating their argument ('My opponent claims that...'), then hit them with 'however' and your attack. This shows you listened and makes your rebuttal sharper.",
        nextId: 'l2_s4',
      },
      {
        id: 'l2_s4',
        type: 'essay',
        coachText: "Practice time! Opponent says: 'We should not ban cars because they are too convenient.'\n\nWrite ONE sentence that starts a rebuttal to this.",
        placeholder: 'Start your rebuttal here...',
        nextId: 'l2_s5',
      },
      {
        id: 'l2_s5',
        type: 'text',
        coachText: "Great job! Whether you mentioned public transit, electric vehicles, or health costs — you just practiced a real debate skill.\n\nNext: we will talk about note-taking, because you cannot respond if you do not remember what they said!",
        nextId: null,
      },
    ],
  },
  {
    id: 'l3_notes',
    title: 'Listen & Note Like a Pro',
    level: 'beginner',
    description: 'Master the art of note-taking during a live debate.',
    xpReward: 40,
    coachId: 'crab',
    coachName: 'Coach Crab',
    steps: [
      {
        id: 'l3_s1',
        type: 'text',
        coachText: "Hey! Ever tried to listen to someone AND write notes at the same time? It is tricky! But in debate, notes = ammunition.",
        nextId: 'l3_s2',
      },
      {
        id: 'l3_s2',
        type: 'text',
        coachText: "When your opponent speaks, write down:\n\n- ** Their main argument** (1-2 words).\n- ** One piece of evidence** they used.\n- ** One flaw** you spotted.\n\nThat is it. You do not need to write everything. Just the juicy bits.",
        nextId: 'l3_s3',
      },
      {
        id: 'l3_s3',
        type: 'quiz',
        coachText: "What is the ONE thing you should NOT waste time writing down?",
        options: [
          'Their main argument',
          'A key statistic they mentioned',
          'Every single word they say',
          'A flaw in their logic',
        ],
        correctIndex: 2,
        explanation: "Writing every word is impossible and useless. Focus on arguments, evidence, and flaws. Those are your rebuttal weapons.",
        nextId: 'l3_s4',
      },
      {
        id: 'l3_s4',
        type: 'text',
        coachText: "Exactly! Now go practice. Listen actively. Write minimally. Rebuttally... maximally. See you in the next lesson!",
        nextId: null,
      },
    ],
  },
  {
    id: 'l4_simple_arg',
    title: 'Build a Simple Argument (Without Sounding Like a Robot)',
    level: 'beginner',
    description: 'Warm-up lesson: build a barebones argument and practice the basics.',
    xpReward: 40,
    coachId: 'duy',
    coachName: 'Duy',
    steps: [
      {
        id: 'l4_s1',
        type: 'text',
        coachText: "Hey, you made it! I am Duy. Today we are building a simple argument — nothing fancy, just the bare minimum to sound like a human being who actually thought about something.",
        nextId: 'l4_s2',
      },
      {
        id: 'l4_s2',
        type: 'text',
        coachText: "Here is the secret sauce of every decent argument:\n\n1. **Claim** — what you want people to believe.\n2. **Because** — the reason it is true.\n3. **So what?** — why it matters.\n\nThat is it. Claim + Because + So what. If you can say those three things, you are already ahead of 90% of comment-section warriors.",
        nextId: 'l4_s3',
      },
      {
        id: 'l4_s3',
        type: 'quiz',
        coachText: "Quick check! Which one below is actually a complete simple argument?",
        options: [
          "Pineapple belongs on pizza because it is juicy, so it makes every bite tastier.",
          "I like pizza.",
          "Pineapple on pizza is wrong.",
          "Because pizza is good.",
        ],
        correctIndex: 0,
        explanation: "Option A has a claim, a reason, and an impact. The others are just opinions or half a thought. Debate needs the full meal, not just the bread.",
        nextId: 'l4_s4',
      },
      {
        id: 'l4_s4',
        type: 'text',
        coachText: "Boom! That is the vibe. Now let us look at a real example together:\n\n'We should make school start later **because** teens need more sleep to function, **so** delaying school reduces stress and improves grades.'\n\nClaim -> Because -> So what. Clean, simple, effective.",
        nextId: 'l4_s5',
      },
      {
        id: 'l4_s5',
        type: 'essay',
        coachText: "Your turn! Write one simple argument about anything you care about. Keep it chill — just claim + because + so what. Example: 'Cats make great pets because they are low-maintenance, so families save time and money.' Now you try!",
        placeholder: 'Write your simple argument here...',
        nextId: 'l4_s6',
      },
      {
        id: 'l4_s6',
        type: 'text',
        coachText: "And... that is it! You just built a real argument from scratch. Whether you argued for bedtime snacks, longer weekends, or tacos for breakfast — you now have the skeleton of every great debate speech.\n\nPractice this, and soon it will feel totally natural. See you in the next lesson!",
        nextId: null,
      },
    ],
  },
];
