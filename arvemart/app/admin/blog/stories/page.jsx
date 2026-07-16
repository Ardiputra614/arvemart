"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { PlusCircle, Pen, Trash2, X, CheckCircle, AlertCircle, Search, Eye, EyeOff, ExternalLink, Layers, ChevronUp, ChevronDown, BookOpen, Upload } from "lucide-react";
import api from "@/lib/api";
import BlogEditor from "@/components/BlogEditor";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdminBlogStoriesPage() {
  const [stories, setStories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Story modal
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [storyForm, setStoryForm] = useState({
    title: "", slug: "", description: "", category_id: "", author_name: "Admin",
    status: "draft", meta_title: "", meta_desc: "", cover_image: null,
  });
  const [previewImage, setPreviewImage] = useState(null);

  // Page modal
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [storyPages, setStoryPages] = useState([]);
  const [editingPage, setEditingPage] = useState(null);
  const [pageForm, setPageForm] = useState({ page_num: 1, title: "", content: "" });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [storiesRes, categoriesRes] = await Promise.all([
        api.get("/api/admin/blog/stories"),
        api.get("/api/admin/blog/categories"),
      ]);
      setStories(storiesRes?.data?.data || []);
      setCategories(categoriesRes?.data?.data || []);
    } catch (e) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = stories.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));

  // Story CRUD
  const openAddStory = () => {
    setEditingStory(null);
    setStoryForm({ title: "", slug: "", description: "", category_id: categories[0]?.id || "", author_name: "Admin", status: "draft", meta_title: "", meta_desc: "", cover_image: null });
    setPreviewImage(null);
    setIsStoryModalOpen(true);
  };

  const openEditStory = (story) => {
    setEditingStory(story);
    setStoryForm({
      title: story.title, slug: story.slug, description: story.description || "", category_id: story.category_id,
      author_name: story.author_name || "Admin", status: story.status, meta_title: story.meta_title || "", meta_desc: story.meta_desc || "", cover_image: null,
    });
    setPreviewImage(story.cover_image || null);
    setIsStoryModalOpen(true);
  };

  const handleStorySubmit = async () => {
    if (!storyForm.title.trim()) { toast.error("Judul wajib diisi"); return; }
    if (!storyForm.category_id) { toast.error("Pilih kategori"); return; }
    setSubmitting(true);

    const payload = new FormData();
    payload.append("title", storyForm.title);
    payload.append("slug", storyForm.slug || storyForm.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    payload.append("description", storyForm.description);
    payload.append("category_id", String(storyForm.category_id));
    payload.append("author_name", storyForm.author_name);
    payload.append("status", storyForm.status);
    payload.append("meta_title", storyForm.meta_title);
    payload.append("meta_desc", storyForm.meta_desc);
    if (storyForm.cover_image) payload.append("cover_image", storyForm.cover_image);

    try {
      if (editingStory) {
        await api.put(`/api/admin/blog/stories/${editingStory.id}`, payload, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Cerita diupdate");
      } else {
        await api.post("/api/admin/blog/stories", payload, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Cerita dibuat");
      }
      fetchData();
      setIsStoryModalOpen(false);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStory = async (story) => {
    if (!window.confirm(`Hapus "${story.title}" beserta semua halamannya?`)) return;
    try {
      await api.delete(`/api/admin/blog/stories/${story.id}`);
      toast.success("Berhasil dihapus");
      fetchData();
    } catch (e) {
      toast.error("Gagal menghapus");
    }
  };

  const handleToggleStory = async (story) => {
    try {
      await api.patch(`/api/admin/blog/stories/${story.id}/toggle`);
      toast.success(`Cerita ${story.status === "published" ? "diunpublish" : "dipublish"}`);
      fetchData();
    } catch (e) {
      toast.error("Gagal mengubah status");
    }
  };

  // Page management
  const openPages = async (story) => {
    setSelectedStory(story);
    try {
      const res = await api.get(`/api/admin/blog/stories/${story.id}`);
      setStoryPages(res?.data?.pages || []);
    } catch (e) {
      setStoryPages([]);
    }
    setIsPageModalOpen(true);
  };

  const openAddPage = () => {
    setEditingPage(null);
    setPageForm({ page_num: storyPages.length + 1, title: "", content: "" });
  };

  const openEditPage = (page) => {
    setEditingPage(page);
    setPageForm({ page_num: page.page_num, title: page.title || "", content: page.content });
  };

  const handlePageSubmit = async () => {
    if (!pageForm.content.trim()) { toast.error("Konten wajib diisi"); return; }
    setSubmitting(true);

    const payload = new FormData();
    payload.append("page_num", String(pageForm.page_num));
    payload.append("title", pageForm.title);
    payload.append("content", pageForm.content);

    try {
      if (editingPage) {
        await api.put(`/api/admin/blog/stories/${selectedStory.id}/pages/${editingPage.id}`, payload, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Halaman diupdate");
      } else {
        await api.post(`/api/admin/blog/stories/${selectedStory.id}/pages`, payload, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Halaman ditambahkan");
      }
      const res = await api.get(`/api/admin/blog/stories/${selectedStory.id}`);
      setStoryPages(res?.data?.pages || []);
      setEditingPage(null);
      setPageForm({ page_num: (res?.data?.pages?.length || 0) + 1, title: "", content: "" });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan halaman");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePage = async (page) => {
    if (!window.confirm("Hapus halaman ini?")) return;
    try {
      await api.delete(`/api/admin/blog/stories/${selectedStory.id}/pages/${page.id}`);
      toast.success("Halaman dihapus");
      const res = await api.get(`/api/admin/blog/stories/${selectedStory.id}`);
      setStoryPages(res?.data?.pages || []);
    } catch (e) {
      toast.error("Gagal menghapus");
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Cerita Blog</h1>
              <p className="text-gray-600 mt-2">Kelola cerita bersambung dengan banyak halaman</p>
            </div>
            <button onClick={openAddStory} className="inline-flex items-center px-4 py-2.5 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition">
              <PlusCircle className="w-5 h-5 mr-2" /> Cerita Baru
            </button>
          </div>

          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari cerita..."
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <p className="text-sm text-gray-500 mt-3">Total: {filtered.length} cerita</p>
          </div>

          {/* Stories Table */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="py-20 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto" /></div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center text-gray-500">Tidak ada cerita</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Judul</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kategori</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Halaman</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rating</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filtered.map((story, idx) => (
                      <tr key={story.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs truncate">{story.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{story.category?.name || "-"}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{story.total_pages || 0}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{story.avg_rating?.toFixed(1) || "0.0"}</td>
                        <td className="px-6 py-4">
                          <button onClick={() => handleToggleStory(story)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${
                            story.status === "published" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {story.status === "published" ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {story.status === "published" ? "Published" : "Draft"}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => openPages(story)} className="px-3 py-1.5 text-xs border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50">
                              <Layers className="w-3.5 h-3.5 inline mr-1" />Halaman
                            </button>
                            <button onClick={() => openEditStory(story)} className="px-3 py-1.5 text-xs border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
                              <Pen className="w-3.5 h-3.5 inline mr-1" />Edit
                            </button>
                            {story.status === "published" && (
                              <a href={`/blog/story/${story.slug}`} target="_blank" rel="noopener noreferrer"
                                className="px-3 py-1.5 text-xs border border-green-600 text-green-600 rounded-lg hover:bg-green-50">
                                <ExternalLink className="w-3.5 h-3.5 inline mr-1" />Lihat
                              </a>
                            )}
                            <button onClick={() => handleDeleteStory(story)} className="px-3 py-1.5 text-xs border border-red-600 text-red-600 rounded-lg hover:bg-red-50">
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

      {/* Story Modal */}
      <Transition show={isStoryModalOpen} as={Fragment}>
        <Dialog onClose={() => setIsStoryModalOpen(false)} className="relative z-50">
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-start justify-center p-4 pt-10">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      {editingStory ? "Edit Cerita" : "Cerita Baru"}
                    </Dialog.Title>
                    <button onClick={() => setIsStoryModalOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Judul *</label>
                      <input type="text" value={storyForm.title} onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-amber-500" placeholder="Judul cerita" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                        <input type="text" value={storyForm.slug} onChange={(e) => setStoryForm({ ...storyForm, slug: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-amber-500" placeholder="auto dari judul" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                        <input type="text" value={storyForm.author_name} onChange={(e) => setStoryForm({ ...storyForm, author_name: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-amber-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                        <select value={storyForm.category_id} onChange={(e) => setStoryForm({ ...storyForm, category_id: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-amber-500">
                          <option value="">Pilih kategori</option>
                          {categories.filter((c) => c.type === "story" || c.type === "both").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select value={storyForm.status} onChange={(e) => setStoryForm({ ...storyForm, status: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-amber-500">
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                      <textarea value={storyForm.description} onChange={(e) => setStoryForm({ ...storyForm, description: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-amber-500" rows={3} placeholder="Deskripsi cerita..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                          <Upload className="w-4 h-4" /> Pilih Gambar
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) { setStoryForm({ ...storyForm, cover_image: file }); setPreviewImage(URL.createObjectURL(file)); }
                          }} />
                        </label>
                        {previewImage && <img src={previewImage} alt="Preview" className="h-16 w-24 object-cover rounded-lg" />}
                      </div>
                    </div>
                  </div>
                  <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button onClick={() => setIsStoryModalOpen(false)} className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
                    <button onClick={handleStorySubmit} disabled={submitting} className="px-6 py-2.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium">
                      {submitting ? "Menyimpan..." : "Simpan"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Pages Manager Modal */}
      <Transition show={isPageModalOpen} as={Fragment}>
        <Dialog onClose={() => setIsPageModalOpen(false)} className="relative z-50">
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-start justify-center p-4 pt-10">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-4xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      <Layers className="w-5 h-5 inline mr-2 text-purple-500" />
                      Kelola Halaman: {selectedStory?.title}
                    </Dialog.Title>
                    <button onClick={() => setIsPageModalOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="w-5 h-5" /></button>
                  </div>

                  <div className="px-6 py-5">
                    {/* Existing Pages */}
                    {storyPages.length > 0 && (
                      <div className="mb-6 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700">Daftar Halaman ({storyPages.length})</h3>
                        {storyPages.map((page, idx) => (
                          <div key={page.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {page.page_num}
                            </div>
                            <div className="flex-1 min-w-0">
                              {page.title && <div className="text-sm font-medium text-gray-900">{page.title}</div>}
                              <div className="text-xs text-gray-500 line-clamp-2 mt-1">{page.content?.replace(/<[^>]+>/g, "").substring(0, 100)}...</div>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => openEditPage(page)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                <Pen className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeletePage(page)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add/Edit Page Form */}
                    <div className="border-t border-gray-200 pt-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        {editingPage ? `Edit Halaman ${editingPage.page_num}` : `Tambah Halaman ${pageForm.page_num}`}
                      </h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Halaman</label>
                            <input type="number" value={pageForm.page_num} onChange={(e) => setPageForm({ ...pageForm, page_num: parseInt(e.target.value) || 1 })}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-purple-500" min={1} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Halaman</label>
                            <input type="text" value={pageForm.title} onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-purple-500" placeholder="Judul (opsional)" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Konten *</label>
                          <BlogEditor
                            content={pageForm.content}
                            onChange={(html) => setPageForm({ ...pageForm, content: html })}
                            placeholder="Tulis konten halaman di sini..."
                          />
                        </div>
                        <div className="flex gap-3">
                          <button onClick={handlePageSubmit} disabled={submitting} className="px-5 py-2.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium">
                            {submitting ? "Menyimpan..." : editingPage ? "Update Halaman" : "Tambah Halaman"}
                          </button>
                          {editingPage && (
                            <button onClick={() => { setEditingPage(null); setPageForm({ page_num: storyPages.length + 1, title: "", content: "" }); }}
                              className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                              Batal Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
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
