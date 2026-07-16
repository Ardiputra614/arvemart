"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Clock, Eye, Tag, ArrowRight, BookOpen, Feather, TrendingUp, ChevronRight } from "lucide-react";
import { AdsterraBanner, MonetagInPagePush } from "@/components/GoogleAd";

const API_URL = process.env.NEXT_PUBLIC_GOLANG_URL || "https://api.arvemart.com";

export default function BlogPage() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState(null);

  const fetchArticles = async (pageNum = 1, cat = "", q = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: "9", status: "published" });
      if (cat) params.set("category", cat);
      if (q) params.set("search", q);
      const res = await fetch(`${API_URL}/api/blog/articles?${params}`);
      const json = await res.json();
      const data = json?.data || [];
      const meta = json?.meta || {};
      setArticles(data);
      setTotalPages(meta.total_page || 1);
      if (pageNum === 1 && !cat && !q && data.length > 0) {
        setFeatured(data[0]);
        setArticles(data.slice(1));
      } else {
        setFeatured(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/blog/categories?type=article`);
      const json = await res.json();
      setCategories(json?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { setPage(1); fetchArticles(1, selectedCategory, search); }, [selectedCategory]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchArticles(1, selectedCategory, search);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
          <BookOpen className="w-4 h-4" />
          Blog & Artikel
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
          Jelajahi Artikel <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">Terbaru</span>
        </h1>
        <p className="text-slate-500 max-w-lg mx-auto">
          Temukan artikel menarik seputar tips, trik, berita, dan panduan dari ARVE Blog.
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
            placeholder="Cari artikel..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 shadow-sm transition"
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

      {/* Featured */}
      {featured && !search && !selectedCategory && (
        <Link href={`/blog/${featured.slug}`} className="block mb-10 group">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 aspect-[2/1]">
            {featured.cover_image && (
              <img src={featured.cover_image} alt={featured.title} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition duration-500" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <div className="flex items-center gap-3 mb-3">
                {featured.category && (
                  <span className="inline-flex items-center gap-1 bg-violet-600/80 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                    <Tag className="w-3 h-3" />
                    {featured.category.name}
                  </span>
                )}
                <span className="text-white/60 text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(featured.published_at || featured.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 group-hover:text-violet-300 transition line-clamp-2">
                {featured.title}
              </h2>
              {featured.excerpt && (
                <p className="text-white/70 text-sm md:text-base max-w-2xl line-clamp-2">{featured.excerpt}</p>
              )}
            </div>
          </div>
        </Link>
      )}

      {page === 1 && !selectedCategory && !search && (
        <AdsterraBanner height={60} width={728} />
      )}
      <MonetagInPagePush />

      {/* Articles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100 animate-pulse">
              <div className="aspect-video bg-slate-200" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-full" />
                <div className="h-3 bg-slate-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : articles.length === 0 && !featured ? (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Belum ada artikel</h3>
          <p className="text-slate-500 text-sm">Artikel akan segera hadir. Nantikan terus!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-10">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => { setPage(p); fetchArticles(p, selectedCategory, search); window.scrollTo({ top: 0, behavior: "smooth" }); }}
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

function ArticleCard({ article }) {
  return (
    <Link href={`/blog/${article.slug}`} className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300">
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        {article.cover_image ? (
          <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-50">
            <Feather className="w-10 h-10 text-violet-300" />
          </div>
        )}
        {article.category && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-slate-700 px-3 py-1 rounded-full text-xs font-medium shadow-sm">
            {article.category.name}
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(article.published_at || article.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {article.view_count || 0}
          </span>
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-violet-600 transition">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-slate-500 text-sm line-clamp-2 mb-3">{article.excerpt}</p>
        )}
        <span className="inline-flex items-center gap-1 text-violet-600 text-sm font-medium group-hover:gap-2 transition-all">
          Baca selengkapnya <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  );
}
