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
  EyeIcon,
  EyeOffIcon,
  StarIcon,
  TagIcon,
  SettingsIcon,
} from "lucide-react";
import { Fragment, useState, useEffect, useCallback } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "@/lib/api";
import Image from "next/image";

export default function ServicePage() {
  // State management
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedService, setSelectedService] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    customer_no_format: "satu_input",
    field1_label: "User ID",
    field1_placeholder: "Masukkan User ID",
    field2_label: "",
    field2_placeholder: "",
    description: "",
    how_to_topup: "",
    notes: "",
    is_active: true,
    is_popular: false,
    logo: null,
    logo_public_id: null,
    icon: null,
    icon_public_id: null,
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const url = process.env.NEXT_PUBLIC_GOLANG_URL || "http://localhost:8080";

  // File preview states
  const [logoPreview, setLogoPreview] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeIcon, setRemoveIcon] = useState(false);

  // ✅ 1. Declare all callbacks first
  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`${url}/api/admin/services`);
      setServices(response.data.data);
    } catch (error) {
      toast.error("Gagal memuat data service");
    } finally {
      setLoading(false);
    }
  }, [url]);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`${url}/api/admin/categories`);
      setCategories(response.data.data);
    } catch (e) {
      toast.error("Gagal memuat data categories");
    } finally {
      setLoading(false);
    }
  }, [url]);

  const applyFilters = useCallback(() => {
    let filtered = [...services];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (service) =>
          service.name.toLowerCase().includes(searchLower) ||
          service.slug.toLowerCase().includes(searchLower) ||
          service.description?.toLowerCase().includes(searchLower),
      );
    }

    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      filtered = filtered.filter((service) => service.is_active === isActive);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (service) => service.category_id === parseInt(categoryFilter),
      );
    }

    setFilteredServices(filtered);
  }, [services, search, statusFilter, categoryFilter]);

  // ✅ 2. useEffects after callbacks
  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, [fetchServices, fetchCategories]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Search & filter handlers
  const handleSearch = (e) => setSearch(e.target.value);
  const handleStatusFilter = (e) => setStatusFilter(e.target.value);
  const handleCategoryFilter = (e) => setCategoryFilter(e.target.value);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
  };

  // Modal handlers
  const openAddModal = () => {
    setModalType("add");
    setSelectedService(null);
    setFormData({
      name: "",
      category_id: "",
      customer_no_format: "satu_input",
      field1_label: "User ID",
      field1_placeholder: "Masukkan User ID",
      field2_label: "",
      field2_placeholder: "",
      description: "",
      how_to_topup: "",
      notes: "",
      is_active: true,
      is_popular: false,
      logo: null,
      logo_public_id: null,
      icon: null,
      icon_public_id: null,
    });
    setFormErrors({});
    setLogoPreview(null);
    setIconPreview(null);
    setRemoveLogo(false);
    setRemoveIcon(false);
    setIsModalOpen(true);
  };

  const openEditModal = (service) => {
    setModalType("edit");
    setSelectedService(service);
    setFormData({
      name: service.name || "",
      category_id: service.category_id || "",
      customer_no_format: service.customer_no_format || "satu_input",
      field1_label: service.field1_label || "User ID",
      field1_placeholder: service.field1_placeholder || "Masukkan User ID",
      field2_label: service.field2_label || "",
      field2_placeholder: service.field2_placeholder || "",
      description: service.description || "",
      how_to_topup: service.how_to_topup || "",
      notes: service.notes || "",
      is_active: service.is_active ?? true,
      is_popular: service.is_popular ?? false,
      logo: service.logo ?? null,
      icon: service.icon ?? null,
      logo_public_id: service.logo_public_id ?? null,
      icon_public_id: service.icon_public_id ?? null,
    });
    setFormErrors({});
    setLogoPreview(service.logo ?? null);
    setIconPreview(service.icon ?? null);
    setRemoveLogo(false);
    setRemoveIcon(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalType("");
    setSelectedService(null);
    setFormErrors({});
  };

  // Form input handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }

    if (name === "customer_no_format" && value === "satu_input") {
      setFormData((prev) => ({
        ...prev,
        field2_label: "",
        field2_placeholder: "",
      }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];

    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("File harus berupa gambar");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 2MB");
        return;
      }

      setFormData((prev) => ({ ...prev, [name]: file }));

      const previewUrl = URL.createObjectURL(file);
      if (name === "logo") {
        setLogoPreview(previewUrl);
        setRemoveLogo(false);
      } else if (name === "icon") {
        setIconPreview(previewUrl);
        setRemoveIcon(false);
      }
    }
  };

  const handleRemoveFile = (type) => {
    if (type === "logo") {
      setLogoPreview(null);
      setRemoveLogo(true);
      setFormData((prev) => ({ ...prev, logo: null }));
    } else {
      setIconPreview(null);
      setRemoveIcon(true);
      setFormData((prev) => ({ ...prev, icon: null }));
    }
  };

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) errors.name = "Nama service wajib diisi";
    if (!formData.category_id) errors.category_id = "Kategori wajib dipilih";
    if (!formData.field1_label.trim())
      errors.field1_label = "Label field 1 wajib diisi";
    if (!formData.field1_placeholder.trim())
      errors.field1_placeholder = "Placeholder field 1 wajib diisi";

    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstError = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstError}"]`);
      if (element)
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);

    try {
      const formDataToSend = new FormData();

      Object.keys(formData).forEach((key) => {
        if (key === "logo" || key === "icon") {
          if (formData[key] instanceof File) {
            formDataToSend.append(key, formData[key]);
          }
        } else if (key === "is_active" || key === "is_popular") {
          formDataToSend.append(key, formData[key] ? "1" : "0");
        } else if (formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key]);
        }
      });

      if (modalType === "edit") {
        if (removeLogo) formDataToSend.append("remove_logo", "1");
        if (removeIcon) formDataToSend.append("remove_icon", "1");
      }

      let response;
      if (modalType === "add") {
        response = await api.post(`${url}/api/admin/services`, formDataToSend);
        const newService = response.data.data;
        setServices((prev) => [...prev, newService]);
        toast.success(`Service "${formData.name}" berhasil ditambahkan`);
      } else {
        response = await api.patch(
          `${url}/api/admin/services/${selectedService.id}`,
          formDataToSend,
        );
        const updatedService = response.data.data;
        setServices((prev) =>
          prev.map((service) =>
            service.id === selectedService.id ? updatedService : service,
          ),
        );
        toast.success(`Service "${updatedService.name}" berhasil diperbarui`);
      }

      closeModal();
    } catch (error) {
      console.error("Error saving service:", error);
      if (error.response?.status === 422) {
        setFormErrors(error.response.data.errors || {});
        toast.error("Validasi gagal, periksa kembali form Anda");
      } else {
        toast.error(
          error.response?.data?.message || "Terjadi kesalahan sistem",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (service) => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus service "${service.name}"?`,
      )
    ) {
      return;
    }

    try {
      await api.delete(`${url}/api/admin/services/${service.id}`);
      setServices((prev) => prev.filter((s) => s.id !== service.id));
      toast.success(`Service "${service.name}" berhasil dihapus`);
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("Gagal menghapus service");
    }
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <SettingsIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                      Service Management
                    </h1>
                    <p className="text-gray-600 mt-1">
                      Kelola semua layanan yang tersedia
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={openAddModal}
                className="inline-flex items-center justify-center px-5 py-3 bg-blue-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
              >
                <PlusCircleIcon className="w-5 h-5 mr-2" />
                Tambah Service Baru
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Services</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {services.length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50">
                  <TagIcon className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1" />
                  <span>
                    Aktif: {services.filter((s) => s.is_active).length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Popular</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {services.filter((s) => s.is_popular).length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-50">
                  <StarIcon className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600">Ditampilkan di homepage</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Kategori</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {categories.filter((c) => c.status).length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">C</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600">
                  Aktif: {categories.filter((c) => c.status).length}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Inactive</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {services.filter((s) => !s.is_active).length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-50">
                  <AlertCircleIcon className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600">Tidak ditampilkan</p>
              </div>
            </div>
          </div>

          {/* Filter and Search Section */}
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
                    placeholder="Cari service berdasarkan nama atau deskripsi..."
                    className="block text-black w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex text-black flex-col sm:flex-row gap-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FilterIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={handleStatusFilter}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <TagIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={handleCategoryFilter}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Semua Kategori</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {(search ||
                  statusFilter !== "all" ||
                  categoryFilter !== "all") && (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Filter info */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span>
                Menampilkan{" "}
                <span className="font-semibold text-gray-900">
                  {filteredServices.length}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-gray-900">
                  {services.length}
                </span>{" "}
                service
              </span>
              {(search ||
                statusFilter !== "all" ||
                categoryFilter !== "all") && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Filter: {search && `"${search}"`}{" "}
                  {search &&
                    (statusFilter !== "all" || categoryFilter !== "all") &&
                    "•"}
                  {statusFilter !== "all" &&
                    ` ${statusFilter === "active" ? "Aktif" : "Nonaktif"}`}
                  {(search || statusFilter !== "all") &&
                    categoryFilter !== "all" &&
                    " • "}
                  {categoryFilter !== "all" &&
                    ` ${categories.find((c) => c.id === parseInt(categoryFilter))?.name || categoryFilter}`}
                </span>
              )}
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Memuat data service...</p>
                </div>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="py-20 text-center">
                <div className="max-w-md mx-auto">
                  <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Service tidak ditemukan
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {search ||
                    statusFilter !== "all" ||
                    categoryFilter !== "all"
                      ? "Coba ubah filter pencarian Anda"
                      : "Belum ada service yang ditambahkan"}
                  </p>
                  {!search &&
                    statusFilter === "all" &&
                    categoryFilter === "all" && (
                      <button
                        onClick={openAddModal}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                      >
                        <PlusCircleIcon className="w-5 h-5 mr-2" />
                        Tambah Service Pertama
                      </button>
                    )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Kategori
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Format Input
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredServices.map((service) => (
                      <tr
                        key={service.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-12 w-12 from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center mr-3">
                              {service.logo ? (
                                <div className="h-10 w-10 rounded-md overflow-hidden">
                                  {/* Use next/image for better image optimization */}
                                  <div className="relative h-full w-full">
                                    <Image
                                      src={service.logo}
                                      alt={service.name}
                                      fill
                                      className="object-cover"
                                      sizes="40px"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-blue-600 font-bold text-lg">
                                  {service.name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-semibold text-gray-900">
                                  {service.name}
                                </p>
                                {service.is_popular && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    <StarIcon className="w-3 h-3 mr-1" />
                                    Popular
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {service.description?.substring(0, 50)}
                                {service.description?.length > 50 ? "..." : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {service.category?.name || "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              service.customer_no_format === "satu_input"
                                ? "bg-green-100 text-green-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {service.customer_no_format === "satu_input"
                              ? "Satu Input"
                              : "Dua Input"}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {service.field1_label}
                            {service.field2_label &&
                              ` + ${service.field2_label}`}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              service.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {service.is_active ? (
                              <>
                                <CheckCircleIcon className="w-3 h-3 mr-1" />
                                Aktif
                              </>
                            ) : (
                              <>
                                <AlertCircleIcon className="w-3 h-3 mr-1" />
                                Nonaktif
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openEditModal(service)}
                              className="inline-flex items-center px-3 py-1.5 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              <PenIcon className="w-4 h-4 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(service)}
                              className="inline-flex items-center px-3 py-1.5 text-sm border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <Trash2Icon className="w-4 h-4 mr-1" />
                              Hapus
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

      {/* Modal Component */}
      <Transition show={isModalOpen} as={Fragment}>
        <Dialog onClose={closeModal} className="relative z-50 text-black">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                  <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center justify-between">
                        <Dialog.Title className="text-lg font-semibold text-gray-900">
                          {modalType === "add"
                            ? "Tambah Service Baru"
                            : "Edit Service"}
                        </Dialog.Title>
                        <button
                          type="button"
                          onClick={closeModal}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <XIcon className="w-6 h-6" />
                        </button>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        Isi form berikut untuk{" "}
                        {modalType === "add" ? "menambahkan" : "mengubah"}{" "}
                        service
                      </p>
                    </div>

                    {/* Form Content */}
                    <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
                      {/* Error Summary */}
                      {Object.keys(formErrors).length > 0 && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center">
                            <AlertCircleIcon className="w-5 h-5 text-red-500 mr-2" />
                            <h4 className="text-sm font-medium text-red-800">
                              Perbaiki kesalahan berikut:
                            </h4>
                          </div>
                          <ul className="mt-2 text-sm text-red-600 space-y-1">
                            {Object.entries(formErrors).map(
                              ([field, message]) => (
                                <li key={field}>• {message}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Main Form Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-6">
                          {/* Basic Info */}
                          <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-700 flex items-center">
                              <SettingsIcon className="w-4 h-4 mr-2" />
                              Informasi Dasar
                            </h3>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nama Service *
                              </label>
                              <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="Contoh: Steam Wallet"
                                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                  formErrors.name
                                    ? "border-red-500"
                                    : "border-gray-300"
                                }`}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Kategori *
                              </label>
                              <select
                                name="category_id"
                                value={formData.category_id}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                  formErrors.category_id
                                    ? "border-red-500"
                                    : "border-gray-300"
                                }`}
                              >
                                <option value="">Pilih Kategori</option>
                                {categories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Format Input Customer *
                              </label>
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleInputChange({
                                      target: {
                                        name: "customer_no_format",
                                        value: "satu_input",
                                      },
                                    })
                                  }
                                  className={`px-4 py-3 border rounded-lg text-sm font-medium transition-colors ${
                                    formData.customer_no_format === "satu_input"
                                      ? "border-blue-600 bg-blue-50 text-blue-700"
                                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  Satu Input
                                  <p className="text-xs text-gray-500 mt-1">
                                    User ID saja
                                  </p>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleInputChange({
                                      target: {
                                        name: "customer_no_format",
                                        value: "dua_input",
                                      },
                                    })
                                  }
                                  className={`px-4 py-3 border rounded-lg text-sm font-medium transition-colors ${
                                    formData.customer_no_format === "dua_input"
                                      ? "border-blue-600 bg-blue-50 text-blue-700"
                                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  Dua Input
                                  <p className="text-xs text-gray-500 mt-1">
                                    User ID + Server ID
                                  </p>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Field Inputs */}
                          <div className="space-y-4 pt-6 border-t border-gray-200">
                            <h3 className="text-sm font-medium text-gray-700 flex items-center">
                              <TagIcon className="w-4 h-4 mr-2" />
                              Field Input Customer
                            </h3>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Label Field 1 *
                              </label>
                              <input
                                type="text"
                                name="field1_label"
                                value={formData.field1_label}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                  formErrors.field1_label
                                    ? "border-red-500"
                                    : "border-gray-300"
                                }`}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Placeholder Field 1 *
                              </label>
                              <input
                                type="text"
                                name="field1_placeholder"
                                value={formData.field1_placeholder}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                  formErrors.field1_placeholder
                                    ? "border-red-500"
                                    : "border-gray-300"
                                }`}
                              />
                            </div>

                            {formData.customer_no_format === "dua_input" && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Label Field 2
                                  </label>
                                  <input
                                    type="text"
                                    name="field2_label"
                                    value={formData.field2_label}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Placeholder Field 2
                                  </label>
                                  <input
                                    type="text"
                                    name="field2_placeholder"
                                    value={formData.field2_placeholder}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                          {/* Image Uploads */}
                          <div className="space-y-6">
                            <h3 className="text-sm font-medium text-gray-700 flex items-center">
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Upload Gambar
                            </h3>

                            {/* Logo Upload */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-3">
                                Logo Service
                                <span className="text-xs text-gray-500 ml-1">
                                  (Maks. 2MB, JPG/PNG/WEBP)
                                </span>
                              </label>
                              <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0">
                                  {logoPreview ? (
                                    <div className="relative">
                                      <div className="h-24 w-24 rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-100">
                                        {/* Use next/image for preview */}
                                        <div className="relative h-full w-full">
                                          <Image
                                            src={logoPreview}
                                            alt="Logo preview"
                                            fill
                                            className="object-cover"
                                            sizes="96px"
                                          />
                                        </div>
                                      </div>
                                      {modalType === "edit" && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveFile("logo")
                                          }
                                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                          <XIcon className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="h-24 w-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                                      <UploadIcon className="w-8 h-8 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <label className="block">
                                    <div className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                                      <div className="flex flex-col items-center justify-center space-y-2">
                                        <UploadIcon className="w-6 h-6 text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                          {logoPreview
                                            ? "Ganti Logo"
                                            : "Upload Logo"}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          Klik untuk memilih file
                                        </span>
                                      </div>
                                      <input
                                        type="file"
                                        name="logo"
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        className="hidden"
                                      />
                                    </div>
                                  </label>
                                  {modalType === "edit" && !logoPreview && (
                                    <p className="mt-2 text-xs text-gray-500">
                                      Biarkan kosong jika tidak ingin mengubah
                                      logo
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Icon Upload */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-3">
                                Icon Service
                                <span className="text-xs text-gray-500 ml-1">
                                  (Opsional, Maks. 2MB)
                                </span>
                              </label>
                              <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0">
                                  {iconPreview ? (
                                    <div className="relative">
                                      <div className="h-24 w-24 rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-100">
                                        <div className="relative h-full w-full">
                                          <Image
                                            src={iconPreview}
                                            alt="Icon preview"
                                            fill
                                            className="object-cover"
                                            sizes="96px"
                                          />
                                        </div>
                                      </div>
                                      {modalType === "edit" && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveFile("icon")
                                          }
                                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                          <XIcon className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="h-24 w-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                                      <ImageIcon className="w-8 h-8 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <label className="block">
                                    <div className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                                      <div className="flex flex-col items-center justify-center space-y-2">
                                        <UploadIcon className="w-6 h-6 text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                          {iconPreview
                                            ? "Ganti Icon"
                                            : "Upload Icon"}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          Klik untuk memilih file
                                        </span>
                                      </div>
                                      <input
                                        type="file"
                                        name="icon"
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        className="hidden"
                                      />
                                    </div>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Status Settings */}
                          <div className="pt-6 border-t border-gray-200">
                            <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                              <SettingsIcon className="w-4 h-4 mr-2" />
                              Pengaturan Status
                            </h3>

                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center">
                                  {formData.is_active ? (
                                    <EyeIcon className="w-5 h-5 text-green-600 mr-3" />
                                  ) : (
                                    <EyeOffIcon className="w-5 h-5 text-red-600 mr-3" />
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      Status Aktif
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formData.is_active
                                        ? "Service akan ditampilkan kepada customer"
                                        : "Service akan disembunyikan"}
                                    </p>
                                  </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleInputChange}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                              </div>

                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center">
                                  {formData.is_popular ? (
                                    <StarIcon className="w-5 h-5 text-yellow-600 mr-3" />
                                  ) : (
                                    <StarIcon className="w-5 h-5 text-gray-400 mr-3" />
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      Service Populer
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formData.is_popular
                                        ? "Ditampilkan di halaman utama sebagai rekomendasi"
                                        : "Tidak ditampilkan sebagai rekomendasi"}
                                    </p>
                                  </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    name="is_popular"
                                    checked={formData.is_popular}
                                    onChange={handleInputChange}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Text Areas */}
                      <div className="mt-8 pt-8 border-t border-gray-200 space-y-6">
                        <h3 className="text-sm font-medium text-gray-700 flex items-center">
                          <SettingsIcon className="w-4 h-4 mr-2" />
                          Informasi Tambahan
                        </h3>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Deskripsi Service
                          </label>
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows="3"
                            placeholder="Deskripsikan service secara singkat..."
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cara Topup
                          </label>
                          <textarea
                            name="how_to_topup"
                            value={formData.how_to_topup}
                            onChange={handleInputChange}
                            rows="3"
                            placeholder="Instruksi cara melakukan topup..."
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Catatan Tambahan
                          </label>
                          <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows="2"
                            placeholder="Catatan penting lainnya..."
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? (
                            <>
                              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                              {modalType === "add"
                                ? "Menyimpan..."
                                : "Memperbarui..."}
                            </>
                          ) : modalType === "add" ? (
                            "Simpan Service"
                          ) : (
                            "Perbarui Service"
                          )}
                        </button>
                      </div>
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
