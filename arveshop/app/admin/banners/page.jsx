"use client";

import {
  PlusCircleIcon,
  SearchIcon,
  PenIcon,
  Trash2Icon,
  XIcon,
  UploadIcon,
  ImageIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  FilterIcon,
  PanelTop,
} from "lucide-react";
import { Fragment, useState, useEffect, useCallback } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "@/lib/api";
import Image from "next/image";

export default function BannerPage() {
  const [banners, setBanners] = useState([]);
  const [filteredBanners, setFilteredBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedBanner, setSelectedBanner] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    link: "",
    order: 0,
    is_active: true,
    image: null,
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const url = process.env.NEXT_PUBLIC_GOLANG_URL || "http://localhost:8080";

  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`${url}/api/admin/banners`);
      setBanners(response.data.data);
    } catch (error) {
      toast.error("Gagal memuat data banner");
    } finally {
      setLoading(false);
    }
  }, [url]);

  const applyFilters = useCallback(() => {
    let filtered = [...banners];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((b) =>
        statusFilter === "active" ? b.is_active : !b.is_active,
      );
    }
    setFilteredBanners(filtered);
  }, [banners, search, statusFilter]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleSearch = (e) => setSearch(e.target.value);
  const handleStatusFilter = (e) => setStatusFilter(e.target.value);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const openAddModal = () => {
    setModalType("add");
    setSelectedBanner(null);
    setFormData({
      title: "",
      description: "",
      link: "",
      order: 0,
      is_active: true,
      image: null,
    });
    setFormErrors({});
    setImagePreview(null);
    setRemoveImage(false);
    setIsModalOpen(true);
  };

  const openEditModal = (banner) => {
    setModalType("edit");
    setSelectedBanner(banner);
    setFormData({
      title: banner.title || "",
      description: banner.description || "",
      link: banner.link || "",
      order: banner.order || 0,
      is_active: banner.is_active ?? true,
      image: null,
    });
    setFormErrors({});
    setImagePreview(banner.image ?? null);
    setRemoveImage(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalType("");
    setSelectedBanner(null);
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? parseInt(value) || 0 : value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("File harus berupa gambar");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 2MB");
        return;
      }
      setFormData((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
      setRemoveImage(false);
    }
  };

  const handleRemoveFile = () => {
    setImagePreview(null);
    setRemoveImage(true);
    setFormData((prev) => ({ ...prev, image: null }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = "Judul banner wajib diisi";
    if (modalType === "add" && !formData.image && !imagePreview)
      errors.image = "Gambar banner wajib diupload";
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append("title", formData.title);
      if (formData.description) fd.append("description", formData.description);
      if (formData.link) fd.append("link", formData.link);
      fd.append("order", formData.order.toString());
      fd.append("is_active", formData.is_active ? "1" : "0");
      if (formData.image instanceof File) {
        fd.append("image", formData.image);
      }

      let response;
      if (modalType === "add") {
        response = await api.post(`${url}/api/admin/banners`, fd);
        setBanners((prev) => [...prev, response.data.data]);
        toast.success(`Banner "${formData.title}" berhasil ditambahkan`);
      } else {
        if (removeImage) fd.append("remove_image", "1");
        response = await api.put(
          `${url}/api/admin/banners/${selectedBanner.id}`,
          fd,
        );
        const updated = response.data.data;
        setBanners((prev) =>
          prev.map((b) => (b.id === selectedBanner.id ? updated : b)),
        );
        toast.success(`Banner "${updated.title}" berhasil diperbarui`);
      }

      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (banner) => {
    if (!window.confirm(`Hapus banner "${banner.title}"?`)) return;
    try {
      await api.delete(`${url}/api/admin/banners/${banner.id}`);
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
      toast.success(`Banner "${banner.title}" berhasil dihapus`);
    } catch (error) {
      toast.error("Gagal menghapus banner");
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} theme="light" />

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <PanelTop className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                      Banner Management
                    </h1>
                    <p className="text-gray-600 mt-1">
                      Kelola banner slideshow homepage
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-5 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-md"
              >
                <PlusCircleIcon className="w-5 h-5 mr-2" />
                Tambah Banner Baru
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Banner</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{banners.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-indigo-50">
                  <PanelTop className="w-8 h-8 text-indigo-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Aktif</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {banners.filter((b) => b.is_active).length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-50">
                  <CheckCircleIcon className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Nonaktif</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {banners.filter((b) => !b.is_active).length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-50">
                  <AlertCircleIcon className="w-8 h-8 text-red-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={search}
                    onChange={handleSearch}
                    placeholder="Cari banner..."
                    className="block text-black w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={handleStatusFilter}
                    className="block text-black w-full pl-3 pr-8 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
                {(search || statusFilter !== "all") && (
                  <button onClick={resetFilters} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="py-20 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Memuat data...</p>
              </div>
            ) : filteredBanners.length === 0 ? (
              <div className="py-20 text-center">
                <PanelTop className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada banner</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Banner</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Link</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Urutan</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredBanners.map((banner) => (
                      <tr key={banner.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-16 w-28 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                              {banner.image ? (
                                <Image src={banner.image} alt={banner.title} fill className="object-cover" sizes="112px" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{banner.title}</p>
                              {banner.description && (
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{banner.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 max-w-[200px] block truncate">
                            {banner.link || "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900 font-medium">{banner.order}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            banner.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {banner.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button onClick={() => openEditModal(banner)}
                              className="inline-flex items-center px-3 py-1.5 text-sm border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50">
                              <PenIcon className="w-4 h-4 mr-1" /> Edit
                            </button>
                            <button onClick={() => handleDelete(banner)}
                              className="inline-flex items-center px-3 py-1.5 text-sm border border-red-600 text-red-600 rounded-lg hover:bg-red-50">
                              <Trash2Icon className="w-4 h-4 mr-1" /> Hapus
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
        <Dialog onClose={closeModal} className="relative z-50 text-black">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                  <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                      <div className="flex items-center justify-between">
                        <Dialog.Title className="text-lg font-semibold text-gray-900">
                          {modalType === "add" ? "Tambah Banner Baru" : "Edit Banner"}
                        </Dialog.Title>
                        <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-500">
                          <XIcon className="w-6 h-6" />
                        </button>
                      </div>
                    </div>

                    <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-6">
                      {Object.keys(formErrors).length > 0 && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <ul className="text-sm text-red-600 space-y-1">
                            {Object.entries(formErrors).map(([f, m]) => (
                              <li key={f}>• {m}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Judul Banner *</label>
                        <input type="text" name="title" value={formData.title} onChange={handleInputChange}
                          placeholder="Contoh: Promo Akhir Tahun"
                          className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${formErrors.title ? "border-red-500" : "border-gray-300"}`} />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                        <textarea name="description" value={formData.description} onChange={handleInputChange} rows={2}
                          placeholder="Deskripsi singkat banner"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Link (Opsional)</label>
                          <input type="text" name="link" value={formData.link} onChange={handleInputChange}
                            placeholder="https://..."
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Urutan</label>
                          <input type="number" name="order" value={formData.order} onChange={handleInputChange}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Gambar Banner *
                          <span className="text-xs text-gray-500 ml-1">(Maks. 2MB, JPG/PNG/WEBP, ukuran landscape)</span>
                        </label>
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            {imagePreview ? (
                              <div className="relative">
                                <div className="h-28 w-48 rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-100 relative">
                                  <Image src={imagePreview} alt="Preview" fill className="object-cover" sizes="192px" />
                                </div>
                                {modalType === "edit" && (
                                  <button type="button" onClick={handleRemoveFile}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                                    <XIcon className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="h-28 w-48 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                                <ImageIcon className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <label>
                              <div className="px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer text-center">
                                <UploadIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                                <span className="text-sm text-gray-600 block">
                                  {imagePreview ? "Ganti Gambar" : "Upload Gambar"}
                                </span>
                                <span className="text-xs text-gray-500">Klik untuk memilih file</span>
                                <input type="file" name="image" onChange={handleFileChange} accept="image/*" className="hidden" />
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input type="checkbox" name="is_active" id="is_active" checked={formData.is_active}
                          onChange={handleInputChange} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Aktif</label>
                      </div>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                      <button type="button" onClick={closeModal}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                        Batal
                      </button>
                      <button type="submit" disabled={submitting}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                        {submitting ? "Menyimpan..." : modalType === "add" ? "Simpan" : "Perbarui"}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
