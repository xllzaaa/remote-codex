"use client";

import { useEffect, useMemo, useState } from "react";

const STATUS_OPTIONS = ["wishlist", "reading", "finished"];

async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export default function HomePage() {
  const [dashboard, setDashboard] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedBookId, setSelectedBookId] = useState(0);

  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    totalPages: "",
    theme: "productivity",
  });
  const [checkinForm, setCheckinForm] = useState({ pages: "", minutes: "" });
  const [quoteForm, setQuoteForm] = useState({ text: "", note: "", sourcePage: "" });
  const [noteForm, setNoteForm] = useState({ chapter: "", summary: "", action: "" });

  const [prompts, setPrompts] = useState([]);
  const [recommendTheme, setRecommendTheme] = useState("productivity");
  const [recommendations, setRecommendations] = useState([]);
  const [discussionKit, setDiscussionKit] = useState(null);

  async function loadDashboard() {
    setBusy(true);
    setError("");
    try {
      const data = await api("/api/dashboard");
      setDashboard(data);
      if (!selectedBookId && data.books[0]) {
        setSelectedBookId(data.books[0].id);
      }
    } catch (err) {
      setError(err.message || "Failed to load");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (!selectedBookId) {
      return;
    }

    (async () => {
      const [promptData, recData, discussionData] = await Promise.all([
        api(`/api/prompts?bookId=${selectedBookId}`),
        api(`/api/recommendations?theme=${recommendTheme}`),
        api(`/api/discussion?bookId=${selectedBookId}`),
      ]);

      setPrompts(promptData.prompts || []);
      setRecommendations(recData.books || []);
      setDiscussionKit(discussionData.kit || null);
    })().catch((err) => {
      setError(err.message || "Failed to load assistant modules");
    });
  }, [selectedBookId, recommendTheme]);

  const books = dashboard?.books || [];
  const selectedBook = useMemo(
    () => books.find((item) => item.id === selectedBookId) || books[0] || null,
    [books, selectedBookId]
  );

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
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not add book");
    }
  }

  async function updateBook(id, patch) {
    try {
      await api(`/api/books/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not update book");
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
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not add check-in");
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
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not add quote");
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
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not add note");
    }
  }

  async function reviewQuote(id, remembered) {
    try {
      await api(`/api/quotes/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ remembered }),
      });
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not review quote");
    }
  }

  const stats = dashboard?.stats;

  return (
    <main className="reading-shell">
      <section className="hero" style={{ "--delay": "0ms" }}>
        <p className="eyebrow">Reading Lab</p>
        <h1>One desk for books, notes, memory, and momentum.</h1>
        <p className="hero-copy">
          Track progress, capture ideas, revisit key quotes, and run your reading life like a creator.
        </p>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}

      <section className="stats-strip">
        <article className="stat" style={{ "--delay": "60ms" }}>
          <span>Current streak</span>
          <strong>{dashboard?.streak || 0} days</strong>
        </article>
        <article className="stat" style={{ "--delay": "120ms" }}>
          <span>XP level</span>
          <strong>{stats?.xp || 0}</strong>
        </article>
        <article className="stat" style={{ "--delay": "180ms" }}>
          <span>Pages tracked</span>
          <strong>{stats?.totalPages || 0}</strong>
        </article>
        <article className="stat" style={{ "--delay": "240ms" }}>
          <span>In progress</span>
          <strong>{stats?.readingCount || 0} books</strong>
        </article>
      </section>

      <div className="workspace-grid">
        <section className="panel" style={{ "--delay": "80ms" }}>
          <h2>Bookshelf</h2>
          <p className="panel-sub">Track in-read, wishlist, and finished titles.</p>

          <form className="form-grid" onSubmit={addBook}>
            <input
              placeholder="Book title"
              value={bookForm.title}
              onChange={(event) => setBookForm((prev) => ({ ...prev, title: event.target.value }))}
            />
            <input
              placeholder="Author"
              value={bookForm.author}
              onChange={(event) => setBookForm((prev) => ({ ...prev, author: event.target.value }))}
            />
            <input
              type="number"
              min="1"
              placeholder="Pages"
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
              Add book
            </button>
          </form>

          <ul className="book-list">
            {books.map((book) => (
              <li
                key={book.id}
                className={selectedBook?.id === book.id ? "active" : ""}
                onClick={() => setSelectedBookId(book.id)}
              >
                <header>
                  <h3>{book.title}</h3>
                  <span className={`tag tag-${book.status}`}>{book.status}</span>
                </header>
                <p>{book.author}</p>
                <div className="inline-controls">
                  <label>
                    Progress {book.progress}%
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
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel" style={{ "--delay": "120ms" }}>
          <h2>Daily check-in + challenge</h2>
          <p className="panel-sub">Build streak and level up by pages and minutes.</p>

          <form className="form-grid compact" onSubmit={addCheckin}>
            <input
              type="number"
              min="1"
              placeholder="Pages"
              value={checkinForm.pages}
              onChange={(event) => setCheckinForm((prev) => ({ ...prev, pages: event.target.value }))}
            />
            <input
              type="number"
              min="1"
              placeholder="Minutes"
              value={checkinForm.minutes}
              onChange={(event) => setCheckinForm((prev) => ({ ...prev, minutes: event.target.value }))}
            />
            <button className="primary" type="submit" disabled={!selectedBook || busy}>
              Check in
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
                  <strong>{new Date(entry.date).toLocaleDateString()}</strong>
                  <span>
                    {entry.pages} pages / {entry.minutes} min · {book?.title || "Unknown"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel" style={{ "--delay": "160ms" }}>
          <h2>Highlights + spaced review</h2>
          <p className="panel-sub">Capture key lines and review by 1/3/7/14 cadence.</p>

          <form className="form-grid" onSubmit={addQuote}>
            <textarea
              rows={3}
              placeholder="Quote"
              value={quoteForm.text}
              onChange={(event) => setQuoteForm((prev) => ({ ...prev, text: event.target.value }))}
            />
            <input
              placeholder="Your note"
              value={quoteForm.note}
              onChange={(event) => setQuoteForm((prev) => ({ ...prev, note: event.target.value }))}
            />
            <input
              type="number"
              min="1"
              placeholder="Source page"
              value={quoteForm.sourcePage}
              onChange={(event) => setQuoteForm((prev) => ({ ...prev, sourcePage: event.target.value }))}
            />
            <button className="primary" type="submit" disabled={!selectedBook}>
              Save highlight
            </button>
          </form>

          <ul className="quote-list">
            {(dashboard?.dueQuotes || []).map((quote) => (
              <li key={quote.id}>
                <p>“{quote.text}”</p>
                <small>Review due: {new Date(quote.nextReviewAt).toLocaleDateString()}</small>
                <div className="inline-buttons">
                  <button onClick={() => reviewQuote(quote.id, true)}>Remembered</button>
                  <button onClick={() => reviewQuote(quote.id, false)}>Need retry</button>
                </div>
              </li>
            ))}
            {(dashboard?.dueQuotes || []).length === 0 ? (
              <li>
                <p>No quote due right now. Keep reading.</p>
              </li>
            ) : null}
          </ul>
        </section>

        <section className="panel" style={{ "--delay": "200ms" }}>
          <h2>Chapter speed-notes</h2>
          <p className="panel-sub">One summary + one action after each chapter.</p>

          <form className="form-grid" onSubmit={addNote}>
            <input
              type="number"
              min="1"
              placeholder="Chapter"
              value={noteForm.chapter}
              onChange={(event) => setNoteForm((prev) => ({ ...prev, chapter: event.target.value }))}
            />
            <textarea
              rows={2}
              placeholder="Summary"
              value={noteForm.summary}
              onChange={(event) => setNoteForm((prev) => ({ ...prev, summary: event.target.value }))}
            />
            <textarea
              rows={2}
              placeholder="Action step"
              value={noteForm.action}
              onChange={(event) => setNoteForm((prev) => ({ ...prev, action: event.target.value }))}
            />
            <button className="primary" type="submit" disabled={!selectedBook}>
              Save chapter note
            </button>
          </form>

          <ul className="note-list">
            {(dashboard?.notes || []).slice(0, 5).map((note) => {
              const book = books.find((item) => item.id === note.bookId);
              return (
                <li key={note.id}>
                  <strong>
                    {book?.title || "Unknown"} · Ch.{note.chapter}
                  </strong>
                  <p>{note.summary}</p>
                  <small>Action: {note.action}</small>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel" style={{ "--delay": "240ms" }}>
          <h2>Thinking assistant</h2>
          <p className="panel-sub">Prompts, topic paths, and a ready-to-run discussion kit.</p>

          <div className="inline-controls">
            <label>
              Theme path
              <select value={recommendTheme} onChange={(event) => setRecommendTheme(event.target.value)}>
                {(dashboard?.themes || []).map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h3>Reflection prompts</h3>
          <ul className="mini-list">
            {prompts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h3>Theme reading path</h3>
          <ul className="mini-list">
            {recommendations.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>

          {discussionKit ? (
            <>
              <h3>Book club kit</h3>
              <p>{discussionKit.topic}</p>
              <ul className="mini-list">
                {discussionKit.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
              <small>
                Poll: {discussionKit.poll.question} · {discussionKit.poll.options.join(" / ")}
              </small>
            </>
          ) : null}
        </section>

        <section className="panel" style={{ "--delay": "280ms" }}>
          <h2>Knowledge map</h2>
          <p className="panel-sub">Live links from notes to action ideas.</p>

          <ul className="graph-list">
            {(dashboard?.graphLinks || []).map((item) => (
              <li key={item.id}>{item.link}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
