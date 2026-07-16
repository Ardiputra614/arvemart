"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { PlusCircle, Pen, Trash2, X, CheckCircle, AlertCircle, Search, Eye, EyeOff, GripVertical } from "lucide-react";
import api from "@/lib/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdminBlogCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("add");
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({ name: "", slug: "", type: "both", description: "", is_active: true, order: 0 });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/blog/categories");
      setCategories(res?.data?.data || []);
    } catch (e) {
      toast.error("Gagal memuat kategori");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setModalType("add");
    setFormData({ name: "", slug: "", type: "both", description: "", is_active: true, order: 0 });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (cat) => {
    setModalType("edit");
    setSelected(cat);
    setFormData({ name: cat.name, slug: cat.slug, type: cat.type || "both", description: cat.description || "", is_active: cat.is_active, order: cat.order || 0 });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Nama wajib diisi";
    if (!formData.slug.trim()) errors.slug = "Slug wajib diisi";
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setSubmitting(true);

    const payload = new FormData();
    payload.append("name", formData.name.trim());
    payload.append("slug", formData.slug.trim());
    payload.append("type", formData.type);
    payload.append("description", formData.description);
    payload.append("is_active", String(formData.is_active));
    payload.append("order", String(formData.order));

    try {
      if (modalType === "add") {
        await api.post("/api/admin/blog/categories", payload, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Kategori ditambahkan");
      } else {
        await api.put(`/api/admin/blog/categories/${selected.id}`, payload, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Kategori diupdate");
      }
      fetchCategories();
      setIsModalOpen(false);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Hapus "${cat.name}"?`)) return;
    try {
      await api.delete(`/api/admin/blog/categories/${cat.id}`);
      toast.success("Berhasil dihapus");
      fetchCategories();
    } catch (e) {
      toast.error("Gagal menghapus");
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Kategori Blog</h1>
              <p className="text-gray-600 mt-2">Kelola kategori artikel dan cerita</p>
            </div>
            <button onClick={openAdd} className="inline-flex items-center px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition">
              <PlusCircle className="w-5 h-5 mr-2" /> Tambah Kategori
            </button>
          </div>

          {/* Search */}
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kategori..."
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <p className="text-sm text-gray-500 mt-3">Total: {filtered.length} kategori</p>
          </div>

          {/* Table */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="py-20 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto" /></div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center text-gray-500">Tidak ada kategori</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nama</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Slug</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tipe</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filtered.map((cat, idx) => (
                      <tr key={cat.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{cat.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">{cat.slug}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            cat.type === "article" ? "bg-blue-100 text-blue-800" :
                            cat.type === "story" ? "bg-amber-100 text-amber-800" :
                            "bg-purple-100 text-purple-800"
                          }`}>
                            {cat.type === "article" ? "Artikel" : cat.type === "story" ? "Cerita" : "Semua"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cat.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {cat.is_active ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {cat.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(cat)} className="px-3 py-1.5 text-xs border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
                              <Pen className="w-3.5 h-3.5 inline mr-1" />Edit
                            </button>
                            <button onClick={() => handleDelete(cat)} className="px-3 py-1.5 text-xs border border-red-600 text-red-600 rounded-lg hover:bg-red-50">
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

      {/* Modal */}
      <Transition show={isModalOpen} as={Fragment}>
        <Dialog onClose={() => setIsModalOpen(false)} className="relative z-50">
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-xl">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      {modalType === "add" ? "Tambah Kategori" : "Edit Kategori"}
                    </Dialog.Title>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
                      <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 ${formErrors.name ? "border-red-500" : "border-gray-300"}`} placeholder="Nama kategori" />
                      {formErrors.name && <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                      <input type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 ${formErrors.slug ? "border-red-500" : "border-gray-300"}`} placeholder="kategori-slug" />
                      {formErrors.slug && <p className="text-xs text-red-600 mt-1">{formErrors.slug}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
                      <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500">
                        <option value="both">Semua (Artikel & Cerita)</option>
                        <option value="article">Artikel saja</option>
                        <option value="story">Cerita saja</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                      <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500" rows={3} placeholder="Deskripsi singkat..." />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select value={String(formData.is_active)} onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "true" })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500">
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Urutan</label>
                        <input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500" />
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
                    <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                      {submitting ? "Menyimpan..." : "Simpan"}
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
