"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { PlusCircle, Pen, Trash2, X, CheckCircle, AlertCircle, Search, Eye, EyeOff, ToggleLeft, ToggleRight, ExternalLink, Image, Upload } from "lucide-react";
import api from "@/lib/api";
import BlogEditor from "@/components/BlogEditor";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL = process.env.NEXT_PUBLIC_GOLANG_URL || "https://api.arvemart.com";

export default function AdminBlogArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const [formData, setFormData] = useState({
    title: "", slug: "", excerpt: "", content: "", category_id: "", author_name: "Admin",
    status: "draft", is_featured: false, meta_title: "", meta_desc: "", cover_image: null,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [articlesRes, categoriesRes] = await Promise.all([
        api.get("/api/admin/blog/articles"),
        api.get("/api/admin/blog/categories"),
      ]);
      setArticles(articlesRes?.data?.data || []);
      setCategories(categoriesRes?.data?.data || []);
    } catch (e) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = articles.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingArticle(null);
    setFormData({
      title: "", slug: "", excerpt: "", content: "", category_id: categories[0]?.id || "", author_name: "Admin",
      status: "draft", is_featured: false, meta_title: "", meta_desc: "", cover_image: null,
    });
    setPreviewImage(null);
    setIsModalOpen(true);
  };

  const openEdit = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title, slug: article.slug, excerpt: article.excerpt || "", content: article.content || "",
      category_id: article.category_id, author_name: article.author_name || "Admin", status: article.status,
      is_featured: article.is_featured, meta_title: article.meta_title || "", meta_desc: article.meta_desc || "", cover_image: null,
    });
    setPreviewImage(article.cover_image || null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) { toast.error("Judul wajib diisi"); return; }
    if (!formData.content.trim()) { toast.error("Konten wajib diisi"); return; }
    if (!formData.category_id) { toast.error("Pilih kategori"); return; }
    setSubmitting(true);

    const payload = new FormData();
    payload.append("title", formData.title);
    payload.append("slug", formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    payload.append("excerpt", formData.excerpt);
    payload.append("content", formData.content);
    payload.append("category_id", String(formData.category_id));
    payload.append("author_name", formData.author_name);
    payload.append("status", formData.status);
    payload.append("is_featured", String(formData.is_featured));
    payload.append("meta_title", formData.meta_title);
    payload.append("meta_desc", formData.meta_desc);
    if (formData.cover_image) payload.append("cover_image", formData.cover_image);

    try {
      if (editingArticle) {
        await api.put(`/api/admin/blog/articles/${editingArticle.id}`, payload, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Artikel diupdate");
      } else {
        await api.post("/api/admin/blog/articles", payload, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Artikel dibuat");
      }
      fetchData();
      setIsModalOpen(false);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (article) => {
    if (!window.confirm(`Hapus "${article.title}"?`)) return;
    try {
      await api.delete(`/api/admin/blog/articles/${article.id}`);
      toast.success("Berhasil dihapus");
      fetchData();
    } catch (e) {
      toast.error("Gagal menghapus");
    }
  };

  const handleToggle = async (article) => {
    try {
      await api.patch(`/api/admin/blog/articles/${article.id}/toggle`);
      toast.success(`Artikel ${article.status === "published" ? "diunpublish" : "dipublish"}`);
      fetchData();
    } catch (e) {
      toast.error("Gagal mengubah status");
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Artikel Blog</h1>
              <p className="text-gray-600 mt-2">Kelola semua artikel blog kamu</p>
            </div>
            <button onClick={openAdd} className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">
              <PlusCircle className="w-5 h-5 mr-2" /> Artikel Baru
            </button>
          </div>

          {/* Search */}
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari artikel..."
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <p className="text-sm text-gray-500 mt-3">Total: {filtered.length} artikel</p>
          </div>

          {/* Table */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="py-20 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" /></div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center text-gray-500">Tidak ada artikel</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Judul</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kategori</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Views</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filtered.map((article, idx) => (
                      <tr key={article.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 max-w-xs truncate">{article.title}</div>
                          <div className="text-xs text-gray-400">{article.author_name}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{article.category?.name || "-"}</td>
                        <td className="px-6 py-4">
                          <button onClick={() => handleToggle(article)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${
                            article.status === "published" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {article.status === "published" ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {article.status === "published" ? "Published" : "Draft"}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{article.view_count || 0}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(article)} className="px-3 py-1.5 text-xs border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
                              <Pen className="w-3.5 h-3.5 inline mr-1" />Edit
                            </button>
                            {article.status === "published" && (
                              <a href={`/blog/${article.slug}`} target="_blank" rel="noopener noreferrer"
                                className="px-3 py-1.5 text-xs border border-green-600 text-green-600 rounded-lg hover:bg-green-50">
                                <ExternalLink className="w-3.5 h-3.5 inline mr-1" />Lihat
                              </a>
                            )}
                            <button onClick={() => handleDelete(article)} className="px-3 py-1.5 text-xs border border-red-600 text-red-600 rounded-lg hover:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5 inline mr-1" />Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      <Transition show={isModalOpen} as={Fragment}>
        <Dialog onClose={() => setIsModalOpen(false)} className="relative z-50">
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-start justify-center p-4 pt-10">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-4xl bg-white rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      {editingArticle ? "Edit Artikel" : "Artikel Baru"}
                    </Dialog.Title>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="px-6 py-5 space-y-5">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Judul *</label>
                      <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500" placeholder="Judul artikel" />
                    </div>

                    {/* Slug & Author */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                        <input type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500" placeholder="auto-generate dari judul" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                        <input type="text" value={formData.author_name} onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>

                    {/* Category & Status */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                        <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500">
                          <option value="">Pilih kategori</option>
                          {categories.filter((c) => c.type === "article" || c.type === "both").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500">
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Featured</label>
                        <select value={String(formData.is_featured)} onChange={(e) => setFormData({ ...formData, is_featured: e.target.value === "true" })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500">
                          <option value="false">Tidak</option>
                          <option value="true">Ya</option>
                        </select>
                      </div>
                    </div>

                    {/* Excerpt */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt / Deskripsi Singkat</label>
                      <textarea value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Ringkasan artikel..." />
                    </div>

                    {/* Cover Image */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                          <Upload className="w-4 h-4" /> Pilih Gambar
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setFormData({ ...formData, cover_image: file });
                              setPreviewImage(URL.createObjectURL(file));
                            }
                          }} />
                        </label>
                        {previewImage && <img src={previewImage} alt="Preview" className="h-16 w-24 object-cover rounded-lg" />}
                      </div>
                    </div>

                    {/* Content Editor */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Konten *</label>
                      <BlogEditor
                        content={formData.content}
                        onChange={(html) => setFormData({ ...formData, content: html })}
                        placeholder="Tulis konten artikel di sini..."
                      />
                    </div>

                    {/* SEO */}
                    <div className="border-t border-gray-200 pt-5">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">SEO</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Meta Title</label>
                          <input type="text" value={formData.meta_title} onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500" placeholder="Judul untuk SEO" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Meta Description</label>
                          <textarea value={formData.meta_desc} onChange={(e) => setFormData({ ...formData, meta_desc: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Deskripsi untuk SEO" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
                    <button onClick={handleSubmit} disabled={submitting} className="px-6 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                      {submitting ? "Menyimpan..." : editingArticle ? "Update" : "Simpan"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
