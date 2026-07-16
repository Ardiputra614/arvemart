"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star, MessageCircle, Send, Eye, Layers, ArrowLeft, BookOpen } from "lucide-react";
import { AdsterraBanner, MonetagInPagePush } from "@/components/GoogleAd";

const API_URL = process.env.NEXT_PUBLIC_GOLANG_URL || "https://api.arvemart.com";

export default function StoryReaderPage({ params }) {
  const { slug } = use(params);
  const [story, setStory] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [comments, setComments] = useState([]);
  const [rating, setRating] = useState({ avg: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [commentForm, setCommentForm] = useState({ user_name: "", email: "", content: "" });
  const [submitting, setSubmitting] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => { fetchStory(); }, [slug]);

  const fetchStory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/blog/stories/${slug}`);
      const json = await res.json();
      setStory(json?.data);
      setPages(json?.pages || []);
      if (json?.data?.title) {
        document.title = `${json.data.title} | ARVE Blog`;
      }
      if (json?.data?.id) {
        fetchComments(json.data.id);
        fetchRating(json.data.id);
        fetch(`${API_URL}/api/blog/views`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ story_id: json.data.id }),
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (storyId, storyPageId = null) => {
    try {
      let url = `${API_URL}/api/blog/comments?story_id=${storyId}`;
      if (storyPageId) url = `${API_URL}/api/blog/comments?story_page_id=${storyPageId}`;
      const res = await fetch(url);
      const json = await res.json();
      setComments(json?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRating = async (storyId) => {
    try {
      const res = await fetch(`${API_URL}/api/blog/ratings?story_id=${storyId}`);
      const json = await res.json();
      setRating(json?.data || { avg: 0, count: 0 });
    } catch (e) {
      console.error(e);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentForm.user_name.trim() || !commentForm.content.trim()) return;
    setSubmitting(true);
    try {
      const pageData = pages[currentPage];
      await fetch(`${API_URL}/api/blog/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...commentForm, story_id: story.id, story_page_id: pageData?.id || null }),
      });
      setCommentForm({ user_name: "", email: "", content: "" });
      fetchComments(story.id, pageData?.id);
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
        body: JSON.stringify({ story_id: story.id, rating: r }),
      });
      fetchRating(story.id);
    } catch (e) {
      console.error(e);
    }
  };

  const goToPage = (idx) => {
    if (idx >= 0 && idx < pages.length) {
      setCurrentPage(idx);
      if (story?.id) fetchComments(story.id, pages[idx]?.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-2/3" />
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

  if (!story) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-700 mb-4">Cerita tidak ditemukan</h2>
        <Link href="/blog/story" className="text-amber-600 hover:underline">Kembali ke Daftar Cerita</Link>
      </div>
    );
  }

  const pageData = pages[currentPage];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Back nav */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/blog/story" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-amber-600 transition">
          <ArrowLeft className="w-4 h-4" />Daftar Cerita
        </Link>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Eye className="w-3.5 h-3.5" />{story.view_count || 0} pembaca
        </div>
      </div>

      {/* Story Header */}
      <div className="text-center mb-8">
        {story.category && (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-medium mb-3">
            {story.category.name}
          </span>
        )}
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">{story.title}</h1>
        <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
          <span>{story.author_name}</span>
          <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" />{pages.length} halaman</span>
          <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{rating.avg?.toFixed(1) || "0.0"} ({rating.count || 0})</span>
        </div>
      </div>

      {/* Cover (only on page 0) */}
      {story.cover_image && currentPage === 0 && (
        <div className="mb-8 rounded-2xl overflow-hidden shadow-lg max-w-3xl mx-auto">
          <img src={story.cover_image} alt={story.title} className="w-full object-cover max-h-[400px]" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        {/* ===== MAIN CONTENT (LEFT) ===== */}
        <div>
          {/* Page Navigator */}
          {pages.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700">Halaman {currentPage + 1} dari {pages.length}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === pages.length - 1} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }} />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {pages.map((p, idx) => (
                  <button key={p.id} onClick={() => goToPage(idx)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${idx === currentPage ? "bg-amber-500 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Page Content */}
          {pageData ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 mb-6">
              {pageData.title && <h2 className="text-xl font-bold text-slate-900 mb-4">{pageData.title}</h2>}
              {pageData.image && (
                <div className="mb-6 rounded-xl overflow-hidden">
                  <img src={pageData.image} alt={`Page ${currentPage + 1}`} className="w-full object-cover max-h-[400px]" />
                </div>
              )}
              <div
                className="blog-content text-slate-900"
                dangerouslySetInnerHTML={{ __html: pageData.content }}
              />
              <style>{`
                .blog-content p { margin: 1.2em 0; line-height: 1.8; }
                .blog-content h2 { font-size: 1.5em; font-weight: 700; margin: 1.5em 0 0.6em; color: #0f172a; }
                .blog-content h3 { font-size: 1.25em; font-weight: 600; margin: 1.2em 0 0.5em; color: #0f172a; }
                .blog-content img {
                  max-width: 100%; height: auto; display: block;
                  margin: 2em auto; border-radius: 12px;
                  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
                }
                .blog-content a { color: #d97706; text-decoration: underline; }
                .blog-content a:hover { color: #b45309; }
                .blog-content blockquote {
                  border-left: 4px solid #f59e0b; background: #fffbeb;
                  padding: 0.75em 1em; margin: 1.5em 0;
                  border-radius: 0 8px 8px 0; color: #475569;
                }
                .blog-content pre {
                  background: #1e293b; color: #e2e8f0;
                  padding: 1em; border-radius: 8px;
                  overflow-x: auto; margin: 1.5em 0;
                }
                .blog-content code {
                  background: #f1f5f9; padding: 0.15em 0.4em;
                  border-radius: 4px; font-size: 0.9em; color: #d97706;
                }
                .blog-content pre code { background: none; padding: 0; color: inherit; }
                .blog-content ul, .blog-content ol { padding-left: 1.5em; margin: 0.8em 0; }
                .blog-content li { margin: 0.3em 0; }
                .blog-content hr { border: none; border-top: 2px solid #e2e8f0; margin: 2em 0; }
              `}</style>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3" />
              <p>Belum ada konten halaman ini</p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:border-slate-300 disabled:opacity-30 transition">
              <ChevronLeft className="w-4 h-4" />Sebelumnya
            </button>
            <span className="text-sm text-slate-400">{currentPage + 1} / {pages.length}</span>
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === pages.length - 1}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:border-slate-300 disabled:opacity-30 transition">
              Selanjutnya<ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Rating */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Rating Cerita</h3>
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
        </div>

        {/* ===== SIDEBAR (RIGHT) ===== */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {/* Ad Banner */}
          <AdsterraBanner />

          {/* Comments */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-amber-500" />
              Komentar Hal. {currentPage + 1} ({comments.length})
            </h3>

            <form onSubmit={handleComment} className="mb-5 space-y-3">
              <input type="text" value={commentForm.user_name} onChange={(e) => setCommentForm({ ...commentForm, user_name: e.target.value })}
                placeholder="Nama *" required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition" />
              <input type="email" value={commentForm.email} onChange={(e) => setCommentForm({ ...commentForm, email: e.target.value })}
                placeholder="Email (opsional)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition" />
              <textarea value={commentForm.content} onChange={(e) => setCommentForm({ ...commentForm, content: e.target.value })}
                placeholder="Tulis komentar untuk halaman ini..." required rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition resize-none" />
              <button type="submit" disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition shadow-lg shadow-amber-500/20">
                <Send className="w-4 h-4" />{submitting ? "Mengirim..." : "Kirim"}
              </button>
            </form>

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
                        <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
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
      <AdsterraBanner />
    </div>
  );
}
