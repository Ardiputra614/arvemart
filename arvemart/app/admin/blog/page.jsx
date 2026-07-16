"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { BookOpen, Layers, FileText, MessageCircle, Eye, TrendingUp, Plus, ArrowRight } from "lucide-react";
import api from "@/lib/api";

export default function AdminBlogPage() {
  const [stats, setStats] = useState({ articles: 0, stories: 0, categories: 0, comments: 0 });
  const [recentArticles, setRecentArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [articlesRes, storiesRes, categoriesRes, commentsRes] = await Promise.all([
        api.get("/api/admin/blog/articles").catch(() => ({ data: { data: [] } })),
        api.get("/api/admin/blog/stories").catch(() => ({ data: { data: [] } })),
        api.get("/api/admin/blog/categories").catch(() => ({ data: { data: [] } })),
        api.get("/api/admin/blog/comments").catch(() => ({ data: { data: [] } })),
      ]);

      const articles = articlesRes?.data?.data || [];
      const stories = storiesRes?.data?.data || [];
      const categories = categoriesRes?.data?.data || [];
      const comments = commentsRes?.data?.data || [];

      setStats({
        articles: articles.length,
        stories: stories.length,
        categories: categories.length,
        comments: comments.length,
      });
      setRecentArticles(articles.slice(0, 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { label: "Artikel", value: stats.articles, icon: <FileText className="w-5 h-5" />, color: "from-blue-500 to-blue-600", href: "/admin/blog/articles" },
    { label: "Cerita", value: stats.stories, icon: <Layers className="w-5 h-5" />, color: "from-amber-500 to-orange-500", href: "/admin/blog/stories" },
    { label: "Kategori", value: stats.categories, icon: <BookOpen className="w-5 h-5" />, color: "from-green-500 to-emerald-500", href: "/admin/blog/categories" },
    { label: "Komentar", value: stats.comments, icon: <MessageCircle className="w-5 h-5" />, color: "from-purple-500 to-violet-500", href: "#" },
  ];

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Blog Management</h1>
            <p className="text-gray-600 mt-2">Kelola artikel, cerita, dan kategori blog kamu</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/blog/articles" className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition text-sm">
              <FileText className="w-4 h-4 mr-2" /> Artikel
            </Link>
            <Link href="/admin/blog/stories" className="inline-flex items-center px-4 py-2.5 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition text-sm">
              <Layers className="w-4 h-4 mr-2" /> Cerita
            </Link>
            <Link href="/admin/blog/categories" className="inline-flex items-center px-4 py-2.5 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition text-sm">
              <BookOpen className="w-4 h-4 mr-2" /> Kategori
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {cards.map((card) => (
            <Link key={card.label} href={card.href} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? "..." : card.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition`}>
                  {card.icon}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Articles */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Artikel Terbaru</h2>
            <Link href="/admin/blog/articles" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Lihat Semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Judul</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Views</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : recentArticles.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Belum ada artikel</td></tr>
                ) : (
                  recentArticles.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs truncate">{a.title}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          a.status === "published" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {a.status === "published" ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{a.view_count || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(a.created_at).toLocaleDateString("id-ID")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
