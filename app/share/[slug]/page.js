import { notFound } from "next/navigation";
import { getPublicShare } from "../../../lib/readingStore";

export const dynamic = "force-dynamic";

export default async function SharePage({ params }) {
  const { slug } = await params;
  const share = await getPublicShare(slug);

  if (!share) {
    notFound();
  }

  const { dashboard, insights, profile, report } = share;
  const stats = dashboard.stats;

  return (
    <main className="reading-shell share-shell">
      <section className="hero">
        <p className="eyebrow">公开阅读页</p>
        <h1>{profile.display_name}</h1>
        <p className="hero-copy">这里可以看到阅读进度、连续天数、近期摘录和周报，只读展示，不会暴露编辑入口。</p>
      </section>

      <section className="stats-strip">
        <article className="stat">
          <span>连续阅读</span>
          <strong>{dashboard.streak} 天</strong>
        </article>
        <article className="stat">
          <span>累计页数</span>
          <strong>{stats.totalPages} 页</strong>
        </article>
        <article className="stat">
          <span>阅读时长</span>
          <strong>{stats.totalMinutes} 分钟</strong>
        </article>
        <article className="stat">
          <span>节奏评分</span>
          <strong>{insights.rhythm.consistencyScore}</strong>
        </article>
      </section>

      <div className="workspace-grid">
        <section className="panel">
          <h2>公开书架</h2>
          <ul className="book-list">
            {dashboard.books.map((book) => (
              <li key={book.id}>
                <header>
                  <h3>{book.title}</h3>
                  <span className="tag tag-reading">{book.status}</span>
                </header>
                <p>
                  {book.author} · {book.progress}%
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>近期摘录</h2>
          <ul className="quote-list">
            {dashboard.quotes.slice(0, 4).map((quote) => (
              <li key={quote.id}>
                <p>“{quote.text}”</p>
                <small>{quote.note}</small>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel panel-wide">
          <h2>阅读周报</h2>
          <pre className="public-report">{report.markdown}</pre>
        </section>
      </div>
    </main>
  );
}
