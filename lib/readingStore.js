const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_OFFSETS = [1, 3, 7, 14];

const THEME_BOOKS = {
  productivity: [
    "Deep Work",
    "Atomic Habits",
    "Essentialism",
    "Four Thousand Weeks",
  ],
  writing: [
    "On Writing Well",
    "Bird by Bird",
    "Steering the Craft",
    "Several Short Sentences About Writing",
  ],
  psychology: [
    "Thinking, Fast and Slow",
    "The Righteous Mind",
    "Behave",
    "Stumbling on Happiness",
  ],
  startup: [
    "The Lean Startup",
    "The Mom Test",
    "Inspired",
    "The Hard Thing About Hard Things",
  ],
};

function dayStamp(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function plusDaysIso(days) {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

function buildGraph(notes, books) {
  return notes.slice(-8).map((note) => {
    const book = books.find((item) => item.id === note.bookId);
    return {
      id: note.id,
      link: `${book?.title || "Unknown"} -> Ch.${note.chapter} -> ${note.action}`,
    };
  });
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
        title: "Deep Work",
        author: "Cal Newport",
        status: "reading",
        progress: 42,
        totalPages: 304,
        theme: "productivity",
      },
      {
        id: 2,
        title: "Thinking, Fast and Slow",
        author: "Daniel Kahneman",
        status: "wishlist",
        progress: 0,
        totalPages: 499,
        theme: "psychology",
      },
      {
        id: 3,
        title: "On Writing Well",
        author: "William Zinsser",
        status: "finished",
        progress: 100,
        totalPages: 321,
        theme: "writing",
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
        text: "Clarity about what matters provides clarity about what does not.",
        note: "Focus has to be designed, not wished.",
        sourcePage: 81,
        reviewStage: 1,
        nextReviewAt: plusDaysIso(1),
        createdAt: new Date(now - DAY_MS * 3).toISOString(),
      },
      {
        id: 2,
        bookId: 3,
        text: "Writing is thinking on paper.",
        note: "Use writing to clarify your own model.",
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
        summary: "Attention residue kills deep sessions. Batch shallow work away from focus blocks.",
        action: "Book a 90-minute deep work block before noon.",
        createdAt: nowIso(),
      },
      {
        id: 2,
        bookId: 3,
        chapter: 2,
        summary: "Good prose removes friction for the reader.",
        action: "Cut 30% from first drafts before publishing.",
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
  const readingCount = store.books.filter((book) => book.status === "reading").length;
  const finishedCount = store.books.filter((book) => book.status === "finished").length;
  const totalMinutes = store.checkins.reduce((acc, item) => acc + Number(item.minutes || 0), 0);
  const totalPages = store.checkins.reduce((acc, item) => acc + Number(item.pages || 0), 0);
  const xp = totalMinutes + store.notes.length * 8 + store.quotes.length * 5;

  const badges = [];
  if (calcStreak() >= 3) badges.push("Streak Starter");
  if (finishedCount >= 1) badges.push("Book Finisher");
  if (store.quotes.length >= 3) badges.push("Quote Collector");
  if (xp >= 180) badges.push("Reading Ranger");

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
    return { error: "title, author and positive totalPages are required" };
  }

  const book = {
    id: store.nextIds.book++,
    title,
    author,
    status: ["wishlist", "reading", "finished"].includes(input.status) ? input.status : "wishlist",
    progress: 0,
    totalPages,
    theme: String(input.theme || "productivity"),
  };

  store.books.push(book);
  return { book };
}

export function updateBook(id, patch) {
  const book = ensureBook(id);
  if (!book) {
    return { error: "book not found" };
  }

  if (typeof patch.status === "string" && ["wishlist", "reading", "finished"].includes(patch.status)) {
    book.status = patch.status;
  }

  if (Number.isFinite(Number(patch.progress))) {
    const value = Number(patch.progress);
    book.progress = Math.max(0, Math.min(100, Math.round(value)));
    if (book.progress === 100) {
      book.status = "finished";
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
    return { error: "book not found" };
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
    return { error: "valid bookId is required" };
  }

  if (!Number.isInteger(pages) || pages <= 0 || !Number.isInteger(minutes) || minutes <= 0) {
    return { error: "pages and minutes must be positive integers" };
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
    return { error: "valid bookId is required" };
  }

  if (!text) {
    return { error: "quote text is required" };
  }

  if (!Number.isInteger(sourcePage) || sourcePage <= 0) {
    return { error: "sourcePage must be a positive integer" };
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
    return { error: "quote not found" };
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
    return { error: "valid bookId is required" };
  }

  if (!Number.isInteger(chapter) || chapter <= 0) {
    return { error: "chapter must be a positive integer" };
  }

  if (!summary || !action) {
    return { error: "summary and action are required" };
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
    `What is one belief from ${book.title} that changed your behavior this week?`,
    `If you teach chapter insights from ${book.title} to a friend in 3 minutes, what do you keep?`,
    `Which idea from ${book.title} conflicts with your current habit, and what micro-action can test it tomorrow?`,
    `What did this book not explain clearly, and how would you validate that gap?`,
    `How does ${book.title} connect to another book you read recently?`,
  ];
}

export function getRecommendations(theme) {
  const key = String(theme || "").toLowerCase();
  return THEME_BOOKS[key] || [];
}

export function getDiscussionKit(bookId) {
  const book = ensureBook(bookId) || store.books[0];
  if (!book) {
    return null;
  }

  return {
    topic: `${book.title} weekly discussion`,
    questions: [
      `Which argument in ${book.title} feels strongest, and why?`,
      `What idea seems appealing but risky in real life?`,
      "What concrete action should everyone try before next session?",
    ],
    poll: {
      question: "How actionable was this chapter?",
      options: ["Very actionable", "Somewhat actionable", "Mostly theory"],
    },
  };
}
