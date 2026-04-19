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

function nowIso() {
  return new Date().toISOString();
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

function getRecentAverage() {
  const recent = store.checkins
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

function getFocusBook() {
  const readingBooks = store.books.filter((book) => book.status === "在读" && getRemainingPages(book) > 0);
  if (!readingBooks.length) {
    return store.books.find((book) => book.status === "想读") || store.books[0] || null;
  }

  const latestCheckin = store.checkins
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .find((item) => readingBooks.some((book) => book.id === item.bookId));

  if (latestCheckin) {
    return readingBooks.find((book) => book.id === latestCheckin.bookId);
  }

  return readingBooks.slice().sort((a, b) => Number(b.progress || 0) - Number(a.progress || 0))[0];
}

if (!globalThis.__readingLabStore) {
  const now = Date.now();
  const checkinA = new Date(now - DAY_MS * 1).toISOString();
  const checkinB = new Date(now - DAY_MS * 2).toISOString();

  globalThis.__readingLabStore = {
    nextIds: {
      book: 4,
      checkin: 3,
      quote: 3,
      note: 3,
    },
    books: [
      {
        id: 1,
        title: "深度工作",
        author: "卡尔·纽波特",
        status: "在读",
        progress: 42,
        totalPages: 304,
        theme: "效率",
      },
      {
        id: 2,
        title: "思考，快与慢",
        author: "丹尼尔·卡尼曼",
        status: "想读",
        progress: 0,
        totalPages: 499,
        theme: "心理",
      },
      {
        id: 3,
        title: "写作是门手艺",
        author: "刘军强",
        status: "读完",
        progress: 100,
        totalPages: 321,
        theme: "写作",
      },
    ],
    checkins: [
      {
        id: 1,
        date: checkinB,
        bookId: 1,
        pages: 18,
        minutes: 35,
      },
      {
        id: 2,
        date: checkinA,
        bookId: 1,
        pages: 26,
        minutes: 45,
      },
    ],
    quotes: [
      {
        id: 1,
        bookId: 1,
        text: "对重要之事越清晰，对不重要之事就越果断。",
        note: "先把注意力预算写下来。",
        sourcePage: 81,
        reviewStage: 1,
        nextReviewAt: plusDaysIso(1),
        createdAt: new Date(now - DAY_MS * 3).toISOString(),
      },
      {
        id: 2,
        bookId: 3,
        text: "写作是思考的外化。",
        note: "先写草稿，再删减三成。",
        sourcePage: 14,
        reviewStage: 2,
        nextReviewAt: plusDaysIso(3),
        createdAt: new Date(now - DAY_MS * 5).toISOString(),
      },
    ],
    notes: [
      {
        id: 1,
        bookId: 1,
        chapter: 4,
        summary: "注意力残留会切碎专注，浅层任务要集中处理。",
        action: "明早安排 90 分钟深度工作时段。",
        createdAt: nowIso(),
      },
      {
        id: 2,
        bookId: 3,
        chapter: 2,
        summary: "好文字的核心是减少读者阻力。",
        action: "发布前强制做一次删改轮。",
        createdAt: nowIso(),
      },
    ],
  };
}

const store = globalThis.__readingLabStore;

function ensureBook(id) {
  return store.books.find((book) => book.id === id) || null;
}

function calcStreak() {
  const days = Array.from(new Set(store.checkins.map((item) => dayStamp(item.date)))).sort();
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

function calcStats() {
  const readingCount = store.books.filter((book) => book.status === "在读").length;
  const finishedCount = store.books.filter((book) => book.status === "读完").length;
  const totalMinutes = store.checkins.reduce((acc, item) => acc + Number(item.minutes || 0), 0);
  const totalPages = store.checkins.reduce((acc, item) => acc + Number(item.pages || 0), 0);
  const xp = totalMinutes + store.notes.length * 8 + store.quotes.length * 5;

  const badges = [];
  if (calcStreak() >= 3) badges.push("连读达人");
  if (finishedCount >= 1) badges.push("完读徽章");
  if (store.quotes.length >= 3) badges.push("金句收藏家");
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

export function getDashboard() {
  const dueQuotes = store.quotes
    .filter((item) => new Date(item.nextReviewAt).getTime() <= Date.now())
    .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime());

  return {
    books: store.books,
    checkins: store.checkins.slice().sort((a, b) => new Date(b.date) - new Date(a.date)),
    quotes: store.quotes.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    notes: store.notes.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    dueQuotes,
    streak: calcStreak(),
    stats: calcStats(),
    graphLinks: buildGraph(store.notes, store.books),
    themes: Object.keys(THEME_BOOKS),
  };
}

export function listBooks() {
  return store.books;
}

export function createBook(input) {
  const title = String(input.title || "").trim();
  const author = String(input.author || "").trim();
  const totalPages = Number(input.totalPages || 0);

  if (!title || !author || !Number.isInteger(totalPages) || totalPages <= 0) {
    return { error: "请填写书名、作者和正确页数" };
  }

  const book = {
    id: store.nextIds.book++,
    title,
    author,
    status: BOOK_STATUS.includes(input.status) ? input.status : "想读",
    progress: 0,
    totalPages,
    theme: String(input.theme || "效率"),
  };

  store.books.push(book);
  return { book };
}

export function updateBook(id, patch) {
  const book = ensureBook(id);
  if (!book) {
    return { error: "书籍不存在" };
  }

  if (typeof patch.status === "string" && BOOK_STATUS.includes(patch.status)) {
    book.status = patch.status;
  }

  if (Number.isFinite(Number(patch.progress))) {
    const value = Number(patch.progress);
    book.progress = Math.max(0, Math.min(100, Math.round(value)));
    if (book.progress === 100) {
      book.status = "读完";
    }
  }

  if (typeof patch.theme === "string" && patch.theme.trim()) {
    book.theme = patch.theme.trim();
  }

  return { book };
}

export function deleteBook(id) {
  const index = store.books.findIndex((book) => book.id === id);
  if (index === -1) {
    return { error: "书籍不存在" };
  }

  store.books.splice(index, 1);
  store.checkins = store.checkins.filter((item) => item.bookId !== id);
  store.notes = store.notes.filter((item) => item.bookId !== id);
  store.quotes = store.quotes.filter((item) => item.bookId !== id);
  return { success: true };
}

export function addCheckin(input) {
  const bookId = Number(input.bookId);
  const pages = Number(input.pages);
  const minutes = Number(input.minutes);

  if (!Number.isInteger(bookId) || !ensureBook(bookId)) {
    return { error: "请选择有效书籍" };
  }

  if (!Number.isInteger(pages) || pages <= 0 || !Number.isInteger(minutes) || minutes <= 0) {
    return { error: "页数和时长必须是正整数" };
  }

  const entry = {
    id: store.nextIds.checkin++,
    date: nowIso(),
    bookId,
    pages,
    minutes,
  };

  store.checkins.push(entry);
  return { checkin: entry };
}

export function listCheckins() {
  return store.checkins;
}

export function addQuote(input) {
  const bookId = Number(input.bookId);
  const text = String(input.text || "").trim();
  const note = String(input.note || "").trim();
  const sourcePage = Number(input.sourcePage || 0);

  if (!Number.isInteger(bookId) || !ensureBook(bookId)) {
    return { error: "请选择有效书籍" };
  }

  if (!text) {
    return { error: "请填写摘录内容" };
  }

  if (!Number.isInteger(sourcePage) || sourcePage <= 0) {
    return { error: "页码必须是正整数" };
  }

  const quote = {
    id: store.nextIds.quote++,
    bookId,
    text,
    note,
    sourcePage,
    reviewStage: 0,
    nextReviewAt: plusDaysIso(REVIEW_OFFSETS[0]),
    createdAt: nowIso(),
  };

  store.quotes.push(quote);
  return { quote };
}

export function listQuotes() {
  return store.quotes;
}

export function reviewQuote(id, remembered) {
  const quote = store.quotes.find((item) => item.id === id);
  if (!quote) {
    return { error: "摘录不存在" };
  }

  if (remembered) {
    quote.reviewStage = Math.min(quote.reviewStage + 1, REVIEW_OFFSETS.length - 1);
  } else {
    quote.reviewStage = 0;
  }

  quote.nextReviewAt = plusDaysIso(REVIEW_OFFSETS[quote.reviewStage]);
  return { quote };
}

export function addNote(input) {
  const bookId = Number(input.bookId);
  const chapter = Number(input.chapter);
  const summary = String(input.summary || "").trim();
  const action = String(input.action || "").trim();

  if (!Number.isInteger(bookId) || !ensureBook(bookId)) {
    return { error: "请选择有效书籍" };
  }

  if (!Number.isInteger(chapter) || chapter <= 0) {
    return { error: "章节必须是正整数" };
  }

  if (!summary || !action) {
    return { error: "请填写总结与行动" };
  }

  const note = {
    id: store.nextIds.note++,
    bookId,
    chapter,
    summary,
    action,
    createdAt: nowIso(),
  };

  store.notes.push(note);
  return { note };
}

export function listNotes() {
  return store.notes;
}

export function getPrompts(bookId) {
  const book = ensureBook(bookId) || store.books[0];
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

export function getDiscussionKit(bookId) {
  const book = ensureBook(bookId) || store.books[0];
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

export function getInsights() {
  const days = getLastDays(7);
  const trend = days.map((date) => {
    const dayItems = store.checkins.filter((item) => dayStamp(item.date) === date);
    const pages = dayItems.reduce((acc, item) => acc + Number(item.pages || 0), 0);
    const minutes = dayItems.reduce((acc, item) => acc + Number(item.minutes || 0), 0);
    return { date, pages, minutes };
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthlyCheckins = store.checkins.filter((item) => {
    const time = new Date(item.date);
    return time.getFullYear() === currentYear && time.getMonth() === currentMonth;
  });

  const monthlyPages = monthlyCheckins.reduce((acc, item) => acc + Number(item.pages || 0), 0);
  const monthlyMinutes = monthlyCheckins.reduce((acc, item) => acc + Number(item.minutes || 0), 0);
  const pagesRate = Math.min(100, Math.round((monthlyPages / MONTHLY_TARGET_PAGES) * 100));
  const minutesRate = Math.min(100, Math.round((monthlyMinutes / MONTHLY_TARGET_MINUTES) * 100));

  const streak = calcStreak();
  let suggestion = "先把今天的 20 分钟读完，连续性比强度更重要。";
  if (streak >= 7) {
    suggestion = "你已进入稳定节奏，建议把复盘笔记升级为可复用模板。";
  } else if (streak >= 3) {
    suggestion = "状态正在变好，接下来重点是固定每日同一时间阅读。";
  }

  return {
    trend,
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

export function getTodayPlan(todos = []) {
  const focusBook = getFocusBook();
  const average = getRecentAverage();
  const dueQuotes = store.quotes
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

export function getWeeklyReport() {
  const stats = calcStats();
  const insights = getInsights();
  const plan = getTodayPlan();
  const topBook = store.books
    .slice()
    .sort((a, b) => Number(b.progress || 0) - Number(a.progress || 0))[0];
  const latestQuote = store.quotes
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  const lines = [
    "# 阅读周报",
    "",
    `- 连续阅读：${calcStreak()} 天`,
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
