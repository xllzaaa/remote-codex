"use client";

import { useEffect, useMemo, useState } from "react";

const STATUS_OPTIONS = ["想读", "在读", "读完"];
const STATUS_CLASS = {
  想读: "wishlist",
  在读: "reading",
  读完: "finished",
};
const TODO_PRIORITY_OPTIONS = ["高", "中", "低"];

async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "请求失败");
  }
  return data;
}

export default function HomePage() {
  const [dashboard, setDashboard] = useState(null);
  const [insights, setInsights] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedBookId, setSelectedBookId] = useState(0);
  const [bookKeyword, setBookKeyword] = useState("");
  const [weeklyReport, setWeeklyReport] = useState("");

  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    totalPages: "",
    theme: "效率",
  });
  const [checkinForm, setCheckinForm] = useState({ pages: "", minutes: "" });
  const [quoteForm, setQuoteForm] = useState({ text: "", note: "", sourcePage: "" });
  const [noteForm, setNoteForm] = useState({ chapter: "", summary: "", action: "" });

  const [prompts, setPrompts] = useState([]);
  const [recommendTheme, setRecommendTheme] = useState("效率");
  const [recommendations, setRecommendations] = useState([]);
  const [discussionKit, setDiscussionKit] = useState(null);
  const [todos, setTodos] = useState([]);
  const [todoForm, setTodoForm] = useState({ text: "", priority: "中", bookId: "" });

  async function refreshAll() {
    setBusy(true);
    setError("");

    try {
      const [dashboardData, insightsData, todoData] = await Promise.all([
        api("/api/dashboard"),
        api("/api/insights"),
        api("/api/todos"),
      ]);
      setDashboard(dashboardData);
      setInsights(insightsData);
      setTodos(todoData.todos || []);

      if (!selectedBookId && dashboardData.books[0]) {
        setSelectedBookId(dashboardData.books[0].id);
      }
    } catch (err) {
      setError(err.message || "加载失败");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!selectedBookId) {
      return;
    }

    (async () => {
      const [promptData, recData, discussionData] = await Promise.all([
        api(`/api/prompts?bookId=${selectedBookId}`),
        api(`/api/recommendations?theme=${encodeURIComponent(recommendTheme)}`),
        api(`/api/discussion?bookId=${selectedBookId}`),
      ]);

      setPrompts(promptData.prompts || []);
      setRecommendations(recData.books || []);
      setDiscussionKit(discussionData.kit || null);
    })().catch((err) => {
      setError(err.message || "智能模块加载失败");
    });
  }, [selectedBookId, recommendTheme]);

  const books = dashboard?.books || [];
  const selectedBook = useMemo(
    () => books.find((item) => item.id === selectedBookId) || books[0] || null,
    [books, selectedBookId]
  );

  const filteredBooks = useMemo(() => {
    const keyword = bookKeyword.trim().toLowerCase();
    if (!keyword) {
      return books;
    }

    return books.filter((book) => {
      const haystack = `${book.title} ${book.author}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [books, bookKeyword]);

  async function addBook(event) {
    event.preventDefault();
    try {
      await api("/api/books", {
        method: "POST",
        body: JSON.stringify({
          ...bookForm,
          totalPages: Number(bookForm.totalPages),
        }),
      });
      setBookForm({ title: "", author: "", totalPages: "", theme: recommendTheme });
      await refreshAll();
    } catch (err) {
      setError(err.message || "新增书籍失败");
    }
  }

  async function updateBook(id, patch) {
    try {
      await api(`/api/books/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      await refreshAll();
    } catch (err) {
      setError(err.message || "更新书籍失败");
    }
  }

  async function removeBook(id, title) {
    const ok = window.confirm(`确认删除《${title}》吗？该书的打卡、摘录和笔记会一并删除。`);
    if (!ok) {
      return;
    }

    try {
      await api(`/api/books/${id}`, { method: "DELETE" });
      if (selectedBookId === id) {
        setSelectedBookId(0);
      }
      await refreshAll();
    } catch (err) {
      setError(err.message || "删除书籍失败");
    }
  }

  async function addCheckin(event) {
    event.preventDefault();
    if (!selectedBook) return;

    try {
      await api("/api/checkins", {
        method: "POST",
        body: JSON.stringify({
          bookId: selectedBook.id,
          pages: Number(checkinForm.pages),
          minutes: Number(checkinForm.minutes),
        }),
      });
      setCheckinForm({ pages: "", minutes: "" });
      await refreshAll();
    } catch (err) {
      setError(err.message || "打卡失败");
    }
  }

  async function addQuote(event) {
    event.preventDefault();
    if (!selectedBook) return;

    try {
      await api("/api/quotes", {
        method: "POST",
        body: JSON.stringify({
          bookId: selectedBook.id,
          text: quoteForm.text,
          note: quoteForm.note,
          sourcePage: Number(quoteForm.sourcePage),
        }),
      });
      setQuoteForm({ text: "", note: "", sourcePage: "" });
      await refreshAll();
    } catch (err) {
      setError(err.message || "保存摘录失败");
    }
  }

  async function addNote(event) {
    event.preventDefault();
    if (!selectedBook) return;

    try {
      await api("/api/notes", {
        method: "POST",
        body: JSON.stringify({
          bookId: selectedBook.id,
          chapter: Number(noteForm.chapter),
          summary: noteForm.summary,
          action: noteForm.action,
        }),
      });
      setNoteForm({ chapter: "", summary: "", action: "" });
      await refreshAll();
    } catch (err) {
      setError(err.message || "保存章节笔记失败");
    }
  }

  async function reviewQuote(id, remembered) {
    try {
      await api(`/api/quotes/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ remembered }),
      });
      await refreshAll();
    } catch (err) {
      setError(err.message || "复习记录失败");
    }
  }

  async function addTodo(event) {
    event.preventDefault();
    const text = todoForm.text.trim();
    if (!text) {
      setError("请填写任务内容");
      return;
    }

    try {
      await api("/api/todos", {
        method: "POST",
        body: JSON.stringify({
          text,
          priority: todoForm.priority,
          bookId: todoForm.bookId ? Number(todoForm.bookId) : null,
        }),
      });
      setTodoForm({ text: "", priority: "中", bookId: selectedBook?.id ? String(selectedBook.id) : "" });
      await refreshAll();
    } catch (err) {
      setError(err.message || "新增任务失败");
    }
  }

  async function toggleTodoDone(todo) {
    try {
      await api(`/api/todos/${todo.id}`, {
        method: "PUT",
        body: JSON.stringify({ done: !todo.done }),
      });
      await refreshAll();
    } catch (err) {
      setError(err.message || "更新任务状态失败");
    }
  }

  async function changeTodoPriority(todo, priority) {
    try {
      await api(`/api/todos/${todo.id}`, {
        method: "PUT",
        body: JSON.stringify({ priority }),
      });
      await refreshAll();
    } catch (err) {
      setError(err.message || "更新优先级失败");
    }
  }

  async function removeTodo(id) {
    try {
      await api(`/api/todos/${id}`, { method: "DELETE" });
      await refreshAll();
    } catch (err) {
      setError(err.message || "删除任务失败");
    }
  }

  async function generateWeeklyReport() {
    setReportBusy(true);
    try {
      const data = await api("/api/reports/weekly");
      setWeeklyReport(data.markdown || "");
    } catch (err) {
      setError(err.message || "生成周报失败");
    } finally {
      setReportBusy(false);
    }
  }

  async function copyWeeklyReport() {
    if (!weeklyReport) {
      return;
    }

    try {
      await navigator.clipboard.writeText(weeklyReport);
    } catch (err) {
      setError("复制失败，请手动复制文本");
    }
  }

  const stats = dashboard?.stats;
  const monthlyGoal = insights?.monthlyGoal;
  const trendMaxPages = Math.max(...(insights?.trend || []).map((item) => item.pages), 1);
  const pendingTodos = todos.filter((item) => !item.done).length;

  return (
    <main className="reading-shell">
      <section className="hero" style={{ "--delay": "0ms" }}>
        <p className="eyebrow">阅读实验室</p>
        <h1>一本书，从进度到行动，在同一个工作台完成。</h1>
        <p className="hero-copy">记录阅读、沉淀摘录、触发复习、生成讨论提纲，把读书变成长期可积累的系统。</p>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}

      <section className="stats-strip">
        <article className="stat" style={{ "--delay": "60ms" }}>
          <span>当前连续天数</span>
          <strong>{dashboard?.streak || 0} 天</strong>
        </article>
        <article className="stat" style={{ "--delay": "120ms" }}>
          <span>阅读经验值</span>
          <strong>{stats?.xp || 0}</strong>
        </article>
        <article className="stat" style={{ "--delay": "180ms" }}>
          <span>累计阅读页数</span>
          <strong>{stats?.totalPages || 0}</strong>
        </article>
        <article className="stat" style={{ "--delay": "240ms" }}>
          <span>待办行动数</span>
          <strong>{pendingTodos} 项</strong>
        </article>
      </section>

      <div className="workspace-grid">
        <section className="panel" style={{ "--delay": "80ms" }}>
          <h2>书架管理</h2>
          <p className="panel-sub">管理想读、在读、读完状态与进度，支持快速检索与删除。</p>

          <div className="toolbar">
            <input
              className="book-search"
              placeholder="搜索书名或作者"
              value={bookKeyword}
              onChange={(event) => setBookKeyword(event.target.value)}
            />
          </div>

          <form className="form-grid" onSubmit={addBook}>
            <input
              placeholder="书名"
              value={bookForm.title}
              onChange={(event) => setBookForm((prev) => ({ ...prev, title: event.target.value }))}
            />
            <input
              placeholder="作者"
              value={bookForm.author}
              onChange={(event) => setBookForm((prev) => ({ ...prev, author: event.target.value }))}
            />
            <input
              type="number"
              min="1"
              placeholder="总页数"
              value={bookForm.totalPages}
              onChange={(event) => setBookForm((prev) => ({ ...prev, totalPages: event.target.value }))}
            />
            <select
              value={bookForm.theme}
              onChange={(event) => setBookForm((prev) => ({ ...prev, theme: event.target.value }))}
            >
              {(dashboard?.themes || []).map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
            <button className="primary" type="submit">
              添加书籍
            </button>
          </form>

          <ul className="book-list">
            {filteredBooks.map((book) => (
              <li
                key={book.id}
                className={selectedBook?.id === book.id ? "active" : ""}
                onClick={() => setSelectedBookId(book.id)}
              >
                <header>
                  <h3>{book.title}</h3>
                  <span className={`tag tag-${STATUS_CLASS[book.status] || "wishlist"}`}>{book.status}</span>
                </header>
                <p>{book.author}</p>
                <div className="inline-controls">
                  <label>
                    阅读进度 {book.progress}%
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={book.progress}
                      onChange={(event) => updateBook(book.id, { progress: Number(event.target.value) })}
                    />
                  </label>
                  <select
                    value={book.status}
                    onChange={(event) => updateBook(book.id, { status: event.target.value })}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <button
                    className="danger"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeBook(book.id, book.title);
                    }}
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel" style={{ "--delay": "100ms" }}>
          <h2>阅读趋势与目标</h2>
          <p className="panel-sub">最近 7 天阅读趋势 + 本月目标进度，帮你判断节奏是否稳定。</p>

          <div className="trend-bars">
            {(insights?.trend || []).map((item) => {
              const height = Math.max(8, Math.round((item.pages / trendMaxPages) * 90));
              return (
                <div key={item.date} className="trend-item">
                  <div className="bar-wrap">
                    <div className="bar-fill" style={{ height: `${height}%` }} />
                  </div>
                  <strong>{item.pages}页</strong>
                  <small>{item.date.slice(5)}</small>
                </div>
              );
            })}
          </div>

          <div className="goal-block">
            <div>
              <span>本月页数目标 {monthlyGoal?.monthlyPages || 0}/{monthlyGoal?.targetPages || 0}</span>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${monthlyGoal?.pagesRate || 0}%` }} />
              </div>
            </div>
            <div>
              <span>本月时长目标 {monthlyGoal?.monthlyMinutes || 0}/{monthlyGoal?.targetMinutes || 0} 分钟</span>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${monthlyGoal?.minutesRate || 0}%` }} />
              </div>
            </div>
          </div>

          <p className="helper-text">建议：{insights?.suggestion || "先完成今天的阅读打卡。"}</p>
        </section>

        <section className="panel" style={{ "--delay": "120ms" }}>
          <h2>每日打卡与挑战</h2>
          <p className="panel-sub">页数与时长双记录，驱动连续阅读习惯。</p>

          <form className="form-grid compact" onSubmit={addCheckin}>
            <input
              type="number"
              min="1"
              placeholder="今日页数"
              value={checkinForm.pages}
              onChange={(event) => setCheckinForm((prev) => ({ ...prev, pages: event.target.value }))}
            />
            <input
              type="number"
              min="1"
              placeholder="阅读时长(分钟)"
              value={checkinForm.minutes}
              onChange={(event) => setCheckinForm((prev) => ({ ...prev, minutes: event.target.value }))}
            />
            <button className="primary" type="submit" disabled={!selectedBook || busy}>
              立即打卡
            </button>
          </form>

          <div className="badge-row">
            {(stats?.badges || []).map((badge) => (
              <span key={badge} className="badge">
                {badge}
              </span>
            ))}
          </div>

          <ul className="timeline">
            {(dashboard?.checkins || []).slice(0, 6).map((entry) => {
              const book = books.find((item) => item.id === entry.bookId);
              return (
                <li key={entry.id}>
                  <strong>{new Date(entry.date).toLocaleDateString("zh-CN")}</strong>
                  <span>
                    {entry.pages} 页 / {entry.minutes} 分钟 · {book?.title || "未知书籍"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel" style={{ "--delay": "140ms" }}>
          <h2>阅读行动清单</h2>
          <p className="panel-sub">把“知道”变成“做到”，优先完成高优任务。</p>

          <form className="form-grid" onSubmit={addTodo}>
            <input
              placeholder="例如：整理第 4 章 3 个要点"
              value={todoForm.text}
              onChange={(event) => setTodoForm((prev) => ({ ...prev, text: event.target.value }))}
            />
            <select
              value={todoForm.priority}
              onChange={(event) => setTodoForm((prev) => ({ ...prev, priority: event.target.value }))}
            >
              {TODO_PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}优先
                </option>
              ))}
            </select>
            <select
              value={todoForm.bookId}
              onChange={(event) => setTodoForm((prev) => ({ ...prev, bookId: event.target.value }))}
            >
              <option value="">关联书籍（可选）</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  《{book.title}》
                </option>
              ))}
            </select>
            <button className="primary" type="submit">
              添加任务
            </button>
          </form>

          <ul className="todo-list">
            {todos.map((todo) => {
              const book = books.find((item) => item.id === todo.bookId);
              return (
                <li key={todo.id} className={todo.done ? "todo-done" : ""}>
                  <label className="todo-check">
                    <input type="checkbox" checked={todo.done} onChange={() => toggleTodoDone(todo)} />
                    <span>{todo.text}</span>
                  </label>
                  <div className="todo-meta">
                    <select value={todo.priority} onChange={(event) => changeTodoPriority(todo, event.target.value)}>
                      {TODO_PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}优先
                        </option>
                      ))}
                    </select>
                    <small>{book ? `关联：${book.title}` : "未关联书籍"}</small>
                    <button className="danger" type="button" onClick={() => removeTodo(todo.id)}>
                      删除
                    </button>
                  </div>
                </li>
              );
            })}
            {todos.length === 0 ? (
              <li>
                <p>暂无任务，先添加一项今天就能完成的小行动。</p>
              </li>
            ) : null}
          </ul>
        </section>

        <section className="panel" style={{ "--delay": "160ms" }}>
          <h2>摘录与间隔复习</h2>
          <p className="panel-sub">按 1/3/7/14 天节奏复习重点内容。</p>

          <form className="form-grid" onSubmit={addQuote}>
            <textarea
              rows={3}
              placeholder="摘录原文"
              value={quoteForm.text}
              onChange={(event) => setQuoteForm((prev) => ({ ...prev, text: event.target.value }))}
            />
            <input
              placeholder="你的理解"
              value={quoteForm.note}
              onChange={(event) => setQuoteForm((prev) => ({ ...prev, note: event.target.value }))}
            />
            <input
              type="number"
              min="1"
              placeholder="原文页码"
              value={quoteForm.sourcePage}
              onChange={(event) => setQuoteForm((prev) => ({ ...prev, sourcePage: event.target.value }))}
            />
            <button className="primary" type="submit" disabled={!selectedBook}>
              保存摘录
            </button>
          </form>

          <ul className="quote-list">
            {(dashboard?.dueQuotes || []).map((quote) => (
              <li key={quote.id}>
                <p>“{quote.text}”</p>
                <small>应复习日期：{new Date(quote.nextReviewAt).toLocaleDateString("zh-CN")}</small>
                <div className="inline-buttons">
                  <button onClick={() => reviewQuote(quote.id, true)}>记住了</button>
                  <button onClick={() => reviewQuote(quote.id, false)}>再复习一次</button>
                </div>
              </li>
            ))}
            {(dashboard?.dueQuotes || []).length === 0 ? (
              <li>
                <p>当前没有到期摘录，继续保持阅读节奏。</p>
              </li>
            ) : null}
          </ul>
        </section>

        <section className="panel" style={{ "--delay": "200ms" }}>
          <h2>章节速记</h2>
          <p className="panel-sub">每章只写两件事：核心总结与下一步行动。</p>

          <form className="form-grid" onSubmit={addNote}>
            <input
              type="number"
              min="1"
              placeholder="章节"
              value={noteForm.chapter}
              onChange={(event) => setNoteForm((prev) => ({ ...prev, chapter: event.target.value }))}
            />
            <textarea
              rows={2}
              placeholder="本章总结"
              value={noteForm.summary}
              onChange={(event) => setNoteForm((prev) => ({ ...prev, summary: event.target.value }))}
            />
            <textarea
              rows={2}
              placeholder="行动项"
              value={noteForm.action}
              onChange={(event) => setNoteForm((prev) => ({ ...prev, action: event.target.value }))}
            />
            <button className="primary" type="submit" disabled={!selectedBook}>
              保存笔记
            </button>
          </form>

          <ul className="note-list">
            {(dashboard?.notes || []).slice(0, 5).map((note) => {
              const book = books.find((item) => item.id === note.bookId);
              return (
                <li key={note.id}>
                  <strong>
                    {book?.title || "未知书籍"} · 第 {note.chapter} 章
                  </strong>
                  <p>{note.summary}</p>
                  <small>行动：{note.action}</small>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel" style={{ "--delay": "240ms" }}>
          <h2>思考辅助</h2>
          <p className="panel-sub">自动给出复盘问题、主题书单与读书会提纲。</p>

          <div className="inline-controls">
            <label>
              主题路径
              <select value={recommendTheme} onChange={(event) => setRecommendTheme(event.target.value)}>
                {(dashboard?.themes || []).map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h3>读后反思问题</h3>
          <ul className="mini-list">
            {prompts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h3>主题书单建议</h3>
          <ul className="mini-list">
            {recommendations.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>

          {discussionKit ? (
            <>
              <h3>读书会提纲</h3>
              <p>{discussionKit.topic}</p>
              <ul className="mini-list">
                {discussionKit.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
              <small>
                投票问题：{discussionKit.poll.question}（{discussionKit.poll.options.join(" / ")}）
              </small>
            </>
          ) : null}
        </section>

        <section className="panel" style={{ "--delay": "280ms" }}>
          <h2>知识关系图</h2>
          <p className="panel-sub">把章节洞见与行动计划串成可复用结构。</p>

          <ul className="graph-list">
            {(dashboard?.graphLinks || []).map((item) => (
              <li key={item.id}>{item.link}</li>
            ))}
          </ul>
        </section>

        <section className="panel panel-wide" style={{ "--delay": "320ms" }}>
          <h2>周报导出</h2>
          <p className="panel-sub">一键生成中文阅读周报，支持复制到飞书、语雀或社群。</p>

          <div className="inline-buttons">
            <button className="primary" type="button" onClick={generateWeeklyReport} disabled={reportBusy}>
              {reportBusy ? "生成中..." : "生成周报"}
            </button>
            <button type="button" onClick={copyWeeklyReport} disabled={!weeklyReport}>
              复制周报
            </button>
          </div>

          <textarea
            className="report-box"
            rows={12}
            value={weeklyReport}
            readOnly
            placeholder="点击“生成周报”后，这里会出现本周阅读总结。"
          />
        </section>
      </div>
    </main>
  );
}
