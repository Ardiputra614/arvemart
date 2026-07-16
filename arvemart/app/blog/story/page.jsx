"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, BookOpen, Clock, Star, ArrowRight, Feather, Layers, Eye } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_GOLANG_URL || "https://api.arvemart.com";

export default function StoryPage() {
  const [stories, setStories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchStories = async (pageNum = 1, cat = "", q = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: "12" });
      if (cat) params.set("category", cat);
      if (q) params.set("search", q);
      const res = await fetch(`${API_URL}/api/blog/stories?${params}`);
      const json = await res.json();
      setStories(json?.data || []);
      setTotalPages(json?.meta?.total_page || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/blog/categories?type=story`);
      const json = await res.json();
      setCategories(json?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { setPage(1); fetchStories(1, selectedCategory, search); }, [selectedCategory]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchStories(1, selectedCategory, search);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
          <Layers className="w-4 h-4" />
          Cerita Bersambung
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
          Baca <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">Cerita</span> Terbaru
        </h1>
        <p className="text-slate-500 max-w-lg mx-auto">
          Nikmati cerita bersambung dengan banyak halaman. Setiap halaman punya rating dan komentar tersendiri.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari cerita..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm transition"
          />
        </div>
      </form>

      {/* Categories */}
      <div className="flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory("")}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            !selectedCategory
              ? "bg-slate-900 text-white shadow-md"
              : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
          }`}
        >
          Semua
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.slug)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.slug
                ? "bg-slate-900 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Stories Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100 animate-pulse">
              <div className="aspect-[3/4] bg-slate-200" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Belum ada cerita</h3>
          <p className="text-slate-500 text-sm">Cerita menarik akan segera hadir!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-10">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => { setPage(p); fetchStories(p, selectedCategory, search); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                p === page
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StoryCard({ story }) {
  return (
    <Link href={`/blog/story/${story.slug}`} className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
      <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
        {story.cover_image ? (
          <img src={story.cover_image} alt={story.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
            <BookOpen className="w-16 h-16 text-amber-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-center gap-2 mb-2">
            {story.category && (
              <span className="bg-white/90 backdrop-blur-sm text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                {story.category.name}
              </span>
            )}
            <span className="bg-amber-500/90 text-white px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {story.total_pages || 0} hal
            </span>
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition line-clamp-2">
            {story.title}
          </h3>
        </div>
      </div>
      <div className="p-5">
        {story.description && (
          <p className="text-slate-500 text-sm line-clamp-2 mb-3">{story.description}</p>
        )}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {story.avg_rating?.toFixed(1) || "0.0"}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {story.view_count || 0}
            </span>
          </div>
          <span className="flex items-center gap-1 text-amber-600 font-medium group-hover:gap-2 transition-all">
            Baca <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
