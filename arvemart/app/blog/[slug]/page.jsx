"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Clock, Eye, Tag, ArrowLeft, Star, MessageCircle, Send, ChevronRight, Share2 } from "lucide-react";
import { AdsterraBanner, MonetagInPagePush } from "@/components/GoogleAd";

const API_URL = process.env.NEXT_PUBLIC_GOLANG_URL || "https://api.arvemart.com";

export default function BlogArticlePage({ params }) {
  const { slug } = use(params);
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [rating, setRating] = useState({ avg: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [commentForm, setCommentForm] = useState({ user_name: "", email: "", content: "" });
  const [submitting, setSubmitting] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => { fetchArticle(); }, [slug]);

  const fetchArticle = async () => {
    try {
      const articleRes = await fetch(`${API_URL}/api/blog/articles/${slug}`);
      const articleJson = await articleRes.json();
      setArticle(articleJson?.data);
      if (articleJson?.data?.title) {
        document.title = `${articleJson.data.title} | ARVE Blog`;
      }

      if (articleJson?.data?.id) {
        const [commentsRes, ratingRes] = await Promise.all([
          fetch(`${API_URL}/api/blog/comments?article_id=${articleJson.data.id}`),
          fetch(`${API_URL}/api/blog/ratings?article_id=${articleJson.data.id}`),
        ]);
        const commentsJson = await commentsRes.json();
        const ratingJson = await ratingRes.json();
        setComments(commentsJson?.data || []);
        setRating(ratingJson?.data || { avg: 0, count: 0 });

        fetch(`${API_URL}/api/blog/views`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ article_id: articleJson.data.id }),
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentForm.user_name.trim() || !commentForm.content.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API_URL}/api/blog/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...commentForm, article_id: article.id }),
      });
      setCommentForm({ user_name: "", email: "", content: "" });
      fetchArticle();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRating = async (r) => {
    setUserRating(r);
    try {
      await fetch(`${API_URL}/api/blog/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article_id: article.id, rating: r }),
      });
      const ratingRes = await fetch(`${API_URL}/api/blog/ratings?article_id=${article.id}`);
      const ratingJson = await ratingRes.json();
      setRating(ratingJson?.data || { avg: 0, count: 0 });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-slate-200 rounded w-1/3" />
            <div className="h-10 bg-slate-200 rounded w-3/4" />
            <div className="aspect-video bg-slate-200 rounded-2xl" />
            <div className="space-y-3"><div className="h-4 bg-slate-200 rounded w-full" /><div className="h-4 bg-slate-200 rounded w-5/6" /></div>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-48 bg-slate-200 rounded-2xl" />
            <div className="h-64 bg-slate-200 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-700 mb-4">Artikel tidak ditemukan</h2>
        <Link href="/blog" className="text-violet-600 hover:underline">Kembali ke Blog</Link>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/blog" className="hover:text-violet-600 transition">Blog</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            {article.category && (
              <>
                <span>{article.category.name}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
            <span className="text-slate-800 truncate max-w-xs">{article.title}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          {/* ===== MAIN CONTENT (LEFT) ===== */}
          <article>
            {/* Header */}
            <header className="mb-8">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                {article.category && (
                  <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Tag className="w-3 h-3" />{article.category.name}
                  </span>
                )}
                <span className="text-slate-400 text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(article.published_at || article.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                <span className="text-slate-400 text-xs flex items-center gap-1">
                  <Eye className="w-3 h-3" />{article.view_count || 0} pembaca
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">{article.title}</h1>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                  {article.author_name?.charAt(0)?.toUpperCase() || "A"}
                </div>
                <span className="font-medium text-slate-700">{article.author_name}</span>
              </div>
            </header>

            {/* Cover */}
            {article.cover_image && (
              <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
                <img src={article.cover_image} alt={article.title} className="w-full object-cover max-h-[500px]" />
              </div>
            )}

            {/* Content */}
            <div
              className="blog-content mb-10 text-slate-900"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            <style>{`
              .blog-content p { margin: 1.2em 0; line-height: 1.8; }
              .blog-content h2 { font-size: 1.5em; font-weight: 700; margin: 1.5em 0 0.6em; color: #0f172a; }
              .blog-content h3 { font-size: 1.25em; font-weight: 600; margin: 1.2em 0 0.5em; color: #0f172a; }
              .blog-content img {
                max-width: 100%;
                height: auto;
                display: block;
                margin: 2em auto;
                border-radius: 12px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.08);
              }
              .blog-content a { color: #7c3aed; text-decoration: underline; }
              .blog-content a:hover { color: #5b21b6; }
              .blog-content blockquote {
                border-left: 4px solid #8b5cf6;
                background: #f5f3ff;
                padding: 0.75em 1em;
                margin: 1.5em 0;
                border-radius: 0 8px 8px 0;
                color: #475569;
              }
              .blog-content pre {
                background: #1e293b;
                color: #e2e8f0;
                padding: 1em;
                border-radius: 8px;
                overflow-x: auto;
                margin: 1.5em 0;
              }
              .blog-content code {
                background: #f1f5f9;
                padding: 0.15em 0.4em;
                border-radius: 4px;
                font-size: 0.9em;
                color: #7c3aed;
              }
              .blog-content pre code { background: none; padding: 0; color: inherit; }
              .blog-content ul, .blog-content ol { padding-left: 1.5em; margin: 0.8em 0; }
              .blog-content li { margin: 0.3em 0; }
              .blog-content hr { border: none; border-top: 2px solid #e2e8f0; margin: 2em 0; }
            `}</style>

            {/* Rating */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Rating Artikel</h3>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-900">{rating.avg?.toFixed(1) || "0.0"}</div>
                  <div className="text-sm text-slate-500">{rating.count || 0} rating</div>
                </div>
                <div className="flex-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button key={r} onMouseEnter={() => setHoverRating(r)} onMouseLeave={() => setHoverRating(0)} onClick={() => handleRating(r)} className="p-0.5 transition">
                        <Star className={`w-7 h-7 transition ${r <= (hoverRating || userRating) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Klik untuk memberi rating</p>
                </div>
              </div>
            </div>

            {/* Back */}
            <div className="text-center">
              <Link href="/blog" className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 font-medium text-sm">
                <ArrowLeft className="w-4 h-4" />Kembali ke Blog
              </Link>
            </div>
          </article>

          {/* ===== SIDEBAR (RIGHT) ===== */}
          <aside className="space-y-6">
            {/* Ad Banner */}
            <AdsterraBanner />

            {/* Comments */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-violet-500" />
                Komentar ({comments.length})
              </h3>

              {/* Comment Form */}
              <form onSubmit={handleComment} className="mb-5 space-y-3">
                <input type="text" value={commentForm.user_name} onChange={(e) => setCommentForm({ ...commentForm, user_name: e.target.value })}
                  placeholder="Nama *" required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition" />
                <input type="email" value={commentForm.email} onChange={(e) => setCommentForm({ ...commentForm, email: e.target.value })}
                  placeholder="Email (opsional)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition" />
                <textarea value={commentForm.content} onChange={(e) => setCommentForm({ ...commentForm, content: e.target.value })}
                  placeholder="Tulis komentar..." required rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focu transition resize-none" />
                <button type="submit" disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 transition shadow-lg shadow-violet-500/20">
                  <Send className="w-4 h-4" />{submitting ? "Mengirim..." : "Kirim"}
                </button>
              </form>

              {/* Comments List */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-xs">Belum ada komentar</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-2.5 p-3 bg-slate-50 rounded-xl">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {c.user_name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-slate-800">{c.user_name}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
      <AdsterraBanner />
    </>
  );
}
