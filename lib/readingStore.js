import { ensureSchema, sql } from "./db";

const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_OFFSETS = [1, 3, 7, 14];
const BOOK_STATUS = ["想读", "在读", "读完"];
const MONTHLY_TARGET_PAGES = 600;
const MONTHLY_TARGET_MINUTES = 1200;

const THEME_BOOKS = {
  效率: ["深度工作", "掌控习惯", "搞定", "每周工作 4 小时"],
  写作: ["写作是门手艺", "金字塔原理", "风格感觉", "一本小小的红色写作书"],
  心理: ["思考，快与慢", "自卑与超越", "蛤蟆先生去看心理医生", "认知觉醒"],
  创业: ["精益创业", "从 0 到 1", "增长黑客", "启示录"],
};

function dayStamp(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function getLastDays(days) {
  return Array.from({ length: days }, (_, index) => {
    const offset = days - index - 1;
    return dayStamp(Date.now() - offset * DAY_MS);
  });
}

function plusDaysIso(days) {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

function mapBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    status: row.status,
    progress: row.progress,
    totalPages: row.total_pages,
    theme: row.theme,
  };
}

function mapCheckin(row) {
  return {
    id: row.id,
    date: row.date,
    bookId: row.book_id,
    pages: row.pages,
    minutes: row.minutes,
  };
}

function mapQuote(row) {
  return {
    id: row.id,
    bookId: row.book_id,
    text: row.text,
    note: row.note,
    sourcePage: row.source_page,
    reviewStage: row.review_stage,
    nextReviewAt: row.next_review_at,
    createdAt: row.created_at,
  };
}

function mapNote(row) {
  return {
    id: row.id,
    bookId: row.book_id,
    chapter: row.chapter,
    summary: row.summary,
    action: row.action,
    createdAt: row.created_at,
  };
}

function buildGraph(notes, books) {
  return notes.slice(-8).map((note) => {
    const book = books.find((item) => item.id === note.bookId);
    return {
      id: note.id,
      link: `${book?.title || "未知书籍"} -> 第${note.chapter}章 -> ${note.action}`,
    };
  });
}

function getRemainingPages(book) {
  const totalPages = Number(book?.totalPages || 0);
  const progress = Math.max(0, Math.min(100, Number(book?.progress || 0)));
  return Math.max(0, Math.ceil(totalPages * (1 - progress / 100)));
}

function getRecentAverage(checkins) {
  const recent = checkins
    .filter((item) => Date.now() - new Date(item.date).getTime() <= DAY_MS * 7)
    .filter((item) => Number(item.pages || 0) > 0 && Number(item.minutes || 0) > 0);

  if (!recent.length) {
    return { pages: 24, minutes: 32, pace: 0.75 };
  }

  const pages = recent.reduce((acc, item) => acc + Number(item.pages || 0), 0);
  const minutes = recent.reduce((acc, item) => acc + Number(item.minutes || 0), 0);
  return {
    pages: Math.max(12, Math.round(pages / recent.length)),
    minutes: Math.max(15, Math.round(minutes / recent.length)),
    pace: pages / minutes,
  };
}

function getFocusBook(books, checkins) {
  const readingBooks = books.filter((book) => book.status === "在读" && getRemainingPages(book) > 0);
  if (!readingBooks.length) {
    return books.find((book) => book.status === "想读") || books[0] || null;
  }

  const latestCheckin = checkins
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .find((item) => readingBooks.some((book) => book.id === item.bookId));

  if (latestCheckin) {
    return readingBooks.find((book) => book.id === latestCheckin.bookId);
  }

  return readingBooks.slice().sort((a, b) => Number(b.progress || 0) - Number(a.progress || 0))[0];
}

function calcStreak(checkins) {
  const days = Array.from(new Set(checkins.map((item) => dayStamp(item.date)))).sort();
  if (!days.length) {
    return 0;
  }

  let streak = 0;
  let cursor = new Date();

  while (true) {
    const stamp = dayStamp(cursor);
    if (days.includes(stamp)) {
      streak += 1;
      cursor = new Date(cursor.getTime() - DAY_MS);
      continue;
    }

    if (streak === 0) {
      cursor = new Date(cursor.getTime() - DAY_MS);
      const yesterday = dayStamp(cursor);
      if (days.includes(yesterday)) {
        streak = 1;
        cursor = new Date(cursor.getTime() - DAY_MS);
        continue;
      }
    }

    break;
  }

  return streak;
}

function calcStats({ books, checkins, notes, quotes }) {
  const readingCount = books.filter((book) => book.status === "在读").length;
  const finishedCount = books.filter((book) => book.status === "读完").length;
  const totalMinutes = checkins.reduce((acc, item) => acc + Number(item.minutes || 0), 0);
  const totalPages = checkins.reduce((acc, item) => acc + Number(item.pages || 0), 0);
  const xp = totalMinutes + notes.length * 8 + quotes.length * 5;

  const badges = [];
  if (calcStreak(checkins) >= 3) badges.push("连读达人");
  if (finishedCount >= 1) badges.push("完读徽章");
  if (quotes.length >= 3) badges.push("金句收藏家");
  if (xp >= 180) badges.push("阅读探险家");

  return {
    readingCount,
    finishedCount,
    totalMinutes,
    totalPages,
    xp,
    badges,
  };
}

async function seedUser(userId) {
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM books WHERE user_id = ${userId}`;
  if (count > 0) {
    return;
  }

  const [deepWork] = await sql`
    INSERT INTO books (user_id, title, author, status, progress, total_pages, theme)
    VALUES (${userId}, '深度工作', '卡尔·纽波特', '在读', 42, 304, '效率')
    RETURNING id
  `;
  const [thinking] = await sql`
    INSERT INTO books (user_id, title, author, status, progress, total_pages, theme)
    VALUES (${userId}, '思考，快与慢', '丹尼尔·卡尼曼', '想读', 0, 499, '心理')
    RETURNING id
  `;
  const [writing] = await sql`
    INSERT INTO books (user_id, title, author, status, progress, total_pages, theme)
    VALUES (${userId}, '写作是门手艺', '刘军强', '读完', 100, 321, '写作')
    RETURNING id
  `;

  await sql`
    INSERT INTO checkins (user_id, date, book_id, pages, minutes)
    VALUES
      (${userId}, NOW() - INTERVAL '2 days', ${deepWork.id}, 18, 35),
      (${userId}, NOW() - INTERVAL '1 day', ${deepWork.id}, 26, 45)
  `;
  await sql`
    INSERT INTO quotes (user_id, book_id, text, note, source_page, review_stage, next_review_at, created_at)
    VALUES
      (${userId}, ${deepWork.id}, '对重要之事越清晰，对不重要之事就越果断。', '先把注意力预算写下来。', 81, 1, NOW() + INTERVAL '1 day', NOW() - INTERVAL '3 days'),
      (${userId}, ${writing.id}, '写作是思考的外化。', '先写草稿，再删减三成。', 14, 2, NOW() + INTERVAL '3 days', NOW() - INTERVAL '5 days')
  `;
  await sql`
    INSERT INTO notes (user_id, book_id, chapter, summary, action)
    VALUES
      (${userId}, ${deepWork.id}, 4, '注意力残留会切碎专注，浅层任务要集中处理。', '明早安排 90 分钟深度工作时段。'),
      (${userId}, ${writing.id}, 2, '好文字的核心是减少读者阻力。', '发布前强制做一次删改轮。')
  `;
  await sql`
    INSERT INTO todos (user_id, text, done, priority, book_id)
    VALUES
      (${userId}, '给《深度工作》做一次 20 分钟章节复盘', FALSE, '高', ${deepWork.id}),
      (${userId}, '整理本周 3 条可执行摘录', FALSE, '中', NULL)
  `;
  await sql`
    INSERT INTO share_profiles (user_id, slug, display_name)
    VALUES (${userId}, ${userId}, '我的阅读实验室')
    ON CONFLICT (user_id) DO NOTHING
  `;
  void thinking;
}

async function prepareUser(userId) {
  await ensureSchema();
  await seedUser(userId);
}

function makeShareSlug(userId) {
  return userId.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "reader";
}

async function getData(userId) {
  await prepareUser(userId);
  const [booksRows, checkinRows, quoteRows, noteRows] = await Promise.all([
    sql`SELECT * FROM books WHERE user_id = ${userId} ORDER BY id ASC`,
    sql`SELECT * FROM checkins WHERE user_id = ${userId} ORDER BY date DESC`,
    sql`SELECT * FROM quotes WHERE user_id = ${userId} ORDER BY created_at DESC`,
    sql`SELECT * FROM notes WHERE user_id = ${userId} ORDER BY created_at DESC`,
  ]);

  return {
    books: booksRows.map(mapBook),
    checkins: checkinRows.map(mapCheckin),
    quotes: quoteRows.map(mapQuote),
    notes: noteRows.map(mapNote),
  };
}

async function ensureBook(userId, id) {
  await prepareUser(userId);
  const [row] = await sql`SELECT * FROM books WHERE user_id = ${userId} AND id = ${id}`;
  return row ? mapBook(row) : null;
}

export async function getDashboard(userId = "demo") {
  const data = await getData(userId);
  const dueQuotes = data.quotes
    .filter((item) => new Date(item.nextReviewAt).getTime() <= Date.now())
    .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime());

  return {
    ...data,
    dueQuotes,
    streak: calcStreak(data.checkins),
    stats: calcStats(data),
    graphLinks: buildGraph(data.notes, data.books),
    themes: Object.keys(THEME_BOOKS),
  };
}

export async function listBooks(userId = "demo") {
  const data = await getData(userId);
  return data.books;
}

export async function createBook(input, userId = "demo") {
  await prepareUser(userId);
  const title = String(input.title || "").trim();
  const author = String(input.author || "").trim();
  const totalPages = Number(input.totalPages || 0);

  if (!title || !author || !Number.isInteger(totalPages) || totalPages <= 0) {
    return { error: "请填写书名、作者和正确页数" };
  }

  const [row] = await sql`
    INSERT INTO books (user_id, title, author, status, progress, total_pages, theme)
    VALUES (${userId}, ${title}, ${author}, ${BOOK_STATUS.includes(input.status) ? input.status : "想读"}, 0, ${totalPages}, ${String(input.theme || "效率")})
    RETURNING *
  `;

  return { book: mapBook(row) };
}

export async function updateBook(id, patch, userId = "demo") {
  const book = await ensureBook(userId, id);
  if (!book) {
    return { error: "书籍不存在" };
  }

  const status = typeof patch.status === "string" && BOOK_STATUS.includes(patch.status) ? patch.status : book.status;
  let progress = book.progress;
  if (Number.isFinite(Number(patch.progress))) {
    progress = Math.max(0, Math.min(100, Math.round(Number(patch.progress))));
  }
  const nextStatus = progress === 100 ? "读完" : status;
  const theme = typeof patch.theme === "string" && patch.theme.trim() ? patch.theme.trim() : book.theme;

  const [row] = await sql`
    UPDATE books
    SET status = ${nextStatus}, progress = ${progress}, theme = ${theme}
    WHERE user_id = ${userId} AND id = ${id}
    RETURNING *
  `;

  return { book: mapBook(row) };
}

export async function deleteBook(id, userId = "demo") {
  await prepareUser(userId);
  const rows = await sql`DELETE FROM books WHERE user_id = ${userId} AND id = ${id} RETURNING id`;
  if (!rows.length) {
    return { error: "书籍不存在" };
  }

  return { success: true };
}

export async function addCheckin(input, userId = "demo") {
  const bookId = Number(input.bookId);
  const pages = Number(input.pages);
  const minutes = Number(input.minutes);

  if (!Number.isInteger(bookId) || !(await ensureBook(userId, bookId))) {
    return { error: "请选择有效书籍" };
  }

  if (!Number.isInteger(pages) || pages <= 0 || !Number.isInteger(minutes) || minutes <= 0) {
    return { error: "页数和时长必须是正整数" };
  }

  const [row] = await sql`
    INSERT INTO checkins (user_id, book_id, pages, minutes)
    VALUES (${userId}, ${bookId}, ${pages}, ${minutes})
    RETURNING *
  `;

  return { checkin: mapCheckin(row) };
}

export async function listCheckins(userId = "demo") {
  const data = await getData(userId);
  return data.checkins;
}

export async function addQuote(input, userId = "demo") {
  const bookId = Number(input.bookId);
  const text = String(input.text || "").trim();
  const note = String(input.note || "").trim();
  const sourcePage = Number(input.sourcePage || 0);

  if (!Number.isInteger(bookId) || !(await ensureBook(userId, bookId))) {
    return { error: "请选择有效书籍" };
  }

  if (!text) {
    return { error: "请填写摘录内容" };
  }

  if (!Number.isInteger(sourcePage) || sourcePage <= 0) {
    return { error: "页码必须是正整数" };
  }

  const [row] = await sql`
    INSERT INTO quotes (user_id, book_id, text, note, source_page, review_stage, next_review_at)
    VALUES (${userId}, ${bookId}, ${text}, ${note}, ${sourcePage}, 0, ${plusDaysIso(REVIEW_OFFSETS[0])})
    RETURNING *
  `;

  return { quote: mapQuote(row) };
}

export async function listQuotes(userId = "demo") {
  const data = await getData(userId);
  return data.quotes;
}

export async function reviewQuote(id, remembered, userId = "demo") {
  await prepareUser(userId);
  const [quote] = await sql`SELECT * FROM quotes WHERE user_id = ${userId} AND id = ${id}`;
  if (!quote) {
    return { error: "摘录不存在" };
  }

  const nextStage = remembered ? Math.min(quote.review_stage + 1, REVIEW_OFFSETS.length - 1) : 0;
  const [row] = await sql`
    UPDATE quotes
    SET review_stage = ${nextStage}, next_review_at = ${plusDaysIso(REVIEW_OFFSETS[nextStage])}
    WHERE user_id = ${userId} AND id = ${id}
    RETURNING *
  `;

  return { quote: mapQuote(row) };
}

export async function addNote(input, userId = "demo") {
  const bookId = Number(input.bookId);
  const chapter = Number(input.chapter);
  const summary = String(input.summary || "").trim();
  const action = String(input.action || "").trim();

  if (!Number.isInteger(bookId) || !(await ensureBook(userId, bookId))) {
    return { error: "请选择有效书籍" };
  }

  if (!Number.isInteger(chapter) || chapter <= 0) {
    return { error: "章节必须是正整数" };
  }

  if (!summary || !action) {
    return { error: "请填写总结与行动" };
  }

  const [row] = await sql`
    INSERT INTO notes (user_id, book_id, chapter, summary, action)
    VALUES (${userId}, ${bookId}, ${chapter}, ${summary}, ${action})
    RETURNING *
  `;

  return { note: mapNote(row) };
}

export async function listNotes(userId = "demo") {
  const data = await getData(userId);
  return data.notes;
}

export async function getPrompts(bookId, userId = "demo") {
  const book = (await ensureBook(userId, bookId)) || (await listBooks(userId))[0];
  if (!book) {
    return [];
  }

  return [
    `《${book.title}》本周改变了你哪一个具体行为？`,
    `如果你要在 3 分钟内讲清《${book.title}》的核心观点，你会保留哪三点？`,
    `这本书里哪条观点与你当前习惯冲突？明天你准备做什么最小实验？`,
    `《${book.title}》里哪一处论证你仍不完全相信？你会如何验证？`,
    `这本书与最近读过的另一本书有什么可以互相印证的地方？`,
  ];
}

export function getRecommendations(theme) {
  const key = String(theme || "").trim();
  return THEME_BOOKS[key] || [];
}

export async function getDiscussionKit(bookId, userId = "demo") {
  const book = (await ensureBook(userId, bookId)) || (await listBooks(userId))[0];
  if (!book) {
    return null;
  }

  return {
    topic: `《${book.title}》每周共读讨论`,
    questions: [
      `你认为《${book.title}》里最有说服力的一点是什么？为什么？`,
      "哪一个观点听起来很美，但在现实中可能有风险？",
      "下周前每个人都可以执行的一个具体行动是什么？",
    ],
    poll: {
      question: "这一章的可执行性如何？",
      options: ["很强，立刻可用", "一般，需要改造", "偏理论，暂不落地"],
    },
  };
}

export async function getInsights(userId = "demo") {
  const data = await getData(userId);
  const days = getLastDays(7);
  const trend = days.map((date) => {
    const dayItems = data.checkins.filter((item) => dayStamp(item.date) === date);
    const pages = dayItems.reduce((acc, item) => acc + Number(item.pages || 0), 0);
    const minutes = dayItems.reduce((acc, item) => acc + Number(item.minutes || 0), 0);
    return { date, pages, minutes };
  });
  const calendar = getLastDays(28).map((date) => {
    const dayItems = data.checkins.filter((item) => dayStamp(item.date) === date);
    const pages = dayItems.reduce((acc, item) => acc + Number(item.pages || 0), 0);
    const minutes = dayItems.reduce((acc, item) => acc + Number(item.minutes || 0), 0);
    let level = 0;
    if (pages >= 60 || minutes >= 90) level = 4;
    else if (pages >= 35 || minutes >= 55) level = 3;
    else if (pages >= 15 || minutes >= 25) level = 2;
    else if (pages > 0 || minutes > 0) level = 1;
    return { date, pages, minutes, level };
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthlyCheckins = data.checkins.filter((item) => {
    const time = new Date(item.date);
    return time.getFullYear() === currentYear && time.getMonth() === currentMonth;
  });

  const monthlyPages = monthlyCheckins.reduce((acc, item) => acc + Number(item.pages || 0), 0);
  const monthlyMinutes = monthlyCheckins.reduce((acc, item) => acc + Number(item.minutes || 0), 0);
  const pagesRate = Math.min(100, Math.round((monthlyPages / MONTHLY_TARGET_PAGES) * 100));
  const minutesRate = Math.min(100, Math.round((monthlyMinutes / MONTHLY_TARGET_MINUTES) * 100));
  const activeDays = calendar.filter((item) => item.level > 0).length;
  const consistencyScore = Math.round((activeDays / calendar.length) * 100);
  const bestDay = calendar
    .slice()
    .sort((a, b) => b.pages + b.minutes / 2 - (a.pages + a.minutes / 2))[0];

  const streak = calcStreak(data.checkins);
  let suggestion = "先把今天的 20 分钟读完，连续性比强度更重要。";
  if (streak >= 7) {
    suggestion = "你已进入稳定节奏，建议把复盘笔记升级为可复用模板。";
  } else if (streak >= 3) {
    suggestion = "状态正在变好，接下来重点是固定每日同一时间阅读。";
  } else if (consistencyScore >= 45) {
    suggestion = "过去 28 天已有不少阅读记录，下一步是把阅读时段固定下来。";
  }

  return {
    trend,
    calendar,
    rhythm: {
      activeDays,
      consistencyScore,
      bestDay,
    },
    monthlyGoal: {
      targetPages: MONTHLY_TARGET_PAGES,
      targetMinutes: MONTHLY_TARGET_MINUTES,
      monthlyPages,
      monthlyMinutes,
      pagesRate,
      minutesRate,
    },
    suggestion,
  };
}

export async function getTodayPlan(todos = [], userId = "demo") {
  const data = await getData(userId);
  const focusBook = getFocusBook(data.books, data.checkins);
  const average = getRecentAverage(data.checkins);
  const dueQuotes = data.quotes
    .filter((item) => new Date(item.nextReviewAt).getTime() <= Date.now())
    .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime());
  const openTodos = todos.filter((item) => !item.done).slice(0, 3);

  if (!focusBook) {
    return {
      focusBook: null,
      pagesTarget: 0,
      minutesTarget: 20,
      remainingPages: 0,
      estimatedFinishDays: 0,
      reviewCount: dueQuotes.length,
      dueQuotesPreview: dueQuotes.slice(0, 2),
      todos: openTodos,
      checklist: ["添加一本想读或在读书籍", "完成 20 分钟自由阅读", "写下一条明天想继续追问的问题"],
      reason: "当前书架为空，先建立第一本书的阅读入口。",
    };
  }

  const remainingPages = getRemainingPages(focusBook);
  const pagesTarget = Math.max(8, Math.min(remainingPages || average.pages, average.pages));
  const minutesTarget = Math.max(15, Math.round(pagesTarget / Math.max(average.pace, 0.4)));
  const estimatedFinishDays = remainingPages > 0 ? Math.max(1, Math.ceil(remainingPages / pagesTarget)) : 0;
  const nextProgress = Math.min(
    100,
    Math.round(((Number(focusBook.totalPages || 0) - remainingPages + pagesTarget) / Number(focusBook.totalPages || 1)) * 100)
  );

  return {
    focusBook: {
      id: focusBook.id,
      title: focusBook.title,
      author: focusBook.author,
      progress: focusBook.progress,
      nextProgress,
    },
    pagesTarget,
    minutesTarget,
    remainingPages,
    estimatedFinishDays,
    reviewCount: dueQuotes.length,
    dueQuotesPreview: dueQuotes.slice(0, 2),
    todos: openTodos,
    checklist: [
      `读《${focusBook.title}》${pagesTarget} 页，先推进到 ${nextProgress}%`,
      dueQuotes.length ? `复习 ${Math.min(dueQuotes.length, 2)} 条到期摘录` : "补一条今天最有触动的摘录",
      openTodos[0] ? `完成行动：${openTodos[0].text}` : "写一条可以明天执行的章节行动",
    ],
    reason:
      focusBook.status === "想读"
        ? "当前没有在读书，先把想读书推进为今日起点。"
        : "优先延续最近的在读书，减少切换成本。",
  };
}

export async function getWeeklyReport(userId = "demo") {
  const data = await getData(userId);
  const stats = calcStats(data);
  const insights = await getInsights(userId);
  const plan = await getTodayPlan([], userId);
  const topBook = data.books.slice().sort((a, b) => Number(b.progress || 0) - Number(a.progress || 0))[0];
  const latestQuote = data.quotes.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  const lines = [
    "# 阅读周报",
    "",
    `- 连续阅读：${calcStreak(data.checkins)} 天`,
    `- 本周累计页数：${insights.trend.reduce((acc, item) => acc + item.pages, 0)} 页`,
    `- 本周累计时长：${insights.trend.reduce((acc, item) => acc + item.minutes, 0)} 分钟`,
    `- 本月目标进度：页数 ${insights.monthlyGoal.pagesRate}% / 时长 ${insights.monthlyGoal.minutesRate}%`,
    `- 阅读经验值：${stats.xp}`,
    "",
    "## 当前重点",
    topBook ? `- 重点书籍：${topBook.title}（${topBook.progress}%）` : "- 暂无在读书籍",
    latestQuote ? `- 本周金句：${latestQuote.text}` : "- 暂无金句",
    "",
    "## 下周建议",
    `- ${insights.suggestion}`,
    plan.focusBook ? `- 明日建议继续读《${plan.focusBook.title}》${plan.pagesTarget} 页` : "- 先添加 1 本本周要读的书",
    "- 选择 1 本在读书，每天固定同一时段阅读 20-30 分钟",
    "- 每章至少输出 1 条行动笔记，形成闭环",
  ];

  return { markdown: lines.join("\n") };
}

export async function getShareProfile(userId = "demo") {
  await prepareUser(userId);
  const slug = makeShareSlug(userId);
  const [row] = await sql`
    INSERT INTO share_profiles (user_id, slug, display_name)
    VALUES (${userId}, ${slug}, '我的阅读实验室')
    ON CONFLICT (user_id) DO UPDATE SET slug = share_profiles.slug
    RETURNING user_id, slug, enabled, display_name
  `;

  return row;
}

export async function getPublicShare(slug) {
  await ensureSchema();

  if (slug === "demo") {
    await seedUser("demo");
  }

  const [profile] = await sql`
    SELECT user_id, slug, enabled, display_name
    FROM share_profiles
    WHERE slug = ${slug} AND enabled = TRUE
  `;

  if (!profile) {
    return null;
  }

  const dashboard = await getDashboard(profile.user_id);
  const insights = await getInsights(profile.user_id);
  const report = await getWeeklyReport(profile.user_id);

  return {
    profile,
    dashboard,
    insights,
    report,
  };
}
