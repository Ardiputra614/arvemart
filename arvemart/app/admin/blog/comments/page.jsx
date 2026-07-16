"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Trash2, CheckCircle, AlertCircle, Eye, Search } from "lucide-react";
import api from "@/lib/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdminBlogCommentsPage() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/blog/comments");
      setComments(res?.data?.data || []);
    } catch (e) {
      toast.error("Gagal memuat komentar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const filtered = comments.filter((c) => {
    const matchSearch =
      c.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.content?.toLowerCase().includes(search.toLowerCase());
    if (filter === "approved") return matchSearch && c.is_approved;
    if (filter === "pending") return matchSearch && !c.is_approved;
    return matchSearch;
  });

  const handleToggle = async (comment) => {
    try {
      await api.patch(`/api/admin/blog/comments/${comment.id}/toggle`);
      toast.success(comment.is_approved ? "Komentar disembunyikan" : "Komentar disetujui");
      fetchComments();
    } catch (e) {
      toast.error("Gagal mengubah status");
    }
  };

  const handleDelete = async (comment) => {
    if (!window.confirm(`Hapus komentar dari "${comment.user_name}"?`)) return;
    try {
      await api.delete(`/api/admin/blog/comments/${comment.id}`);
      toast.success("Komentar dihapus");
      fetchComments();
    } catch (e) {
      toast.error("Gagal menghapus");
    }
  };

  const getContentTitle = (c) => {
    if (c.article?.title) return `Artikel: ${c.article.title}`;
    if (c.story?.title) return `Cerita: ${c.story.title}`;
    if (c.story_page_id) return `Halaman Cerita #${c.story_page_id}`;
    return "-";
  };

  const approvedCount = comments.filter((c) => c.is_approved).length;
  const pendingCount = comments.filter((c) => !c.is_approved).length;

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Komentar Blog</h1>
            <p className="text-gray-600 mt-2">Kelola semua komentar dari artikel dan cerita</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">{comments.length}</div>
              <div className="text-sm text-gray-500">Total Komentar</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
              <div className="text-sm text-gray-500">Disetujui</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
              <div className="text-sm text-gray-500">Perlu Review</div>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari komentar atau nama..."
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                {[
                  { value: "all", label: "Semua" },
                  { value: "approved", label: "Disetujui" },
                  { value: "pending", label: "Perlu Review" },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      filter === f.value
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3">Menampilkan {filtered.length} komentar</p>
          </div>

          {/* Comments List */}
          <div className="space-y-3">
            {loading ? (
              <div className="py-20 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                Tidak ada komentar
              </div>
            ) : (
              filtered.map((comment) => (
                <div
                  key={comment.id}
                  className={`bg-white rounded-xl border p-5 transition ${
                    comment.is_approved ? "border-gray-200" : "border-amber-200 bg-amber-50/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{comment.user_name}</span>
                        {comment.email && (
                          <span className="text-xs text-gray-400">{comment.email}</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(comment.created_at).toLocaleDateString("id-ID", {
                            day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          comment.is_approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {comment.is_approved ? <CheckCircle className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                          {comment.is_approved ? "Disetujui" : "Review"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 text-xs mb-2">{getContentTitle(comment)}</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(comment)}
                        className={`px-3 py-1.5 text-xs border rounded-lg transition ${
                          comment.is_approved
                            ? "border-amber-600 text-amber-600 hover:bg-amber-50"
                            : "border-green-600 text-green-600 hover:bg-green-50"
                        }`}
                      >
                        {comment.is_approved ? (
                          <><Eye className="w-3.5 h-3.5 inline mr-1" />Sembunyikan</>
                        ) : (
                          <><CheckCircle className="w-3.5 h-3.5 inline mr-1" />Setujui</>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(comment)}
                        className="px-3 py-1.5 text-xs border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline mr-1" />Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
