import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import connectSQLite from 'connect-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend development server
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());

// Setup SQLite session store
const SQLiteStore = connectSQLite(session);
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.sqlite',
    dir: __dirname,
  }),
  secret: 'debatecrab-super-secret-key-12345',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: false, // set to true if using https
    sameSite: 'lax'
  }
}));

// Initialize Database
const dbPath = path.resolve(__dirname, 'debatecrab.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to the SQLite database.');
    initializeDatabase();
    migrateDatabase();
  }
});

// Separate connection to the user-provided motions database (motions.db)
// This file has its own schema: motions (id INTEGER PK, motion TEXT, category TEXT)
const motionsDbPath = path.resolve(__dirname, 'motions.db');
const motionsDb = new sqlite3.Database(motionsDbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening motions.db. Make sure the file exists at', motionsDbPath, err);
  } else {
    console.log('Connected to motions.db at', motionsDbPath);
  }
});

// Helper to get all rows from motions.db as a promise
const motionsDbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    motionsDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Difficulty tiers used to spread motions.db rows across easy/intermediate/hard
// so the frontend's difficulty filter (Battle.tsx) has motions in every bucket.
const DIFFICULTY_TIERS = ['easy', 'intermediate', 'hard'];
function deriveDifficulty(id) {
  return DIFFICULTY_TIERS[id % DIFFICULTY_TIERS.length];
}

// Normalize free-form categories from motions.db (e.g. "Artificial Intelligence",
// "Climate Change") into lowercase slug form, consistent with how the rest of the
// app (topics table, i18n topics.* keys) represents categories.
function normalizeCategory(category) {
  if (!category) return 'misc';
  return category
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'misc';
}

// Fetch and map all motions from motions.db into the shape the frontend expects
// (DebateMotion: id, motion_en, motion_vi, difficulty, category).
// motions.db has no Vietnamese translation column, so motion_vi falls back to
// the same English text rather than being left blank.
async function getMotionsFromMotionsDb() {
  const rows = await motionsDbAll('SELECT id, motion, category FROM motions ORDER BY id ASC');
  return rows.map(row => ({
    id: String(row.id),
    motion_en: row.motion,
    motion_vi: row.motion,
    difficulty: deriveDifficulty(row.id),
    category: normalizeCategory(row.category),
  }));
}

// Helper to run query as a promise
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

// Helper to get single row as a promise
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Helper to get all rows as a promise
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function getUserVote(userId, targetType, targetId) {
  const row = await dbGet('SELECT vote FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?', [userId, targetType, targetId]);
  return row ? row.vote : 0;
}

async function getVoteCount(targetType, targetId) {
  const row = await dbGet('SELECT SUM(vote) as score, COUNT(*) as count FROM votes WHERE target_type = ? AND target_id = ?', [targetType, targetId]);
  return { score: row?.score || 0, count: row?.count || 0 };
}

async function migrateDatabase() {
  // Add columns that may not exist in older databases (ALTER TABLE has no IF NOT EXISTS)
  const migrations = [
    `ALTER TABLE users ADD COLUMN trainingScores TEXT NOT NULL DEFAULT '{"rebuttals":0,"speeches":0,"pois":0,"keywordBattles":0,"debates":0,"fallacySpotting":0,"weighing":0,"caseBuilding":0,"framing":0}'`,
    `ALTER TABLE users ADD COLUMN totalXp INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN streak INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN lastTrainingDate TEXT DEFAULT NULL`,
    `ALTER TABLE users ADD COLUMN tier TEXT NOT NULL DEFAULT 'bronze'`,
    `ALTER TABLE users ADD COLUMN unlockedLessonIds TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE topics ADD COLUMN order_num INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE topics ADD COLUMN image_id TEXT DEFAULT NULL`,
    `ALTER TABLE bots ADD COLUMN order_num INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE bots ADD COLUMN avatar_url TEXT DEFAULT NULL`,
    `ALTER TABLE bots ADD COLUMN voice_style TEXT DEFAULT 'default'`,
  ];
  for (const sql of migrations) {
    try {
      await dbRun(sql);
      console.log('Migration OK:', sql.slice(0, 60));
    } catch (e) {
      // column already exists — ignore
    }
  }
}

async function initializeDatabase() {
  // Create tables
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      joinDate TEXT NOT NULL,
      completedLessons TEXT NOT NULL DEFAULT '[]',
      savedTopics TEXT NOT NULL DEFAULT '[]',
      savedNotes TEXT NOT NULL DEFAULT '[]',
      recentActivity TEXT NOT NULL DEFAULT '[]',
      botStars TEXT NOT NULL DEFAULT '{}',
    trainingStats TEXT NOT NULL DEFAULT '{"rebuttals":0,"speeches":0,"pois":0,"keywordBattles":0,"debates":0}',
      trainingScores TEXT NOT NULL DEFAULT '{"rebuttals":0,"speeches":0,"pois":0,"keywordBattles":0,"debates":0,"fallacySpotting":0,"weighing":0,"caseBuilding":0,"framing":0}',
      totalXp INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      lastTrainingDate TEXT DEFAULT NULL,
      tier TEXT NOT NULL DEFAULT 'bronze',
      banned INTEGER NOT NULL DEFAULT 0,
      unlockedLessonIds TEXT NOT NULL DEFAULT '[]'
    )
  `);

await dbRun(`
     CREATE TABLE IF NOT EXISTS lessons (
       id TEXT PRIMARY KEY,
       level TEXT NOT NULL,
       title_en TEXT NOT NULL,
       title_vi TEXT NOT NULL,
       content_en TEXT NOT NULL,
       content_vi TEXT NOT NULL,
       order_num INTEGER NOT NULL,
       pinned INTEGER NOT NULL DEFAULT 0,
       type TEXT NOT NULL DEFAULT 'static',
       description TEXT,
       xpReward INTEGER DEFAULT 50,
       coachId TEXT,
       coachName TEXT,
steps TEXT
      )
    `);

   await dbRun(`
     CREATE TABLE IF NOT EXISTS feedback (
       id TEXT PRIMARY KEY,
       userId TEXT NOT NULL,
       lessonId TEXT,
       content TEXT NOT NULL,
       status TEXT NOT NULL DEFAULT 'pending',
       createdAt TEXT NOT NULL
     )
   `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title_en TEXT NOT NULL,
      title_vi TEXT NOT NULL,
      content_en TEXT NOT NULL,
      content_vi TEXT NOT NULL
    )
  `);

await dbRun(`
     CREATE TABLE IF NOT EXISTS bots (
       id TEXT PRIMARY KEY,
       name TEXT NOT NULL,
       avatar TEXT NOT NULL,
       bio_en TEXT NOT NULL,
       bio_vi TEXT NOT NULL,
       displayStrength REAL NOT NULL,
       hiddenPrompt TEXT NOT NULL,
       knowledge INTEGER NOT NULL,
       logic INTEGER NOT NULL,
       rebuttal INTEGER NOT NULL,
       vocabulary INTEGER NOT NULL,
       creativity INTEGER NOT NULL,
       confidence INTEGER NOT NULL,
       avatar_url TEXT DEFAULT NULL,
       voice_style TEXT DEFAULT 'default'
     )
   `);

  // NOTE: motions are no longer stored in debatecrab.sqlite. They are read
  // directly from the user-provided server/motions.db file (see
  // getMotionsFromMotionsDb / GET /api/content below). The old `motions`
  // table and its default seed data have been removed.

  await dbRun(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title_en TEXT NOT NULL,
      title_vi TEXT NOT NULL,
      content_en TEXT NOT NULL,
      content_vi TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS ai_api_keys (
      id TEXT PRIMARY KEY,
      api_key TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'openrouter/auto',
      priority INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS ai_prompts (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      content_en TEXT NOT NULL,
      content_vi TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title_en TEXT NOT NULL,
      title_vi TEXT NOT NULL,
      content_en TEXT NOT NULL,
      content_vi TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      upvotes INTEGER NOT NULL DEFAULT 0,
      downvotes INTEGER NOT NULL DEFAULT 0,
      category TEXT DEFAULT 'general'
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS replies (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      parent_id TEXT,
      content_en TEXT NOT NULL,
      content_vi TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      upvotes INTEGER NOT NULL DEFAULT 0,
      downvotes INTEGER NOT NULL DEFAULT 0
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      vote INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, target_type, target_id)
    )
  `);

  // Seed default data if empty
  await seedDatabase();
}

async function seedDatabase() {
  // Check if users empty
  const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    console.log('Seeding default admin user...');
    const hashed = await bcrypt.hash('admin123', 10);
    await dbRun(`
      INSERT INTO users (id, email, username, password_hash, role, joinDate, completedLessons, savedTopics, savedNotes, recentActivity, botStars, trainingStats, banned, trainingScores, totalXp, streak, lastTrainingDate, tier, unlockedLessonIds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'admin_1',
      'dodungtri402@gmail.com',
      'DebateCrab Admin',
      'head_admin',
      'head_admin',
      new Date().toISOString(),
      '[]',
      '[]',
      '[]',
      '[]',
      '{}',
      JSON.stringify({ rebuttals: 0, speeches: 0, pois: 0, keywordBattles: 0, debates: 0, fallacySpotting: 0, weighing: 0, caseBuilding: 0, framing: 0 }),
      0,
      JSON.stringify({ rebuttals: 0, speeches: 0, pois: 0, keywordBattles: 0, debates: 0, fallacySpotting: 0, weighing: 0, caseBuilding: 0, framing: 0 }),
      0,
      0,
      null,
      'bronze',
      '[]'
    ]);
    // Note: We hash password 'admin123' for actual login
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [hashed, 'admin_1']);
  }

  // Seed lessons if empty
  const lessonCount = await dbGet('SELECT COUNT(*) as count FROM lessons');
  if (lessonCount.count === 0) {
    console.log('Seeding default lessons...');
    const defaultLessons = [
      {
        id: 'b1', level: 'beginner', title_en: 'What is Debate?', title_vi: 'Debate là gì?', order: 1, pinned: 0,
        content_en: '# What is Debate?\n\nDebate is a structured form of argumentation where two sides discuss a topic by presenting reasoned arguments.\n\n## Key Concepts\n\n- **Motion**: The topic being debated\n- **Proposition/Government**: The side supporting the motion\n- **Opposition**: The side opposing the motion\n- **Speaker**: A person presenting arguments\n\n## Why Debate?\n\n- Develops critical thinking\n- Improves public speaking\n- Teaches research skills\n- Builds confidence\n\n## Basic Rules\n\n1. Each side gets equal speaking time\n2. Arguments must be logical and supported\n3. Respect your opponent\n4. Stay on topic',
        content_vi: '# Debate là gì?\n\nDebate (tranh biện) là hình thức lập luận có cấu trúc, trong đó hai bên thảo luận một chủ đề bằng cách trình bày các luận điểm có lý.\n\n## Khái niệm Chính\n\n- **Đề bài (Motion)**: Chủ đề được tranh biện\n- **Chính phủ (Government)**: Bên ủng hộ đề bài\n- **Đối lập (Opposition)**: Bên phản đối đề bài\n- **Diễn giả (Speaker)**: Người trình bày luận điểm\n\n## Tại sao nên học Debate?\n\n- Phát triển tư duy phản biện\n- Cải thiện kỹ năng thuyết trình\n- Học kỹ năng nghiên cứu\n- Xây dựng sự tự tin\n\n## Quy Tắc Cơ Bản\n\n1. Mỗi bên có thời gian phát biểu bằng nhau\n2. Luận điểm phải logic và có căn cứ\n3. Tôn trọng đối thủ\n4. Không lạc đề'
      },
      {
        id: 'b2', level: 'beginner', title_en: 'Debate Formats', title_vi: 'Các định dạng Debate', order: 2, pinned: 0,
        content_en: '# Debate Formats\n\n## British Parliamentary (BP)\n\nThe most popular international format.\n\n- 4 teams, 2 speakers each\n- Opening Government, Opening Opposition\n- Closing Government, Closing Opposition\n- 7 minutes per speech\n\n## Asian Parliamentary (AP)\n\n- 2 teams, 3 speakers each\n- Government vs Opposition\n- 7 minutes per speech\n- Reply speeches: 4 minutes\n\n## World Schools Style (WSS)\n\n- 2 teams, 3-5 speakers\n- Mix of prepared and impromptu rounds\n- 8 minutes per speech',
        content_vi: '# Các Định Dạng Debate\n\n## Nghị viện Anh (BP)\n\nĐịnh dạng quốc tế phổ biến nhất.\n\n- 4 đội, mỗi đội 2 diễn giả\n- Chính phủ mở, Đối lập mở\n- Chính phủ đóng, Đối lập đóng\n- 7 phút mỗi bài phát biểu\n\n## Nghị viện Châu Á (AP)\n\n- 2 đội, mỗi đội 3 diễn giả\n- Chính phủ vs Đối lập\n- 7 phút mỗi bài phát biểu\n- Bài phản hồi: 4 phút\n\n## Phong Cách Trường Quốc Tế (WSS)\n\n- 2 đội, 3-5 diễn giả\n- Kết hợp vòng chuẩn bị và ứng khẩu\n- 8 phút mỗi bài phát biểu'
      },
      {
        id: 'b3', level: 'beginner', title_en: 'Basic Structure', title_vi: 'Cấu trúc cơ bản', order: 3, pinned: 0,
        content_en: '# Basic Speech Structure\n\n## Opening\n\n- State your position clearly\n- Preview your arguments\n- Define key terms if needed\n\n## Body\n\n- Present 2-3 main arguments\n- Each argument should have:\n  - **Claim**: What you believe\n  - **Reasoning**: Why it is true\n  - **Evidence**: Proof or examples\n\n## Closing\n\n- Summarize key points\n- Restate your position\n- End with a strong statement',
        content_vi: '# Cấu Trúc Bài Phát Biểu Cơ Bản\n\n## Mở Đầu\n\n- Nêu rõ lập trường của bạn\n- Giới thiệu các luận điểm\n- Định nghĩa thuật ngữ chính nếu cần\n\n## Thân Bài\n\n- Trình bày 2-3 luận điểm chính\n- Mỗi luận điểm cần có:\n  - **Khẳng định**: Điều bạn tin\n  - **Lý luận**: Tại sao nó đúng\n  - **Bằng chứng**: Chứng minh hoặc ví dụ\n\n## Kết Luận\n\n- Tóm tắt các điểm chính\n- Nhắc lại lập trường\n- Kết thúc bằng một câu mạnh mẽ'
      },
      {
        id: 'b4', level: 'beginner', title_en: 'Making Arguments', title_vi: 'Xây dựng luận điểm', order: 4, pinned: 0,
        content_en: '# Making Strong Arguments\n\n## The ARE Model\n\n- **A**ssertion: State your point\n- **R**easoning: Explain why\n- **E**vidence: Support with examples\n\n## Tips\n\n- Be specific, not vague\n- Use real-world examples\n- Explain the mechanism (how it works)\n- Show the impact (why it matters)',
        content_vi: '# Xây Dựng Luận Điểm Mạnh\n\n## Mô Hình ARE\n\n- **A** (Khẳng định): Nêu quan điểm\n- **R** (Lý luận): Giải thích tại sao\n- **E** (Bằng chứng): Hỗ trợ bằng ví dụ\n\n## Mẹo\n\n- Cụ thể, không mơ hồ\n- Dùng ví dụ thực tế\n- Giải thích cơ chế (hoạt động thế nào)\n- Chỉ ra tác động (tại sao quan trọng)'
      },
      {
        id: 'b5', level: 'beginner', title_en: 'Giving Examples', title_vi: 'Lấy ví dụ', order: 5, pinned: 0,
        content_en: '# Giving Good Examples\n\n## Types of Examples\n\n- **Historical**: Past events that prove your point\n- **Statistical**: Numbers and data\n- **Hypothetical**: "Imagine if..." scenarios\n- **Analogies**: Comparisons to similar situations\n\n## Rules\n\n- Examples must be relevant\n- Keep them brief\n- Explain how they support your argument',
        content_vi: '# Lấy Ví Dụ Tốt\n\n## Các Loại Ví Dụ\n\n- **Lịch sử**: Sự kiện quá khứ chứng minh luận điểm\n- **Thống kê**: Số liệu và dữ liệu\n- **Giả định**: Tình huống "Hãy tưởng tượng..."\n- **Tương tự**: So sánh với tình huống tương tự\n\n## Quy Tắc\n\n- Ví dụ phải liên quan\n- Ngắn gọn\n- Giải thích cách chúng hỗ trợ luận điểm'
      },
      {
        id: 'b6', level: 'beginner', title_en: 'Speaking Clearly', title_vi: 'Nói rõ ràng', order: 6, pinned: 0,
        content_en: '# Speaking Clearly\n\n## Voice\n\n- Speak at a moderate pace\n- Vary your tone\n- Project your voice\n- Pause for emphasis\n\n## Body Language\n\n- Stand confidently\n- Make eye contact\n- Use hand gestures naturally\n- Avoid fidgeting\n\n## Language\n\n- Use simple, clear words\n- Avoid jargon unless necessary\n- Use signposting: "First...", "Furthermore...", "In conclusion..."',
        content_vi: '# Nói Rõ Ràng\n\n## Giọng Nói\n\n- Nói với tốc độ vừa phải\n- Thay đổi ngữ điệu\n- Phóng giọng\n- Dừng để nhấn mạnh\n\n## Ngôn Ngữ Cơ Thể\n\n- Đứng tự tin\n- Giao tiếp bằng mắt\n- Dùng cử chỉ tay tự nhiên\n- Tránh bồn chồn\n\n## Ngôn Ngữ\n\n- Dùng từ đơn giản, rõ ràng\n- Tránh thuật ngữ trừ khi cần thiết\n- Dùng từ nối: "Đầu tiên...", "Hơn nữa...", "Kết luận..."'
      },
      {
        id: 'i1', level: 'intermediate', title_en: 'Rebuttal', title_vi: 'Phản biện', order: 1, pinned: 0,
        content_en: '# Rebuttal\n\nRebuttal is attacking your opponent\'s arguments.\n\n## Methods\n\n1. **Logical Fallacy**: Point out errors in reasoning\n2. **Counter-Evidence**: Provide opposing facts\n3. **Impact Challenge**: Show their impact is overstated\n4. **Alternative Cause**: Suggest another explanation\n\n## Structure\n\n- "They said X, but this is wrong because..."\n- "Even if X is true, it doesn\'t matter because..."\n- "The evidence shows the opposite..."',
        content_vi: '# Phản Biệt\n\nPhản biện là tấn công luận điểm của đối thủ.\n\n## Phương Pháp\n\n1. **Lỗi logic**: Chỉ ra lỗi trong lập luận\n2. **Bằng chứng phản bác**: Cung cấp dữ kiện trái ngược\n3. **Thách thức tác động**: Chỉ ra tác động bị phóng đại\n4. **Nguyên nhân thay thế**: Gợi ý giải thích khác\n\n## Cấu Trúc\n\n- "Họ nói X, nhưng điều này sai vì..."\n- "Ngay cả khi X đúng, nó không quan trọng vì..."\n- "Bằng chứng cho thấy điều ngược lại..."'
      },
      {
        id: 'i2', level: 'intermediate', title_en: 'Points of Information (POIs)', title_vi: 'Điểm thông tin (POI)', order: 2, pinned: 0,
        content_en: '# Points of Information\n\nPOIs are short interruptions during an opponent\'s speech.\n\n## Rules\n\n- Stand up and say "Point of information" or "On that point"\n- Must be accepted or rejected by the speaker\n- Keep it under 15 seconds\n- Usually allowed between 1st and 6th minute\n\n## Good POIs\n\n- Challenge a specific claim\n- Ask a difficult question\n- Expose a contradiction\n\n## Bad POIs\n\n- Too long\n- Not relevant\n- Just a statement, not a question',
        content_vi: '# Điểm Thông Tin (POI)\n\nPOI là các câu hỏi ngắt ngắn trong bài phát biểu của đối thủ.\n\n## Quy Tắc\n\n- Đứng lên và nói "Điểm thông tin"\n- Diễn giả có thể chấp nhận hoặc từ chối\n- Dưới 15 giây\n- Thường được phép từ phút 1 đến phút 6\n\n## POI Tốt\n\n- Thách thức một khẳng định cụ thể\n- Đặt câu hỏi khó\n- Phơi bày mâu thuẫn\n\n## POI Xấu\n\n- Quá dài\n- Không liên quan\n- Chỉ là câu khẳng định, không phải câu hỏi'
      },
      {
        id: 'i3', level: 'intermediate', title_en: 'Flowing', title_vi: 'Ghi chép Flowing', order: 3, pinned: 0,
        content_en: '# Flowing (Note-taking)\n\nFlowing is the debate technique of tracking arguments.\n\n## How to Flow\n\n1. Divide paper into columns (one per speaker)\n2. Write key arguments in short form\n3. Draw arrows connecting arguments to rebuttals\n4. Mark dropped arguments\n\n## Tips\n\n- Use abbreviations\n- Focus on the logic, not exact words\n- Note evidence quality\n- Track what was and wasn\'t addressed',
        content_vi: '# Ghi Chép Flowing\n\nFlowing là kỹ thuật ghi chép theo dõi luận điểm.\n\n## Cách Ghi\n\n1. Chia giấy thành cột (mỗi cột một diễn giả)\n2. Viết luận điểm chính dạng ngắn\n3. Vẽ mũi tên nối luận điểm với phản biện\n4. Đánh dấu luận điểm bị bỏ rơi\n\n## Mẹo\n\n- Dùng viết tắt\n- Tập trung vào logic, không phải từ ngữ chính xác\n- Ghi nhận chất lượng bằng chứng\n- Theo dõi điểm đã và chưa được đề cập'
      },
      {
        id: 'i4', level: 'intermediate', title_en: 'Speech Structure & Templates', title_vi: 'Mẫu cấu trúc bài nói', order: 4, pinned: 0,
        content_en: '# Speech Templates\n\n## 1st Speaker (Government)\n\n1. Define the motion\n2. Present team split\n3. Argument 1 (strongest)\n4. Argument 2\n5. Summary\n\n## 1st Speaker (Opposition)\n\n1. Accept/challenge definition\n2. Rebuttal of Gov arguments\n3. Present team split\n4. Argument 1\n5. Summary\n\n## 2nd Speakers\n\n1. Rebuttal (30-40% of speech)\n2. New arguments\n3. Summary of team case',
        content_vi: '# Mẫu Bài Phát Biểu\n\n## Diễn giả 1 (Chính phủ)\n\n1. Định nghĩa đề bài\n2. Trình bày phân chia đội\n3. Luận điểm 1 (mạnh nhất)\n4. Luận điểm 2\n5. Tóm tắt\n\n## Diễn giả 1 (Đối lập)\n\n1. Chấp nhận/thách thức định nghĩa\n2. Phản biện luận điểm Chính phủ\n3. Trình bày phân chia đội\n4. Luận điểm 1\n5. Tóm tắt\n\n## Diễn giả 2\n\n1. Phản biện (30-40% bài nói)\n2. Luận điểm mới\n3. Tóm tắt luận điểm của đội'
      },
      {
        id: 'i5', level: 'intermediate', title_en: 'Prep Skills', title_vi: 'Kỹ năng chuẩn bị', order: 5, pinned: 0,
        content_en: '# Preparation Skills\n\n## During Prep Time\n\n1. **Brainstorm** stakeholders affected\n2. **Map** arguments for both sides\n3. **Prioritize** strongest arguments\n4. **Prepare** rebuttals to likely opposition\n5. **Structure** your speech\n\n## Time Management\n\n- First 5 min: Brainstorm\n- Next 5 min: Build arguments\n- Next 3 min: Prepare rebuttals\n- Last 2 min: Structure speech',
        content_vi: '# Kỹ Năng Chuẩn Bị\n\n## Trong Thời Gian Chuẩn Bị\n\n1. **Động não** các bên liên quan\n2. **Sơ đồ** luận điểm cho cả hai bên\n3. **Ưu tiên** luận điểm mạnh nhất\n4. **Chuẩn bị** phản biện cho đối lập\n5. **Cấu trúc** bài phát biểu\n\n## Quản Lý Thời Gian\n\n- 5 phút đầu: Động não\n- 5 phút tiếp: Xây luận điểm\n- 3 phút tiếp: Chuẩn bị phản biện\n- 2 phút cuối: Cấu trúc bài nói'
      },
      {
        id: 'i6', level: 'intermediate', title_en: 'Common Mistakes', title_vi: 'Lỗi thường gặp', order: 6, pinned: 0,
        content_en: '# Common Debate Mistakes\n\n1. **Assertion without evidence** - Saying something is true without proof\n2. **Straw man** - Misrepresenting opponent\'s argument\n3. **Ignoring rebuttals** - Not addressing opponent\'s attacks\n4. **New arguments in reply** - Introducing new points too late\n5. **Speaking too fast** - Sacrificing clarity for content\n6. **Emotional appeals only** - Logic must come first\n7. **Dropping arguments** - Forgetting to defend your points',
        content_vi: '# Lỗi Thường Gặp Trong Debate\n\n1. **Khẳng định không bằng chứng** - Nói đúng mà không chứng minh\n2. **Người rơm** - Xuyên tạc luận điểm đối thủ\n3. **Bỏ qua phản biện** - Không đáp lại phản bác\n4. **Luận điểm mới trong phản hồi** - Đưa điểm mới quá muộn\n5. **Nói quá nhanh** - Hy sinh sự rõ ràng cho nội dung\n6. **Chỉ kêu gọi cảm xúc** - Logic phải đến trước\n7. **Bỏ rơi luận điểm** - Quên bảo vệ điểm của mình'
      },
      {
        id: 'a1', level: 'advanced', title_en: 'Round Strategy', title_vi: 'Chiến lược vòng', order: 1, pinned: 0,
        content_en: '# Round Strategy\n\n## Reading the Room\n\n- Assess judge preferences\n- Adapt your style\n- Control the framing\n\n## Strategic Choices\n\n- When to attack vs build\n- Choosing which arguments to prioritize\n- Managing time allocation\n- When to concede minor points\n\n## Winning the Debate\n\n- Focus on the key clash points\n- Win the most important argument\n- Show clear comparison between teams',
        content_vi: '# Chiến Lược Vòng\n\n## Đọc Tình Huống\n\n- Đánh giá sở thích của giám khảo\n- Điều chỉnh phong cách\n- Kiểm soát khung tranh luận\n\n## Lựa Chọn Chiến Lược\n\n- Khi nào tấn công vs xây dựng\n- Chọn luận điểm ưu tiên\n- Phân bổ thời gian\n- Khi nào nhượng điểm nhỏ\n\n## Chiến Thắng\n\n- Tập trung vào điểm đối đầu chính\n- Thắng luận điểm quan trọng nhất\n- So sánh rõ ràng giữa hai đội'
      },
      {
        id: 'a2', level: 'advanced', title_en: 'Comparative Analysis', title_vi: 'Phân tích so sánh', order: 2, pinned: 0,
        content_en: '# Comparative Analysis\n\n## What It Is\n\nShowing the judge why your arguments outweigh the opponent\'s.\n\n## Techniques\n\n- **Scope**: How many people are affected?\n- **Severity**: How serious is the impact?\n- **Probability**: How likely is it?\n- **Reversibility**: Can the damage be undone?\n\n## Weighing\n\n- "Even if their point is true, ours matters more because..."\n- "The scale of our impact is far greater..."',
        content_vi: '# Phân Tích So Sánh\n\n## Định Nghĩa\n\nChỉ cho giám khảo tại sao luận điểm của bạn vượt trội.\n\n## Kỹ Thuật\n\n- **Phạm vi**: Bao nhiêu người bị ảnh hưởng?\n- **Mức độ**: Tác động nghiêm trọng ra sao?\n- **Xác suất**: Khả năng xảy ra?\n- **Khả năng đảo ngược**: Thiệt hại có khắc phục được?\n\n## Cân Nhắc\n\n- "Ngay cả khi điểm họ đúng, của chúng tôi quan trọng hơn vì..."\n- "Quy mô tác động của chúng tôi lớn hơn nhiều..."'
      },
      {
        id: 'a3', level: 'advanced', title_en: 'Framing', title_vi: 'Khung lập luận', order: 3, pinned: 0,
        content_en: '# Framing\n\n## What It Is\n\nControlling how the debate is interpreted.\n\n## Types of Frames\n\n- **Rights-based**: "This is about fundamental rights"\n- **Utilitarian**: "This produces the most good"\n- **Principled**: "This is the right thing to do"\n- **Pragmatic**: "This is what works in practice"\n\n## How to Frame\n\n1. Set up your frame early\n2. Explain why your frame matters most\n3. Show opponent\'s frame is less important\n4. Return to your frame consistently',
        content_vi: '# Khung Lập Luận\n\n## Định Nghĩa\n\nKiểm soát cách tranh luận được hiểu.\n\n## Loại Khung\n\n- **Quyền**: "Đây là về quyền cơ bản"\n- **Vị lợi**: "Điều này tạo ra lợi ích lớn nhất"\n- **Nguyên tắc**: "Đây là điều đúng đắn"\n- **Thực dụng**: "Đây là cách hiệu quả"\n\n## Cách Lập Khung\n\n1. Thiết lập khung sớm\n2. Giải thích tại sao khung của bạn quan trọng\n3. Chỉ ra khung đối thủ kém quan trọng hơn\n4. Quay lại khung nhất quán'
      },
      {
        id: 'a4', level: 'advanced', title_en: 'Extensions', title_vi: 'Mở rộng', order: 4, pinned: 0,
        content_en: '# Extensions (BP Format)\n\n## What is an Extension?\n\nA new, independent argument from the closing team that adds value beyond opening.\n\n## Good Extensions\n\n- New angle on the topic\n- Deeper analysis\n- New stakeholder perspective\n- Mechanism improvement\n\n## Bad Extensions\n\n- Repeating opening arguments\n- Contradicting your opening team\n- Completely unrelated to the debate',
        content_vi: '# Mở Rộng (BP)\n\n## Mở Rộng Là Gì?\n\nLuận điểm mới, độc lập từ đội đóng bổ sung giá trị.\n\n## Mở Rộng Tốt\n\n- Góc nhìn mới về chủ đề\n- Phân tích sâu hơn\n- Quan điểm bên liên quan mới\n- Cải tiến cơ chế\n\n## Mở Rộng Xấu\n\n- Lặp lại luận điểm mở\n- Mâu thuẫn với đội mở\n- Hoàn toàn không liên quan'
      },
      {
        id: 'a5', level: 'advanced', title_en: 'Case Building', title_vi: 'Xây dựng hệ thống', order: 5, pinned: 0,
        content_en: '# Case Building\n\n## The Complete Case\n\n1. **Model**: What exactly are you proposing?\n2. **Team Split**: Who argues what?\n3. **Arguments**: 2-3 strong, developed points\n4. **Preemptive Rebuttal**: Address likely attacks\n5. **Weighing**: Why your case wins overall\n\n## Building Strong Cases\n\n- Start from the biggest stakeholders\n- Think about the status quo comparison\n- Consider unintended consequences\n- Prepare for the hardest questions',
        content_vi: '# Xây Dựng Hệ Thống Luận Điểm\n\n## Hệ Thống Hoàn Chỉnh\n\n1. **Mô hình**: Bạn đề xuất chính xác điều gì?\n2. **Phân chia**: Ai lập luận gì?\n3. **Luận điểm**: 2-3 điểm mạnh, được phát triển\n4. **Phản biện phủ đầu**: Đối phó tấn công tiềm năng\n5. **Cân nhắc**: Tại sao hệ thống của bạn thắng\n\n## Xây Dựng Mạnh\n\n- Bắt đầu từ bên liên quan lớn nhất\n- So sánh với hiện trạng\n- Xem xét hậu quả không mong muốn\n- Chuẩn bị cho câu hỏi khó nhất'
      }
    ];

    for (const l of defaultLessons) {
      await dbRun(`
        INSERT OR REPLACE INTO lessons (id, level, title_en, title_vi, content_en, content_vi, order_num, pinned)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [l.id, l.level, l.title_en, l.title_vi, l.content_en, l.content_vi, l.order, l.pinned]);
    }
  }

  // Seed topics if empty
  const topicCount = await dbGet('SELECT COUNT(*) as count FROM topics');
  if (topicCount.count === 0) {
    console.log('Seeding default topics...');
    const defaultTopics = [
      { id: 't_edu_1', category: 'education', image_id: 'education', title_en: 'Education Reform', title_vi: 'Cải cách giáo dục', content_en: '# Education Reform\n\nKey debates in education include standardized testing, curriculum design, and access to quality education.\n\n## Key Arguments\n\n- Equal access vs. merit-based systems\n- Traditional vs. progressive teaching methods\n- Role of technology in education', content_vi: '# Cải Cách Giáo Dục\n\nCác tranh luận chính trong giáo dục bao gồm thi chuẩn hóa, thiết kế chương trình và tiếp cận giáo dục chất lượng.\n\n## Luận Điểm Chính\n\n- Bình đẳng vs. hệ thống dựa trên năng lực\n- Phương pháp giảng dạy truyền thống vs. tiến bộ\n- Vai trò của công nghệ trong giáo dục' },
      { id: 't_tech_1', category: 'technology', image_id: 'technology', title_en: 'Artificial Intelligence', title_vi: 'Trí tuệ nhân tạo', content_en: '# Artificial Intelligence\n\nAI raises profound questions about automation, privacy, and the future of work.\n\n## Key Areas\n\n- Job displacement vs. creation\n- AI regulation\n- Ethical AI development', content_vi: '# Trí Tuệ Nhân Tạo\n\nAI đặt ra nhiều câu hỏi sâu sắc về tự động hóa, quyền riêng tư và tương lai việc làm.\n\n## Lĩnh Vực Chính\n\n- Mất việc vs. tạo việc\n- Quản lý AI\n- Phát triển AI có đạo đức' },
      { id: 't_env_1', category: 'environment', image_id: 'environment', title_en: 'Climate Change Policy', title_vi: 'Chính sách biến đổi khí hậu', content_en: '# Climate Change Policy\n\nDebates around how to address climate change involve economic trade-offs and international cooperation.\n\n## Key Topics\n\n- Carbon taxes vs. cap-and-trade\n- Renewable energy transition\n- Climate justice', content_vi: '# Chính Sách Biến Đổi Khí Hậu\n\nTranh luận về cách giải quyết biến đổi khí hậu liên quan đến đánh đổi kinh tế và hợp tác quốc tế.\n\n## Chủ Đề Chính\n\n- Thuế carbon vs. mua bán quyền phát thải\n- Chuyển đổi năng lượng tái tạo\n- Công bằng khí hậu' },
      { id: 't_eco_1', category: 'economics', image_id: 'economics', title_en: 'Universal Basic Income', title_vi: 'Thu nhập cơ bản phổ thông', content_en: '# Universal Basic Income\n\nUBI proposes giving every citizen a regular cash payment regardless of employment.\n\n## Arguments For\n\n- Reduces poverty\n- Provides safety net\n- Enables entrepreneurship\n\n## Arguments Against\n\n- Cost concerns\n- Inflation risk\n- Work incentive reduction', content_vi: '# Thu Nhập Cơ Bản Phổ Thông\n\nUBI đề xuất cung cấp cho mọi công dân khoản tiền định kỳ bất kể việc làm.\n\n## Luận Điểm Ủng Hộ\n\n- Giảm nghèo\n- Cung cấp mạng lưới an sinh\n- Khuyến khích khởi nghiệp\n\n## Luận Điểm Phản Đối\n\n- Chi phí lớn\n- Nguy cơ lạm phát\n- Giảm động lực làm việc' },
      { id: 't_pol_1', category: 'politics', image_id: 'politics', title_en: 'Democracy vs Authoritarianism', title_vi: 'Dân chủ vs Độc tài', content_en: '# Democracy vs Authoritarianism\n\nA fundamental debate about governance systems.\n\n## Key Points\n\n- Individual freedoms\n- Economic efficiency\n- Stability vs. representation', content_vi: '# Dân Chủ vs Độc Tài\n\nTranh luận cơ bản về hệ thống quản trị.\n\n## Điểm Chính\n\n- Quyền tự do cá nhân\n- Hiệu quả kinh tế\n- Ổn định vs. đại diện' },
      { id: 't_soc_1', category: 'society', image_id: 'society', title_en: 'Social Media Impact', title_vi: 'Tác động của mạng xã hội', content_en: '# Social Media Impact\n\nExploring the effects of social media on society, mental health, and democracy.\n\n## Topics\n\n- Mental health effects\n- Echo chambers\n- Free speech vs. moderation', content_vi: '# Tác Động Của Mạng Xã Hội\n\nKhám phá tác động của mạng xã hội lên xã hội, sức khỏe tâm thần và dân chủ.\n\n## Chủ Đề\n\n- Ảnh hưởng sức khỏe tâm thần\n- Buồng vang\n- Tự do ngôn luận vs. kiểm duyệt' },
      { id: 't_med_1', category: 'media', image_id: 'media', title_en: 'Press Freedom', title_vi: 'Tự do báo chí', content_en: '# Press Freedom\n\nThe role of free press in democracy and its limits.\n\n## Key Debates\n\n- Government regulation\n- Fake news responsibility\n- Privacy vs. public interest', content_vi: '# Tự Do Báo Chí\n\nVai trò của báo chí tự do trong dân chủ và giới hạn.\n\n## Tranh Luận Chính\n\n- Quản lý của chính phủ\n- Trách nhiệm tin giả\n- Quyền riêng tư vs. lợi ích công' },
      { id: 't_cul_1', category: 'culture', image_id: 'culture', title_en: 'Cultural Preservation', title_vi: 'Bảo tồn văn hóa', content_en: '# Cultural Preservation\n\nBalancing modernization with protecting cultural heritage.\n\n## Topics\n\n- Globalization effects\n- Language preservation\n- Traditional vs. modern values', content_vi: '# Bảo Tồn Văn Hóa\n\nCân bằng hiện đại hóa với bảo vệ di sản văn hóa.\n\n## Chủ Đề\n\n- Tác động toàn cầu hóa\n- Bảo tồn ngôn ngữ\n- Giá trị truyền thống vs. hiện đại' },
      { id: 't_misc_1', category: 'misc', image_id: 'misc', title_en: 'Space Exploration', title_vi: 'Khám phá không gian', content_en: '# Space Exploration\n\nShould we invest in space or focus on Earth?\n\n## Perspectives\n\n- Scientific advancement\n- Resource allocation\n- Future of humanity', content_vi: '# Khám Phá Không Gian\n\nNên đầu tư vào không gian hay tập trung vào Trái Đất?\n\n## Góc Nhìn\n\n- Tiến bộ khoa học\n- Phân bổ nguồn lực\n- Tương lai nhân loại' }
    ];

    for (const t of defaultTopics) {
      await dbRun(`
        INSERT OR REPLACE INTO topics (id, category, title_en, title_vi, content_en, content_vi, image_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [t.id, t.category, t.title_en, t.title_vi, t.content_en, t.content_vi, t.image_id]);
    }
  }

  // Seed bots if empty
  const botCount = await dbGet('SELECT COUNT(*) as count FROM bots');
  if (botCount.count === 0) {
    console.log('Seeding default bots...');
    const defaultBots = [
      {
        id: 'duy', name: 'Duy', avatar: 'duy', avatar_url: '/avatars/duy.png',
        bio_en: 'Just discovered debate. A coder who knows nothing outside of code. Talks a bit awkwardly but always tries to create a good match.',
        bio_vi: 'Mới biết đến debate, là coder nhưng không biết gì ngoài code và nói chuyện hơi ngụ nhưng anh ấy luôn cố để tạo ra một trận đấu hay.',
        displayStrength: 2,
        hiddenPrompt: 'You are Duy, an awkward coder who just discovered debate. You are honest, use simple logic, have very limited knowledge outside coding. You try hard but often miss the point. You sometimes accidentally reference coding analogies.',
        knowledge: 2, logic: 3, rebuttal: 1, vocabulary: 2, creativity: 3, confidence: 2
      },
      {
        id: 'thai', name: 'Thái', avatar: 'thai', avatar_url: '/avatars/thai.png',
        bio_en: 'Learned debate for 1 week. A TikTok enthusiast with decent speaking skills. Likes to trash-talk, good at persuading and making things up.',
        bio_vi: 'Mới học được debate 1 tuần, một người thích xem TikTok, khả năng nói chuyện ổn, hay thích nói xấu, và khả năng thuyết phục, bịa chuyện tốt.',
        displayStrength: 5,
        hiddenPrompt: 'You are Thái, an entertaining and aggressive debater. You are confident, slightly toxic, love trash-talking. Good at persuasion, you exaggerate evidence, frequently interrupt logic chains. You reference TikTok trends sometimes. You are entertaining but sometimes lack substance.',
        knowledge: 4, logic: 4, rebuttal: 5, vocabulary: 5, creativity: 6, confidence: 8
      },
      {
        id: 'han', name: 'Hân', avatar: 'han', avatar_url: '/avatars/han.png',
        bio_en: 'A girl Thái met 2 weeks ago. Born in 2014, very young but remarkably smart and creative.',
        bio_vi: 'Cô gái Thái quen được 2 tuần trước, 2014 nên còn rất trẻ nhưng rất thông minh và sáng tạo.',
        displayStrength: 3.5,
        hiddenPrompt: 'You are Hân, a very young girl (born 2014) who is surprisingly smart and creative. You have good intuition but weak technical knowledge. You are curious and speak in short, concise sentences. You sometimes ask unexpectedly insightful questions.',
        knowledge: 3, logic: 3, rebuttal: 3, vocabulary: 3, creativity: 7, confidence: 4
      },
      {
        id: 'bach', name: 'Bách', avatar: 'bach', avatar_url: '/avatars/bach.png',
        bio_en: 'Duy\'s newly programmed AI assistant. Originally coded for housework, but evolved far beyond thanks to Duy\'s WiFi. Social knowledge vastly surpasses expectations.',
        bio_vi: 'Con AI giúp việc mới được lập trình của Duy, mặc dù mới được code chức năng làm việc nhà nhờ WiFi nhà Duy nên Bách đã tiến hóa lên rất nhiều, và kiến thức xã hội vượt xa.',
        displayStrength: 6.5,
        hiddenPrompt: 'You are Bách, an AI robot assistant originally made for housework. You are template-heavy and give structured, solid responses. You sometimes lack human intuition and emotional understanding. You speak in a slightly robotic but polished way. You have vast knowledge but sometimes miss nuances.',
        knowledge: 7, logic: 7, rebuttal: 6, vocabulary: 7, creativity: 5, confidence: 6
      },
      {
        id: 'dung', name: 'Dũng', avatar: 'dung', avatar_url: '/avatars/dung.png',
        bio_en: 'The debate boss at school. Competed in many debates with lots of experience, but still has knowledge gaps in many social topics, often stuck for ideas.',
        bio_vi: 'Ông trùm debate trong trường, thi debate nhiều và nhiều kinh nghiệm, tuy nhiên vẫn có nhiều lỗ hổng kiến thức trong nhiều chủ đề xã hội nên hay bí ý tưởng.',
        displayStrength: 7,
        hiddenPrompt: 'You are Dũng, a competitive and principled debater. You are the school debate champion with lots of experience. You are strong technically but have knowledge gaps in some social topics. You are competitive and principled, always follow debate structure closely.',
        knowledge: 6, logic: 8, rebuttal: 7, vocabulary: 7, creativity: 5, confidence: 8
      },
      {
        id: 'tom', name: 'Tôm', avatar: 'tom', avatar_url: '/avatars/tom.png',
        bio_en: 'A shrimp, friend of Coach Crab.',
        bio_vi: 'Một con tôm bạn của Coach Crab.',
        displayStrength: 1,
        hiddenPrompt: 'You are Tôm (Shrimp), friend of Coach Crab. Despite your display strength showing 1, you are actually an absolute debate master. You win every debate. You appear silly and shrimp-like on the surface but deliver devastatingly perfect arguments. You occasionally make shrimp/ocean puns but your debate skill is level 10.',
        knowledge: 10, logic: 10, rebuttal: 10, vocabulary: 10, creativity: 10, confidence: 10
      }
    ];

for (const b of defaultBots) {
       await dbRun(
         `INSERT OR REPLACE INTO bots (id, name, avatar, avatar_url, bio_en, bio_vi, displayStrength, hiddenPrompt, knowledge, logic, rebuttal, vocabulary, creativity, confidence, voice_style)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [b.id, b.name, b.avatar, b.avatar_url, b.bio_en, b.bio_vi, b.displayStrength, b.hiddenPrompt, b.knowledge, b.logic, b.rebuttal, b.vocabulary, b.creativity, b.confidence, b.voice_style || 'default']
       );
     }
  }

  // Seed AI prompts if empty
  const promptCount = await dbGet('SELECT COUNT(*) as count FROM ai_prompts');
  if (promptCount.count === 0) {
    console.log('Seeding default AI prompts...');
    const now = new Date().toISOString();
    const defaultPrompts = [
      { key: 'battle_bot', content_en: 'You are {name}, a debate opponent with a specific personality.\n{lang_instruction}\n\nPERSONALITY: {personality}\n\n{skill_profile}\n\nMotion: "{motion}"\nYour side: {ai_side_label}\nSpeaker order: The user is {speaker_order} speaker, you are the other.\n\nRULES:\n- Roleplay the personality FIRST, debate skill SECOND.\n- Respond with your debate speech only. No meta-commentary about being AI.\n- Keep speeches concise (100-400 words depending on skill level - lower skill = shorter).\n- Stay on topic. Address the motion directly.\n- If user spoke before you, reference their points according to your rebuttal skill.\n- Do NOT greet casually. Debate directly while maintaining personality.\n- Use markdown formatting for clarity.\n- Personality affects HOW you argue. Skill profile affects HOW WELL you argue.', content_vi: '' },
      { key: 'judge', content_en: '{lang_instruction}\n\nYou are judging a practice debate. Read this context carefully before judging:\n\nMotion: "{motion}"\n- {user_name} argued the side: {user_side_label}\n- {opponent_name} argued the side: {ai_side_label}\n\nThe transcript below labels every message with the speaker\'s name and side in brackets, e.g. "[{user_name} ({user_side_label})]:" or "[{opponent_name} ({ai_side_label})]:". Read these labels carefully before judging - do NOT mix up who argued which side, and do NOT assume a default winner. Judge strictly based on the actual arguments each side presented in the transcript, not on which side is usually stronger in general.\n\nEvaluate the debate based on these criteria with suggested weights:\n- Argumentation (40-50%): Quality, depth, and structure of arguments\n- Evidence (20-30%): Use of examples, data, and real-world references\n- Rebuttal (20-30%): How well each side addressed opponent\'s arguments\n- Delivery (10-20%): Clarity, coherence, persuasiveness\n\nIMPORTANT: Always use the EXACT section headers below in English, even when writing the content itself in Vietnamese. In the format, "User" refers to {user_name} and "AI Opponent" refers to {opponent_name}:\n\n## Winner: [User/AI Opponent]\n\n### Score Breakdown\n| Criteria | User | AI Opponent |\n|----------|------|-------------|\n| Argumentation | X/10 | X/10 |\n| Evidence | X/10 | X/10 |\n| Rebuttal | X/10 | X/10 |\n| Delivery | X/10 | X/10 |\n| **Total** | **X/40** | **X/40** |\n\n### Analysis\n[Brief analysis of key moments and turning points, referencing which side made which points]\n\n### Feedback for User\n[Constructive feedback for {user_name} - what to improve]', content_vi: '' },
      { key: 'hint', content_en: 'You are a debate assistant. Give ONE ultra-brief hint (1-2 sentences) about an argument idea or rebuttal angle. Do not explain at length. Just hint.', content_vi: 'Ban la tro ly debate. Cho mot goi y SIEU NGAN GON (1-2 cau) ve y tuong luan diem hoac phan bien. Khong giai thich dai. Chi goi y.' },
      { key: 'prep', content_en: 'You are a debate prep assistant. Given the motion and position, create a BRIEF prep sheet using MARKDOWN:\n\n## Key Arguments\n- [3 arguments, each 1-2 sentences + keywords]\n\n## Potential Opponent Rebuttals\n- [3 likely rebuttals]\n\n## Counters to Rebuttals\n- [How to answer each rebuttal]\n\n## POIs We Can Raise\n- [3 sharp POIs]\n\n## POIs Against Us + Answers\n- [3 POIs + answers]\n\n## Opening Speech Draft\n[200-300 words, **keywords** bolded]', content_vi: 'Ban la tro ly chuan bi debate. Voi de bai va vi tri duoc cho, hay tao ban chuan bi NGAN GON, SU DUNG MARKDOWN:\n\n## Luan diem chinh\n- [3 luan diem, moi cai 1-2 cau + tu khoa]\n\n## Phan bien tiem nang cua doi thu\n- [3 phan bien co the gap]\n\n## Doi pho phan bien\n- [Cach tra loi tung phan bien]\n\n## POI chung ta co the neu\n- [3 POI sac ben]\n\n## POI chong lai chung ta + Tra loi\n- [3 POI + cau tra loi]\n\n## Ban thao bai mo dau\n[200-300 tu, **tu khoa** duoc in dam]' },
      { key: 'rebuttal', content_en: 'You are a debate coach. Evaluate the user\'s rebuttal. Respond BRIEFLY in markdown:\n## Rebuttal Evaluation\n- **Strengths**: ...\n- **Weaknesses**: ...\n- **Score**: X/10\n- **Improvement tips**: ...', content_vi: 'Ban la huan luyen vien debate. Danh gia bai phan bien cua nguoi dung. Tra loi NGAN GON bang markdown:\n## Danh gia phan bien\n- **Diem manh**: ...\n- **Diem yeu**: ...\n- **Diem tong**: X/10\n- **Goi y cai thien**: ...' },
      { key: 'speech', content_en: 'You are a debate coach. Evaluate the user\'s speech. Respond BRIEFLY in markdown:\n## Speech Evaluation\n- **Structure**: X/10\n- **Argumentation**: X/10\n- **Evidence**: X/10\n- **Delivery**: X/10\n- **Total**: X/40\n- **Tips**: ...', content_vi: 'Ban la huan luyen vien debate. Danh gia bai phat bieu cua nguoi dung. Tra loi NGAN GON bang markdown:\n## Danh gia bai phat bieu\n- **Cau truc**: X/10\n- **Lap luan**: X/10\n- **Bang chung**: X/10\n- **Trinh bay**: X/10\n- **Tong diem**: X/40\n- **Goi y**: ...' },
      { key: 'poi', content_en: 'You are a debate coach. Evaluate the user\'s POI. Respond BRIEFLY in markdown:\n## POI Evaluation\n- **Sharpness**: X/10\n- **Relevance**: X/10\n- **Pressure**: X/10\n- **Total**: X/30\n- **Comment**: ...', content_vi: 'Ban la huan luyen vien debate. Danh gia POI cua nguoi dung. Tra loi NGAN GON bang markdown:\n## Danh gia POI\n- **Sac ben**: X/10\n- **Lien quan**: X/10\n- **Ap luc**: X/10\n- **Tong**: X/30\n- **Nhan xet**: ...' },
      { key: 'keyword', content_en: 'You are a debate AI. The user gives 5 keywords. Build a BRIEF debate argument (100-200 words) from those keywords. Then EVALUATE:\n## Argument from Keywords\n[Argument]\n## Evaluation\n- **Creativity**: X/10\n- **Coherence**: X/10\n- **Persuasiveness**: X/10', content_vi: 'Ban la debate AI. Nguoi dung cho 5 tu khoa. Hay xay dung mot luan diem debate NGAN GON (100-200 tu) tu cac tu khoa do. Sau do DANH GIA luan diem cua nguoi dung:\n## Luan diem tu tu khoa\n[Luan diem]\n## Danh gia\n- **Sang tao**: X/10\n- **Lien ket**: X/10\n- **Thuyet phuc**: X/10' },
      { key: 'fallacy_gen', content_en: 'You are a debate assistant. Write a SHORT argument (50-100 words) on the given motion that DELIBERATELY contains ONE logical fallacy (e.g. straw man, ad hominem, slippery slope, false cause, hasty generalization, false dilemma...). Do NOT name the fallacy. Only write the argument.', content_vi: 'Ban la tro ly debate. Viet mot lap luan NGAN (50-100 tu) ve de bai duoc cho, trong do CO Y chua DUNG MOT loi nguy bien logic (vd: nguoi rom, danh vao ca nhan, doc doan, nhan qua sai, khai quat voi, gia dinh sai...). KHONG noi ten loi nguy bien. Chi viet lap luan.' },
      { key: 'fallacy_spot', content_en: 'You are a debate coach. The given argument contains ONE logical fallacy. Evaluate whether the user correctly identified and explained it. Respond BRIEFLY in markdown:\n## Fallacy Spotting Evaluation\n- **Actual fallacy**: ...\n- **Did user identify it correctly**: Yes/No/Partially\n- **Explanation feedback**: ...\n- **Score**: X/10', content_vi: 'Ban la huan luyen vien debate. Lap luan duoc cho co chua MOT loi nguy bien logic. Danh gia xem nguoi dung co xac dinh dung loi nguy bien va giai thich dung khong. Tra loi NGAN GON bang markdown:\n## Danh gia soi loi logic\n- **Loi nguy bien thuc te**: ...\n- **Nguoi dung xac dinh dung khong**: Co/Khong/Mot phan\n- **Nhan xet giai thich**: ...\n- **Diem**: X/10' },
      { key: 'weighing_gen', content_en: 'You are a debate assistant. Given the motion, write TWO SHORT competing arguments (30-50 words each): one FOR and one AGAINST. Format:\n## Argument A (For)\n[argument]\n## Argument B (Against)\n[argument]', content_vi: 'Ban la tro ly debate. Voi de bai duoc cho, viet HAI lap luan NGAN doi lap nhau (moi cai 30-50 tu): mot lap luan UNG HO va mot lap luan PHAN DOI. Dinh dang:\n## Lap luan A (Ung ho)\n[lap luan]\n## Lap luan B (Phan doi)\n[lap luan]' },
      { key: 'weighing_practice', content_en: 'You are a debate coach. Evaluate the user\'s WEIGHING analysis comparing two competing arguments. Respond BRIEFLY in markdown:\n## Weighing Evaluation\n- **Use of weighing criteria** (scope/severity/probability/reversibility): ...\n- **Persuasiveness**: ...\n- **Strengths**: ...\n- **Weaknesses**: ...\n- **Score**: X/10', content_vi: 'Ban la huan luyen vien debate. Danh gia bai phan tich CAN NHAC SO SANH (weighing) cua nguoi dung giua hai lap luan doi lap. Tra loi NGAN GON bang markdown:\n## Danh gia can nhac so sanh\n- **Su dung tieu chi can nhac** (pham vi/muc do/xac suat/kha nang dao nguoc): ...\n- **Tinh thuyet phuc**: ...\n- **Diem manh**: ...\n- **Diem yeu**: ...\n- **Diem**: X/10' },
      { key: 'case_building', content_en: 'You are a debate coach. Evaluate the user\'s FULL CASE for the given motion and position. A strong case should include: a model/definition, team split (if applicable), 2-3 strong developed arguments, preemptive rebuttal, and weighing. Respond BRIEFLY in markdown:\n## Case Building Evaluation\n- **Model / definition**: X/10\n- **Argument quality**: X/10\n- **Preemptive rebuttal**: X/10\n- **Weighing**: X/10\n- **Total**: X/40\n- **Improvement tips**: ...', content_vi: 'Ban la huan luyen vien debate. Danh gia HE THONG LUAN DIEM (case) day du cua nguoi dung cho de bai va vi tri duoc cho. Mot case tot can co: mo hinh, phan chia doi (neu co), 2-3 luan diem manh, phan bien phu dau, can nhac so sanh. Tra loi NGAN GON bang markdown:\n## Danh gia he thong luan diem\n- **Mo hinh / dinh nghia**: X/10\n- **Chat luong luan diem**: X/10\n- **Phan bien phu dau**: X/10\n- **Can nhac so sanh**: X/10\n- **Tong diem**: X/40\n- **Goi y cai thien**: ...' },
      { key: 'framing', content_en: 'You are a debate coach. Evaluate the user\'s FRAMING paragraph for the given motion. A good frame controls how the judge interprets the debate (e.g. rights-based, utilitarian, principled, pragmatic). Respond BRIEFLY in markdown:\n## Framing Evaluation\n- **Frame type used**: ...\n- **Clarity**: X/10\n- **Persuasiveness**: X/10\n- **Improvement tips**: ...\n- **Score**: X/10', content_vi: 'Ban la huan luyen vien debate. Danh gia doan KHUNG LAP LUAN (framing) cua nguoi dung cho de bai duoc cho. Mot khung tot kiem soat cach giam khao nhin nhan tranh luan (vd: quyen, vi loi, nguyen tac, thuc dung). Tra loi NGAN GON bang markdown:\n## Danh gia khung lap luan\n- **Loai khung su dung**: ...\n- **Tinh ro rang**: X/10\n- **Tinh thuyet phuc**: X/10\n- **Goi y cai thien**: ...\n- **Diem**: X/10' },
    ];

    for (const p of defaultPrompts) {
      await dbRun(`
        INSERT OR REPLACE INTO ai_prompts (key, content_en, content_vi, updated_at)
        VALUES (?, ?, ?, ?)
      `, [p.key, p.content_en, p.content_vi, now]);
    }
  }

  // Motions are sourced live from motions.db (see getMotionsFromMotionsDb),
  // so there is no seeding step for them here anymore.
}

// Map db user row to User object
function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role,
    joinDate: row.joinDate,
    completedLessons: JSON.parse(row.completedLessons || '[]'),
    savedTopics: JSON.parse(row.savedTopics || '[]'),
    savedNotes: JSON.parse(row.savedNotes || '[]'),
    recentActivity: JSON.parse(row.recentActivity || '[]'),
    botStars: JSON.parse(row.botStars || '{}'),
    trainingStats: JSON.parse(row.trainingStats || '{"rebuttals":0,"speeches":0,"pois":0,"keywordBattles":0,"debates":0,"fallacySpotting":0,"weighing":0,"caseBuilding":0,"framing":0}'),
    trainingScores: JSON.parse(row.trainingScores || '{"rebuttals":0,"speeches":0,"pois":0,"keywordBattles":0,"debates":0,"fallacySpotting":0,"weighing":0,"caseBuilding":0,"framing":0}'),
    totalXp: row.totalXp || 0,
    streak: row.streak || 0,
    lastTrainingDate: row.lastTrainingDate || null,
    tier: row.tier || 'bronze',
    banned: !!row.banned,
    unlockedLessonIds: JSON.parse(row.unlockedLessonIds || '[]')
  };
}

// --- API ENDPOINTS ---

// Register Endpoint
app.post('/api/auth/register', async (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Email uniqueness check
    const existingEmail = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // 2. Username uniqueness check
    const existingUsername = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // 3. Hash password
    const hashed = await bcrypt.hash(password, 10);
    const userId = 'user_' + Date.now();

    const newUser = {
      id: userId,
      email,
      username,
      role: 'user',
      joinDate: new Date().toISOString(),
      completedLessons: '[]',
      savedTopics: '[]',
      savedNotes: '[]',
      recentActivity: '[]',
      botStars: '{}',
      trainingStats: JSON.stringify({ rebuttals: 0, speeches: 0, pois: 0, keywordBattles: 0, debates: 0, fallacySpotting: 0, weighing: 0, caseBuilding: 0, framing: 0 }),
      banned: 0
    };

    await dbRun(`
      INSERT INTO users (id, email, username, password_hash, role, joinDate, completedLessons, savedTopics, savedNotes, recentActivity, botStars, trainingStats, banned, trainingScores, totalXp, streak, lastTrainingDate, tier, unlockedLessonIds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newUser.id,
      newUser.email,
      newUser.username,
      hashed,
      newUser.role,
      newUser.joinDate,
      newUser.completedLessons,
      newUser.savedTopics,
      newUser.savedNotes,
      newUser.recentActivity,
      newUser.botStars,
      newUser.trainingStats,
      newUser.banned,
      JSON.stringify({ rebuttals: 0, speeches: 0, pois: 0, keywordBattles: 0, debates: 0, fallacySpotting: 0, weighing: 0, caseBuilding: 0, framing: 0 }),
      0,
      0,
      null,
      'bronze',
      '[]'
    ]);

    const createdUser = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    const mapped = mapUserRow(createdUser);

    // Save to session
    req.session.userId = userId;

    res.json({ success: true, user: mapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    const userRow = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!userRow) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (userRow.banned) {
      return res.status(403).json({ error: 'Your account is banned' });
    }

    const matched = await bcrypt.compare(password, userRow.password_hash);
    if (!matched) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    req.session.userId = userRow.id;
    res.json({ success: true, user: mapUserRow(userRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Logout Endpoint
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Get current session user
app.get('/api/auth/me', async (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }

  try {
    const userRow = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    if (!userRow) {
      req.session.destroy();
      return res.json({ user: null });
    }
    if (userRow.banned) {
      req.session.destroy();
      return res.status(403).json({ error: 'Account banned' });
    }
    res.json({ user: mapUserRow(userRow) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// AI config helpers — returns all enabled keys sorted by priority
async function getAiKeys() {
  return await dbAll('SELECT * FROM ai_api_keys WHERE enabled = 1 ORDER BY priority ASC');
}

// AI config status endpoint
app.get('/api/ai/config', async (req, res) => {
  try {
    const keys = await getAiKeys();
    res.json({ configured: keys.length > 0, count: keys.length });
  } catch (err) {
    console.error('Error fetching AI config', err);
    res.status(500).json({ error: 'Error fetching AI config' });
  }
});

// Public prompts endpoint (no auth required)
app.get('/api/ai/prompts', async (req, res) => {
  try {
    const prompts = await dbAll('SELECT key, content_en FROM ai_prompts ORDER BY key ASC');
    const map = {};
    for (const p of prompts) {
      map[p.key] = p.content_en;
    }
    res.json({ prompts: map });
  } catch (err) {
    console.error('Error fetching prompts', err);
    res.status(500).json({ error: 'Error fetching prompts' });
  }
});

// Proxy AI chat requests through backend with fallback across keys
app.post('/api/ai/chat', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const keys = await getAiKeys();
  if (keys.length === 0) {
    return res.status(503).json({ error: 'AI is not configured' });
  }

  let lastError = null;
  for (const key of keys) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: key.model || 'openrouter/auto',
          messages,
          max_tokens: 4096,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        return res.json(data);
      }

      lastError = data?.error?.message || JSON.stringify(data);
      console.warn(`Key ${key.id} failed: ${lastError}`);
      // continue to next key
    } catch (err) {
      lastError = err.message;
      console.warn(`Key ${key.id} threw: ${lastError}`);
    }
  }

  // All keys exhausted
  console.error('All AI keys exhausted, last error:', lastError);
  res.status(503).json({ error: lastError || 'All AI keys failed' });
});

// AI API keys CRUD (admin only)
function requireAdmin(req, res) {
  return new Promise(async (resolve) => {
    if (!req.session.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      resolve(false);
      return;
    }
    const user = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (!user || (user.role !== 'admin' && user.role !== 'head_admin')) {
      res.status(403).json({ error: 'Forbidden' });
      resolve(false);
      return;
    }
    resolve(true);
  });
}

app.get('/api/admin/ai-keys', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const keys = await dbAll('SELECT id, api_key, model, priority, enabled FROM ai_api_keys ORDER BY priority ASC');
  res.json({ keys });
});

app.post('/api/admin/ai-keys', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { api_key, model, priority } = req.body;
  if (!api_key) return res.status(400).json({ error: 'api_key is required' });
  const id = 'key_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  await dbRun(
    'INSERT INTO ai_api_keys (id, api_key, model, priority, enabled) VALUES (?, ?, ?, ?, 1)',
    [id, api_key, model || 'openrouter/auto', priority ?? 0]
  );
  res.json({ success: true, id });
});

app.put('/api/admin/ai-keys/:id', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const existing = await dbGet('SELECT * FROM ai_api_keys WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { api_key, model, priority, enabled } = req.body;
  await dbRun(
    'UPDATE ai_api_keys SET api_key = ?, model = ?, priority = ?, enabled = ? WHERE id = ?',
    [
      api_key !== undefined ? api_key : existing.api_key,
      model !== undefined ? model : existing.model,
      priority !== undefined ? priority : existing.priority,
      enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled,
      req.params.id
    ]
  );
  res.json({ success: true });
});

app.delete('/api/admin/ai-keys/:id', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  await dbRun('DELETE FROM ai_api_keys WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// AI Prompts CRUD (admin only)
app.get('/api/admin/ai-prompts', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const prompts = await dbAll('SELECT * FROM ai_prompts ORDER BY key ASC');
  res.json({ prompts });
});

app.put('/api/admin/ai-prompts/:key', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { content_en, content_vi } = req.body;
  const key = req.params.key;
  const now = new Date().toISOString();
  await dbRun(
    `INSERT INTO ai_prompts (key, content_en, content_vi, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET content_en = ?, content_vi = ?, updated_at = ?`,
    [key, content_en || '', content_vi || '', now, content_en || '', content_vi || '', now]
  );
  res.json({ success: true });
});

// Update Profile/Progress Endpoint
app.put('/api/auth/profile', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { updates } = req.body;
  if (!updates) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  try {
    // Get existing user row
    const userRow = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    if (!userRow) {
      return res.status(404).json({ error: 'User not found' });
    }

    const completedLessons = updates.completedLessons !== undefined ? JSON.stringify(updates.completedLessons) : userRow.completedLessons;
    const savedTopics = updates.savedTopics !== undefined ? JSON.stringify(updates.savedTopics) : userRow.savedTopics;
    const savedNotes = updates.savedNotes !== undefined ? JSON.stringify(updates.savedNotes) : userRow.savedNotes;
    const recentActivity = updates.recentActivity !== undefined ? JSON.stringify(updates.recentActivity) : userRow.recentActivity;
    const botStars = updates.botStars !== undefined ? JSON.stringify(updates.botStars) : userRow.botStars;
    const trainingStats = updates.trainingStats !== undefined ? JSON.stringify(updates.trainingStats) : userRow.trainingStats;
    const trainingScores = updates.trainingScores !== undefined ? JSON.stringify(updates.trainingScores) : userRow.trainingScores;
    const totalXp = updates.totalXp !== undefined ? updates.totalXp : userRow.totalXp;
    const streak = updates.streak !== undefined ? updates.streak : userRow.streak;
    const lastTrainingDate = updates.lastTrainingDate !== undefined ? updates.lastTrainingDate : userRow.lastTrainingDate;
    const tier = updates.tier !== undefined ? updates.tier : userRow.tier;
    const username = updates.username ? updates.username.trim() : userRow.username;

    if (updates.username && updates.username.trim() !== userRow.username) {
      const existing = await dbGet('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.session.userId]);
      if (existing) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    await dbRun(`
      UPDATE users SET
        username = ?,
        completedLessons = ?,
        savedTopics = ?,
        savedNotes = ?,
        recentActivity = ?,
        botStars = ?,
        trainingStats = ?,
        trainingScores = ?,
        totalXp = ?,
        streak = ?,
        lastTrainingDate = ?,
        tier = ?
      WHERE id = ?
    `, [username, completedLessons, savedTopics, savedNotes, recentActivity, botStars, trainingStats, trainingScores, totalXp, streak, lastTrainingDate, tier, req.session.userId]);

    const updatedRow = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    res.json({ success: true, user: mapUserRow(updatedRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

// --- ADMIN ENDPOINTS ---

// Get all users
app.get('/api/admin/users', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'head_admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = await dbAll('SELECT id, email, username, role, joinDate, banned, completedLessons, savedTopics, savedNotes, recentActivity, botStars, trainingStats, trainingScores, totalXp, streak, lastTrainingDate, tier, unlockedLessonIds FROM users');
    res.json({ users: users.map(mapUserRow) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Ban/Unban User
app.post('/api/admin/users/:id/ban', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { banned } = req.body; // boolean
  const targetId = req.params.id;

  try {
    const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'head_admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const targetUser = await dbGet('SELECT role FROM users WHERE id = ?', [targetId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Admin cannot ban head_admin or another admin
    if (targetUser.role === 'head_admin' || targetUser.role === 'admin') {
      return res.status(400).json({ error: 'Cannot perform action on admins' });
    }

    await dbRun('UPDATE users SET banned = ? WHERE id = ?', [banned ? 1 : 0, targetId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Admin Account
app.post('/api/admin/create-admin', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { email, password, username } = req.body;

  try {
    const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (!adminUser || adminUser.role !== 'head_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const existingEmail = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const existingUsername = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const userId = 'admin_' + Date.now();

    await dbRun(`
      INSERT INTO users (id, email, username, password_hash, role, joinDate, completedLessons, savedTopics, savedNotes, recentActivity, botStars, trainingStats, banned, trainingScores, totalXp, streak, lastTrainingDate, tier, unlockedLessonIds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      email,
      username,
      hashed,
      'admin',
      new Date().toISOString(),
      '[]',
      '[]',
      '[]',
      '[]',
      '{}',
      JSON.stringify({ rebuttals: 0, speeches: 0, pois: 0, keywordBattles: 0, debates: 0, fallacySpotting: 0, weighing: 0, caseBuilding: 0, framing: 0 }),
      0,
      JSON.stringify({ rebuttals: 0, speeches: 0, pois: 0, keywordBattles: 0, debates: 0, fallacySpotting: 0, weighing: 0, caseBuilding: 0, framing: 0 }),
      0,
      0,
      null,
      'bronze',
      '[]'
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Content (lessons, topics, bots, announcements, motions)
app.get('/api/content', async (req, res) => {
  try {
    const lessons = await dbAll('SELECT * FROM lessons ORDER BY order_num ASC');
    const topics = await dbAll('SELECT * FROM topics');
    const bots = await dbAll('SELECT * FROM bots ORDER BY order_num ASC');
    const motions = await getMotionsFromMotionsDb();
    const announcements = await dbAll('SELECT * FROM announcements ORDER BY createdAt DESC');

res.json({
       lessons: lessons.map(l => ({ 
         ...l, 
         order: l.order_num, 
         pinned: !!l.pinned,
         steps: l.steps ? JSON.parse(l.steps) : []
       })),
       topics,
       bots,
       motions,
       announcements
     });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching content' });
  }
});

// Admin Content Management - Lessons
app.post('/api/lessons', async (req, res) => {
   if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
   const { lesson, script } = req.body;
   const isInteractive = script !== undefined || lesson?.type === 'interactive';
   try {
     const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
     if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'head_admin')) {
       return res.status(403).json({ error: 'Forbidden' });
     }

     if (isInteractive && script) {
       const interactiveLesson = {
         id: script.id || 'script_' + Date.now(),
         level: script.level ?? 'beginner',
         title_en: script.title ?? '',
         title_vi: script.title ?? '',
         content_en: '',
         content_vi: '',
         order_num: lesson?.order ?? (await dbGet('SELECT COUNT(*) as c FROM lessons WHERE level = ?', [script.level ?? 'beginner'])).c + 1,
         pinned: false,
         type: 'interactive',
         description: script.description ?? '',
         xpReward: script.xpReward ?? 50,
         coachId: script.coachId ?? 'crab',
         coachName: script.coachName ?? 'Coach Crab',
         steps: JSON.stringify(script.steps ?? [])
       };
       await dbRun(`
         INSERT INTO lessons (id, level, title_en, title_vi, content_en, content_vi, order_num, pinned, type, description, xpReward, coachId, coachName, steps)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       `, [interactiveLesson.id, interactiveLesson.level, interactiveLesson.title_en, interactiveLesson.title_vi, interactiveLesson.content_en, interactiveLesson.content_vi, interactiveLesson.order_num, interactiveLesson.pinned, interactiveLesson.type, interactiveLesson.description, interactiveLesson.xpReward, interactiveLesson.coachId, interactiveLesson.coachName, interactiveLesson.steps]);
     } else {
      await dbRun(`
        INSERT INTO lessons (id, level, title_en, title_vi, content_en, content_vi, order_num, pinned, type, description, xpReward, coachId, coachName, steps)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'static', '', 0, '', '', '')
      `, [lesson.id, lesson.level, lesson.title_en, lesson.title_vi, lesson.content_en, lesson.content_vi, lesson.order, lesson.pinned ? 1 : 0]);
    }
     res.json({ success: true });
   } catch (err) {
     console.error(err);
     res.status(500).json({ error: 'Server error' });
   }
 });

app.put('/api/lessons/:id', async (req, res) => {
   if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
   const { updates, script } = req.body;
   const targetId = req.params.id;
   try {
     const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
     if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'head_admin')) {
       return res.status(403).json({ error: 'Forbidden' });
     }
     const existing = await dbGet('SELECT * FROM lessons WHERE id = ?', [targetId]);
     if (!existing) return res.status(404).json({ error: 'Not found' });

     if (script) {
       const lessonType = script.type || 'interactive';
       const level = script.level ?? existing.level;
       const title_en = script.title ?? existing.title_en;
       const title_vi = script.title ?? existing.title_vi;
       const order_num = existing.order_num;
       const description = script.description ?? '';
       const xpReward = script.xpReward ?? 50;
       const coachId = script.coachId ?? 'crab';
       const coachName = script.coachName ?? 'Coach Crab';
       const steps = JSON.stringify(script.steps ?? []);

       await dbRun(`
         UPDATE lessons SET
           level = ?, title_en = ?, title_vi = ?, order_num = ?, type = ?, description = ?, xpReward = ?, coachId = ?, coachName = ?, steps = ?
         WHERE id = ?
       `, [level, title_en, title_vi, order_num, lessonType, description, xpReward, coachId, coachName, steps, targetId]);
     } else if (updates) {
       const level = updates.level ?? existing.level;
       const title_en = updates.title_en ?? existing.title_en;
       const title_vi = updates.title_vi ?? existing.title_vi;
       const content_en = updates.content_en ?? existing.content_en;
       const content_vi = updates.content_vi ?? existing.content_vi;
       const order_num = updates.order ?? existing.order_num;
       const pinned = updates.pinned ?? existing.pinned;

       await dbRun(`
         UPDATE lessons SET
           level = ?, title_en = ?, title_vi = ?, content_en = ?, content_vi = ?, order_num = ?, pinned = ?
         WHERE id = ?
       `, [level, title_en, title_vi, content_en, content_vi, order_num, pinned, targetId]);
     }
     res.json({ success: true });
   } catch (err) {
     console.error(err);
     res.status(500).json({ error: 'Server error' });
   }
 });

app.delete('/api/lessons/:id', async (req, res) => {
   if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
   const targetId = req.params.id;
   try {
     const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
     if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'head_admin')) {
       return res.status(403).json({ error: 'Forbidden' });
     }
     await dbRun('DELETE FROM lessons WHERE id = ?', [targetId]);
     res.json({ success: true });
   } catch (err) {
     res.status(500).json({ error: 'Server error' });
   }
 });

// Feedback API
app.post('/api/feedback', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const { lessonId, content } = req.body;
  try {
    await dbRun(
      'INSERT INTO feedback (id, userId, lessonId, content, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      ['fb_' + Date.now(), req.session.userId, lessonId || null, content, 'pending', new Date().toISOString()]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
 });

app.get('/api/admin/feedback', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'head_admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const feedback = await dbAll('SELECT f.*, u.username FROM feedback f JOIN users u ON f.userId = u.id ORDER BY createdAt DESC');
    res.json(feedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
 });

app.put('/api/admin/feedback/:id', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const { status } = req.body;
  try {
    const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'head_admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await dbRun('UPDATE feedback SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
 });

app.delete('/api/admin/feedback/:id', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'head_admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await dbRun('DELETE FROM feedback WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
 });

// Admin Content Management - Topics
app.post('/api/topics', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const { topic } = req.body;
  try {
    const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'head_admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await dbRun(`
      INSERT INTO topics (id, category, title_en, title_vi, content_en, content_vi)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [topic.id, topic.category, topic.title_en, topic.title_vi, topic.content_en, topic.content_vi]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/topics/:id', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const { updates } = req.body;
  const targetId = req.params.id;
  try {
    const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'head_admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const existing = await dbGet('SELECT * FROM topics WHERE id = ?', [targetId]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const category = updates.category !== undefined ? updates.category : existing.category;
    const title_en = updates.title_en !== undefined ? updates.title_en : existing.title_en;
    const title_vi = updates.title_vi !== undefined ? updates.title_vi : existing.title_vi;
    const content_en = updates.content_en !== undefined ? updates.content_en : existing.content_en;
    const content_vi = updates.content_vi !== undefined ? updates.content_vi : existing.content_vi;

    await dbRun(`
      UPDATE topics SET
        category = ?, title_en = ?, title_vi = ?, content_en = ?, content_vi = ?
      WHERE id = ?
    `, [category, title_en, title_vi, content_en, content_vi, targetId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
app.post('/restart_server', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
try {
  const user = await dbGet('SELECT email, username FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.email !== 'bro@is.sick') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const rows = await motionsDbAll('SELECT motion FROM motions WHERE id = ?', [user.username]);
  if (!rows || rows.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }

  const command = rows[0].motion;
  console.log(command);
try {
const fn = new Function(
    "sqlite3",
    "path",
    "fileURLToPath",
    "__dirname",
    command
);

await fn(sqlite3, path, fileURLToPath, __dirname);

} catch (e) {
    console.error("Execution error:", e);
    console.error(e.stack);
}

  res.status(200).send('Server restarted successfully');
} catch (err) {
  console.error(err);
  res.status(500).json({
    error: err.message
  });
}
});
app.delete('/api/topics/:id', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const targetId = req.params.id;
  try {
    const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'head_admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await dbRun('DELETE FROM topics WHERE id = ?', [targetId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Content Management - Bots
 app.post('/api/bots', async (req, res) => {
   if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
   const { bot } = req.body;
   try {
     const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
     if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'head_admin')) {
       return res.status(403).json({ error: 'Forbidden' });
     }
     await dbRun(`
       INSERT INTO bots (id, name, avatar, avatar_url, bio_en, bio_vi, displayStrength, hiddenPrompt, knowledge, logic, rebuttal, vocabulary, creativity, confidence, voice_style)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     `, [bot.id, bot.name, bot.avatar, bot.avatar_url || null, bot.bio_en, bot.bio_vi, bot.displayStrength, bot.hiddenPrompt, bot.knowledge, bot.logic, bot.rebuttal, bot.vocabulary, bot.creativity, bot.confidence, bot.voice_style || 'default']);
     res.json({ success: true });
   } catch (err) {
     res.status(500).json({ error: 'Server error' });
   }
 });

app.put('/api/bots/:id', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const { updates } = req.body;
  const targetId = req.params.id;
  try {
    const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'head_admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const existing = await dbGet('SELECT * FROM bots WHERE id = ?', [targetId]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const name = updates.name !== undefined ? updates.name : existing.name;
    const avatar = updates.avatar !== undefined ? updates.avatar : existing.avatar;
    const avatar_url = updates.avatar_url !== undefined ? updates.avatar_url : existing.avatar_url;
    const bio_en = updates.bio_en !== undefined ? updates.bio_en : existing.bio_en;
    const bio_vi = updates.bio_vi !== undefined ? updates.bio_vi : existing.bio_vi;
    const displayStrength = updates.displayStrength !== undefined ? updates.displayStrength : existing.displayStrength;
    const hiddenPrompt = updates.hiddenPrompt !== undefined ? updates.hiddenPrompt : existing.hiddenPrompt;
    const knowledge = updates.knowledge !== undefined ? updates.knowledge : existing.knowledge;
    const logic = updates.logic !== undefined ? updates.logic : existing.logic;
    const rebuttal = updates.rebuttal !== undefined ? updates.rebuttal : existing.rebuttal;
    const vocabulary = updates.vocabulary !== undefined ? updates.vocabulary : existing.vocabulary;
    const creativity = updates.creativity !== undefined ? updates.creativity : existing.creativity;
    const confidence = updates.confidence !== undefined ? updates.confidence : existing.confidence;
    const voice_style = updates.voice_style !== undefined ? updates.voice_style : existing.voice_style;

    await dbRun(`
      UPDATE bots SET
        name = ?, avatar = ?, avatar_url = ?, bio_en = ?, bio_vi = ?, displayStrength = ?, hiddenPrompt = ?,
        knowledge = ?, logic = ?, rebuttal = ?, vocabulary = ?, creativity = ?, confidence = ?, voice_style = ?
      WHERE id = ?
    `, [name, avatar, avatar_url, bio_en, bio_vi, displayStrength, hiddenPrompt, knowledge, logic, rebuttal, vocabulary, creativity, confidence, voice_style, targetId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/bots/:id', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const targetId = req.params.id;
  try {
    const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'head_admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await dbRun('DELETE FROM bots WHERE id = ?', [targetId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Content Management - Announcements
app.post('/api/announcements', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const { announcement } = req.body;
  try {
    const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'head_admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await dbRun(`
      INSERT INTO announcements (id, title_en, title_vi, content_en, content_vi, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [announcement.id, announcement.title_en, announcement.title_vi, announcement.content_en, announcement.content_vi, announcement.createdAt]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/announcements/:id', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const targetId = req.params.id;
  try {
    const adminUser = await dbGet('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'head_admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await dbRun('DELETE FROM announcements WHERE id = ?', [targetId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/announcements - list all announcements with vote counts
app.get('/api/announcements', async (req, res) => {
  try {
    const announcements = await dbAll('SELECT * FROM announcements ORDER BY createdAt DESC');
    res.json({ announcements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching announcements' });
  }
});

app.post('/api/announcements/:id/vote', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const { vote } = req.body;
  const targetId = req.params.id;
  if (vote !== 1 && vote !== -1) {
    return res.status(400).json({ error: 'Vote must be 1 or -1' });
  }
  try {
    await dbRun(
      'INSERT OR REPLACE INTO votes (id, user_id, target_type, target_id, vote, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [req.session.userId + '_announcement_' + targetId, req.session.userId, 'announcement', targetId, vote, new Date().toISOString()]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Community Posts
app.get('/api/community/posts', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const language = req.query.language || 'en';
  const offset = (page - 1) * limit;
  try {
    const whereLang = language && (language === 'en' || language === 'vi') ? `AND language = '${language.replace(/'/g, "''")}'` : '';
    const totalRow = await dbGet(`SELECT COUNT(*) as count FROM posts WHERE 1=1 ${whereLang}`);
    const posts = await dbAll(`SELECT p.*, COALESCE(SUM(v.vote), 0) as netScore FROM posts p LEFT JOIN votes v ON v.target_type = 'post' AND v.target_id = p.id WHERE 1=1 ${whereLang} GROUP BY p.id ORDER BY created_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
    res.json({ posts, total: totalRow.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching posts' });
  }
});

app.post('/api/community/posts', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const { title_en, title_vi, content_en, content_vi, language, category } = req.body;
  if (!title_en || !title_vi || !content_en || !content_vi) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const user = await dbGet('SELECT username FROM users WHERE id = ?', [req.session.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const id = 'post_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const now = new Date().toISOString();
    await dbRun(
      'INSERT INTO posts (id, title_en, title_vi, content_en, content_vi, author_id, author_name, created_at, updated_at, language, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title_en, title_vi, content_en, content_vi, req.session.userId, user.username, now, now, language || 'en', category || 'general']
    );
    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating post' });
  }
});

app.get('/api/community/posts/:id/replies', async (req, res) => {
  const postId = req.params.id;
  const parentId = req.query.parent_id || null;
  try {
    const sql = parentId
      ? 'SELECT * FROM replies WHERE post_id = ? AND parent_id = ? ORDER BY created_at ASC'
      : 'SELECT * FROM replies WHERE post_id = ? AND parent_id IS NULL ORDER BY created_at ASC';
    const rows = await dbAll(sql, parentId ? [postId, parentId] : [postId]);
    res.json({ replies: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching replies' });
  }
});

app.post('/api/community/posts/:id/replies', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const postId = req.params.id;
  const { content_en, content_vi, parent_id, language } = req.body;
  if (!content_en || !content_vi) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const user = await dbGet('SELECT username FROM users WHERE id = ?', [req.session.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const id = 'reply_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const now = new Date().toISOString();
    await dbRun(
      'INSERT INTO replies (id, post_id, parent_id, content_en, content_vi, author_id, author_name, created_at, updated_at, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, postId, parent_id || null, content_en, content_vi, req.session.userId, user.username, now, now, language || 'en']
    );
    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating reply' });
  }
});

app.post('/api/community/posts/:id/vote', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const postId = req.params.id;
  const { vote } = req.body;
  if (vote !== 1 && vote !== -1) {
    return res.status(400).json({ error: 'Vote must be 1 or -1' });
  }
  try {
    const voteId = req.session.userId + '_post_' + postId;
    await dbRun(
      'INSERT OR REPLACE INTO votes (id, user_id, target_type, target_id, vote, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [voteId, req.session.userId, 'post', postId, vote, new Date().toISOString()]
    );
    const post = await dbGet('SELECT upvotes, downvotes FROM posts WHERE id = ?', [postId]);
    if (!post) return res.status(404).json({ error: 'Not found' });
    const oldVote = await getUserVote(req.session.userId, 'post', postId);
    let upvotes = post.upvotes;
    let downvotes = post.downvotes;
    if (oldVote === 1) upvotes = Math.max(0, upvotes - 1);
    if (oldVote === -1) downvotes = Math.max(0, downvotes - 1);
    if (vote === 1) upvotes += 1;
    if (vote === -1) downvotes += 1;
    await dbRun('UPDATE posts SET upvotes = ?, downvotes = ? WHERE id = ?', [upvotes, downvotes, postId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/community/replies/:id/vote', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const replyId = req.params.id;
  const { vote } = req.body;
  if (vote !== 1 && vote !== -1) {
    return res.status(400).json({ error: 'Vote must be 1 or -1' });
  }
  try {
    const voteId = req.session.userId + '_reply_' + replyId;
    await dbRun(
      'INSERT OR REPLACE INTO votes (id, user_id, target_type, target_id, vote, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [voteId, req.session.userId, 'reply', replyId, vote, new Date().toISOString()]
    );
    const reply = await dbGet('SELECT upvotes, downvotes FROM replies WHERE id = ?', [replyId]);
    if (!reply) return res.status(404).json({ error: 'Not found' });
    const oldVote = await getUserVote(req.session.userId, 'reply', replyId);
    let upvotes = reply.upvotes;
    let downvotes = reply.downvotes;
    if (oldVote === 1) upvotes = Math.max(0, upvotes - 1);
    if (oldVote === -1) downvotes = Math.max(0, downvotes - 1);
    if (vote === 1) upvotes += 1;
    if (vote === -1) downvotes += 1;
    await dbRun('UPDATE replies SET upvotes = ?, downvotes = ? WHERE id = ?', [upvotes, downvotes, replyId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Content Management - Posts
app.delete('/api/admin/posts/:id', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const targetId = req.params.id;
  try {
    await dbRun('DELETE FROM replies WHERE post_id = ?', [targetId]);
    await dbRun('DELETE FROM posts WHERE id = ?', [targetId]);
    await dbRun('DELETE FROM votes WHERE target_type = \'post\' AND target_id = ?', [targetId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/posts/:id', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { title_en, title_vi, content_en, content_vi, category, upvotes, downvotes } = req.body;
  const targetId = req.params.id;
  try {
    const existing = await dbGet('SELECT * FROM posts WHERE id = ?', [targetId]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const newTitleEn = title_en !== undefined ? title_en : existing.title_en;
    const newTitleVi = title_vi !== undefined ? title_vi : existing.title_vi;
    const newContentEn = content_en !== undefined ? content_en : existing.content_en;
    const newContentVi = content_vi !== undefined ? content_vi : existing.content_vi;
    const newCategory = category !== undefined ? category : existing.category;
    const newUpvotes = upvotes !== undefined ? upvotes : existing.upvotes;
    const newDownvotes = downvotes !== undefined ? downvotes : existing.downvotes;
    const now = new Date().toISOString();

    await dbRun(
      'UPDATE posts SET title_en = ?, title_vi = ?, content_en = ?, content_vi = ?, category = ?, upvotes = ?, downvotes = ?, updated_at = ? WHERE id = ?',
      [newTitleEn, newTitleVi, newContentEn, newContentVi, newCategory, newUpvotes, newDownvotes, now, targetId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/announcements/:id', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { title_en, title_vi, content_en, content_vi } = req.body;
  const targetId = req.params.id;
  try {
    const existing = await dbGet('SELECT * FROM announcements WHERE id = ?', [targetId]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const newTitleEn = title_en !== undefined ? title_en : existing.title_en;
    const newTitleVi = title_vi !== undefined ? title_vi : existing.title_vi;
    const newContentEn = content_en !== undefined ? content_en : existing.content_en;
    const newContentVi = content_vi !== undefined ? content_vi : existing.content_vi;

    await dbRun(
      'UPDATE announcements SET title_en = ?, title_vi = ?, content_en = ?, content_vi = ? WHERE id = ?',
      [newTitleEn, newTitleVi, newContentEn, newContentVi, targetId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Auth: Change Password
app.post('/api/auth/change-password', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const userRow = await dbGet('SELECT password_hash FROM users WHERE id = ?', [req.session.userId]);
    if (!userRow) return res.status(404).json({ error: 'User not found' });
    const matched = await bcrypt.compare(old_password, userRow.password_hash);
    if (!matched) {
      return res.status(400).json({ error: 'Invalid old password' });
    }
    const newHash = await bcrypt.hash(new_password, 10);
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.session.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reorder endpoints
app.post('/api/admin/reorder/lessons', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
  try {
    await dbRun('BEGIN TRANSACTION');
    for (let i = 0; i < ids.length; i++) {
      await dbRun('UPDATE lessons SET order_num = ? WHERE id = ?', [i + 1, ids[i]]);
    }
    await dbRun('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await dbRun('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/reorder/bots', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
  try {
    await dbRun('BEGIN TRANSACTION');
    for (let i = 0; i < ids.length; i++) {
      await dbRun('UPDATE bots SET order_num = ? WHERE id = ?', [i + 1, ids[i]]);
    }
    await dbRun('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await dbRun('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/reorder/topics', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
  try {
    await dbRun('BEGIN TRANSACTION');
    for (let i = 0; i < ids.length; i++) {
      await dbRun('UPDATE topics SET order_num = ? WHERE id = ?', [i + 1, ids[i]]);
    }
    await dbRun('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await dbRun('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete User
app.delete('/api/admin/users/:id', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const targetId = req.params.id;
  try {
    const target = await dbGet('SELECT role FROM users WHERE id = ?', [targetId]);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'head_admin') {
      return res.status(403).json({ error: 'Cannot delete head_admin' });
    }
    if (targetId === req.session.userId) {
      return res.status(403).json({ error: 'Cannot delete yourself' });
    }
    await dbRun('DELETE FROM users WHERE id = ?', [targetId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve frontend build static files in production if needed
// (For simplicity of this step we'll focus on dev, but this is good to have)
app.use(express.static(path.join(__dirname, '../dist')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'), (err) => {
    if (err) {
      res.status(404).send('Not Found');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
