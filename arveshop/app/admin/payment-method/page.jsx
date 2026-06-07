"use client";

import {
  PenIcon,
  PlusCircleIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
  UploadIcon,
  AlertCircleIcon,
  CreditCardIcon,
  CheckCircleIcon,
  FilterIcon,
  DollarSignIcon,
  PercentIcon,
} from "lucide-react";
import { Fragment, useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "@/lib/api";
import Image from "next/image";
import axios from "axios";

// Komponen FormatRupiah untuk display
const FormatRupiah = ({ value, className = "" }) => {
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "Rp 0";

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return <span className={className}>{formatCurrency(value)}</span>;
};

// Komponen FormatRupiahInput - SIMPLE VERSION
const FormatRupiahInput = ({
  id,
  value,
  onChange,
  className = "",
  placeholder = "0",
  disabled = false,
  error = false,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState("");

  // Format number to Rupiah
  const formatRupiah = useCallback((number) => {
    if (!number && number !== 0) return "";
    const numericValue = number.toString().replace(/\D/g, "");
    if (!numericValue) return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(numericValue));
  }, []);

  // Parse Rupiah to number
  const parseRupiah = useCallback((formattedString) => {
    if (!formattedString) return "";
    return formattedString
      .replace("Rp", "")
      .replace(/\./g, "")
      .replace(/\s/g, "")
      .trim();
  }, []);

  // Update display value when value prop changes
  useEffect(() => {
    setDisplayValue(formatRupiah(value));
  }, [value, formatRupiah]);

  const handleChange = (e) => {
    const rawValue = parseRupiah(e.target.value);
    setDisplayValue(formatRupiah(rawValue));

    if (onChange) {
      const event = {
        ...e,
        target: {
          ...e.target,
          id: id,
          value: rawValue,
          name: props.name || id,
        },
      };
      onChange(event);
    }
  };

  const handleFocus = (e) => {
    e.target.select();
  };

  const handleKeyDown = (e) => {
    const allowedKeys = [8, 9, 13, 27, 46, 37, 38, 39, 40];
    if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) {
      return;
    }
    if (
      (e.keyCode >= 48 && e.keyCode <= 57) ||
      (e.keyCode >= 96 && e.keyCode <= 105)
    ) {
      return;
    }
    if (!allowedKeys.includes(e.keyCode)) {
      e.preventDefault();
    }
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <DollarSignIcon className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        id={id}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? "border-red-500" : "border-gray-300"
        } ${disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white"} ${className}`}
        autoComplete="off"
        {...props}
      />
    </div>
  );
};

export default function PaymentMethodPage() {
  // State management
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [filteredMethods, setFilteredMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const url = process.env.NEXT_PUBLIC_GOLANG_URL || "http://localhost:8080";

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(""); // "add" or "edit"
  const [selectedMethod, setSelectedMethod] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    percentage_fee: null,
    nominal_fee: null,
    type: "",
    fee_type: "",
    is_active: true,
    logo: null,
    logo_public_id: null,
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // File upload states
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  const fetchPaymentMethod = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`${url}/api/admin/payment-method`);
      setPaymentMethods(response.data.data);
    } catch (error) {
      toast.error("Gagal memuat data payment method");
      console.error("Error fetching payment methods:", error);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchPaymentMethod();
  }, [fetchPaymentMethod]);

  // Apply filters
  useEffect(() => {
    let filtered = [...paymentMethods];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (method) =>
          (method.name || "").toLowerCase().includes(searchLower) ||
          (method.code || "").toLowerCase().includes(searchLower) ||
          (method.type || "").toLowerCase().includes(searchLower),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (method) => method.is_active === (statusFilter === "true"),
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((method) => method.type === typeFilter);
    }

    setFilteredMethods(filtered);
  }, [paymentMethods, search, statusFilter, typeFilter]);

  // Search handler
  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  // Filter handlers
  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
  };

  const handleTypeFilter = (e) => {
    setTypeFilter(e.target.value);
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  // Open Add Modal
  const openAddModal = () => {
    setModalType("add");
    setSelectedMethod(null);
    setFormData({
      name: "",
      code: "",
      percentage_fee: null,
      nominal_fee: null,
      type: "",
      fee_type: "",
      is_active: true,
      logo: null,
      logo_public_id: null,
    });
    setFormErrors({});
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (method) => {
    console.log("Opening edit modal for:", method);
    setModalType("edit");
    setSelectedMethod(method);

    setFormData({
      name: method.name || "",
      code: method.code || "",
      percentage_fee: method.percentage_fee ?? "",
      nominal_fee: method.nominal_fee ?? "",
      type: method.type || "",
      fee_type: method.fee_type || "",
      is_active: method.is_active || false,
      logo: method.logo || null,
      logo_public_id: method.logo_public_id || null,
    });

    setFormErrors({});
    setLogoFile(null);
    setLogoPreview(method.logo || null);
    setRemoveLogo(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalType("");
    setSelectedMethod(null);
    setFormErrors({});
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(false);
  };

  // Form input handlers
  const handleInputChange = (e) => {
    const { id, value } = e.target;

    console.log("Input change:", id, value);

    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));

    // Clear error for this field
    if (formErrors[id]) {
      setFormErrors((prev) => ({
        ...prev,
        [id]: "",
      }));
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      // Validasi file
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/svg+xml",
        "image/webp",
      ];

      if (!validTypes.includes(file.type)) {
        toast.error("Format file harus JPG, PNG, GIF, WEBP, atau SVG");
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 2MB");
        return;
      }

      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setRemoveLogo(false);

      // Reset file input value to allow selecting same file again
      e.target.value = "";
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);

    // Reset file input
    const fileInput = document.getElementById("logo");
    if (fileInput) {
      fileInput.value = "";
    }
  };

  // Reset states ketika modal dibuka
  useEffect(() => {
    if (isModalOpen) {
      if (modalType === "edit" && selectedMethod) {
        setLogoPreview(selectedMethod.logo || null);
        setRemoveLogo(false);
      } else {
        setLogoPreview(null);
        setRemoveLogo(false);
      }
      setLogoFile(null);
    }
  }, [isModalOpen, modalType, selectedMethod]);

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (!formData.name?.trim()) {
      errors.name = "Nama payment method wajib diisi";
    }

    if (!formData.code?.trim()) {
      errors.code = "Kode payment method wajib diisi";
    }

    if (!formData.fee_type) {
      errors.fee_type = "Tipe biaya admin wajib dipilih";
    }

    // Validasi berdasarkan fee_type
    if (formData.fee_type === "percentage") {
      if (!formData.percentage_fee && formData.percentage_fee !== 0) {
        errors.percentage_fee = "Percentage fee wajib diisi";
      }
    } else if (formData.fee_type === "flat") {
      if (!formData.nominal_fee && formData.nominal_fee !== 0) {
        errors.nominal_fee = "Nominal fee wajib diisi";
      }
    } else if (formData.fee_type === "mixed") {
      if (!formData.nominal_fee && formData.nominal_fee !== 0) {
        errors.nominal_fee = "Nominal fee wajib diisi";
      }
      if (!formData.percentage_fee && formData.percentage_fee !== 0) {
        errors.percentage_fee = "Percentage fee wajib diisi";
      }
    }

    if (!formData.type) {
      errors.type = "Tipe payment method wajib dipilih";
    }

    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Periksa kembali form Anda");
      return;
    }

    setSubmitting(true);

    try {
      const formDataToSend = new FormData();

      // Append semua field
      formDataToSend.append("name", formData.name);
      formDataToSend.append("code", formData.code);
      formDataToSend.append("fee_type", formData.fee_type);
      formDataToSend.append("type", formData.type);
      formDataToSend.append("is_active", formData.is_active);

      // Handle fee berdasarkan tipe
      if (formData.fee_type === "flat") {
        formDataToSend.append("nominal_fee", formData.nominal_fee || 0);
        formDataToSend.append("percentage_fee", 0);
      } else if (formData.fee_type === "percentage") {
        formDataToSend.append("nominal_fee", 0);
        formDataToSend.append("percentage_fee", formData.percentage_fee || 0);
      } else if (formData.fee_type === "mixed") {
        formDataToSend.append("nominal_fee", formData.nominal_fee || 0);
        formDataToSend.append("percentage_fee", formData.percentage_fee || 0);
      }

      // Handle logo
      if (logoFile) {
        formDataToSend.append("logo", logoFile);
      } else if (removeLogo && modalType === "edit") {
        formDataToSend.append("remove_logo", "true");
      }

      // Log untuk debugging
      console.log("FormData entries:");
      for (let pair of formDataToSend.entries()) {
        console.log(pair[0], pair[1]);
      }

      // CREATE PAYMENT METHOD
      if (modalType === "add") {
        const response = await api.post(
          `${url}/api/admin/payment-method`,
          formDataToSend,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        const newMethod = response.data.data;
        setPaymentMethods((prev) => [...prev, newMethod]);
        toast.success(`Payment method "${formData.name}" berhasil ditambahkan`);
      }

      // UPDATE PAYMENT METHOD
      else {
        const response = await api.put(
          `${url}/api/admin/payment-method/${selectedMethod.id}`,
          formDataToSend,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        const updatedMethod = response.data.data;
        setPaymentMethods((prev) =>
          prev.map((method) =>
            method.id === selectedMethod.id ? updatedMethod : method,
          ),
        );
        toast.success(`Payment method "${formData.name}" berhasil diperbarui`);
      }

      closeModal();
    } catch (error) {
      console.error("Error saving payment method:", error);
      toast.error(error.response?.data?.message || "Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (method) => {
    if (
      !window.confirm(`Apakah Anda yakin ingin menghapus "${method.name}"?`)
    ) {
      return;
    }

    try {
      await api.delete(`${url}/api/admin/payment-method/${method.id}`);

      setPaymentMethods((prev) => prev.filter((m) => m.id !== method.id));
      toast.success(`Payment method "${method.name}" berhasil dihapus`);
    } catch (error) {
      console.error("Error deleting payment method:", error);
      toast.error("Gagal menghapus payment method");
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
                  <div className="p-2 bg-blue-600 rounded-xl">
                    <CreditCardIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                      Payment Methods
                    </h1>
                    <p className="text-gray-600 mt-1">
                      Kelola semua metode pembayaran yang tersedia
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={openAddModal}
                className="inline-flex items-center justify-center px-5 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
              >
                <PlusCircleIcon className="w-5 h-5 mr-2" />
                Tambah Payment Method
              </button>
            </div>
          </div>

          {/* Filter and Search Section */}
          <div className="mb-6 bg-white text-black rounded-xl shadow-sm border border-gray-200 p-6">
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
                    placeholder="Cari payment method..."
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <div className="absolute text-black inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FilterIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={handleStatusFilter}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Semua Status</option>
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCardIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={typeFilter}
                    onChange={handleTypeFilter}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Semua Tipe</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="ewallet">E-Wallet</option>
                    <option value="qris">QRIS</option>
                    <option value="cc">Credit Card</option>
                  </select>
                </div>

                {(search || statusFilter !== "all" || typeFilter !== "all") && (
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
                  {filteredMethods.length}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-gray-900">
                  {paymentMethods.length}
                </span>{" "}
                payment methods
              </span>
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Memuat data payment method...</p>
                </div>
              </div>
            ) : filteredMethods.length === 0 ? (
              <div className="py-20 text-center">
                <div className="max-w-md mx-auto">
                  <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Payment method tidak ditemukan
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {search || statusFilter !== "all" || typeFilter !== "all"
                      ? "Coba ubah filter pencarian Anda"
                      : "Belum ada payment method yang ditambahkan"}
                  </p>
                  {!search &&
                    statusFilter === "all" &&
                    typeFilter === "all" && (
                      <button
                        onClick={openAddModal}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                      >
                        <PlusCircleIcon className="w-5 h-5 mr-2" />
                        Tambah Payment Method Pertama
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
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Payment Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Kode
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Tipe
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Biaya Admin
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
                    {filteredMethods.map((method, index) => {
                      return (
                        <tr
                          key={method.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {index + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-md flex items-center justify-center mr-3">
                                {method.logo ? (
                                  <div className="h-8 w-8 rounded-md overflow-hidden">
                                    <Image
                                      src={method.logo}
                                      alt={method.name}
                                      width={32}
                                      height={32}
                                      className="object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div>-</div>
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 uppercase">
                                  {method.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600 font-mono">
                              {method.code}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-sm text-gray-900 leading-5 font-semibold rounded-full">
                              {method.type?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {method.fee_type === "percentage" ? (
                              <div className="text-sm text-gray-900">
                                <span className="font-semibold">
                                  {method.percentage_fee}%
                                </span>
                              </div>
                            ) : method.fee_type === "flat" ? (
                              <div className="text-sm text-gray-900">
                                <FormatRupiah
                                  value={parseInt(method.nominal_fee || 0)}
                                />
                              </div>
                            ) : method.fee_type === "mixed" ? (
                              <div className="text-sm text-gray-900">
                                <span className="font-semibold">
                                  {method.percentage_fee}% +{" "}
                                  <FormatRupiah
                                    value={parseInt(method.nominal_fee || 0)}
                                  />
                                </span>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-900">-</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                method.is_active === true
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {method.is_active === true
                                ? "ACTIVE"
                                : "INACTIVE"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => openEditModal(method)}
                                className="inline-flex items-center px-3 py-1.5 border border-blue-600 rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150"
                              >
                                <PenIcon className="w-4 h-4 mr-1" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(method)}
                                className="inline-flex items-center px-3 py-1.5 border border-red-600 rounded-md text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-150"
                              >
                                <Trash2Icon className="w-4 h-4 mr-1" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Component */}
      <Transition show={isModalOpen} as={Fragment}>
        <Dialog onClose={closeModal} className="relative text-black z-50">
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                  <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center justify-between">
                        <Dialog.Title className="text-lg font-semibold text-gray-900">
                          {modalType === "add"
                            ? "Tambah Payment Method Baru"
                            : "Edit Payment Method"}
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
                        payment method
                      </p>
                    </div>

                    {/* Form Content */}
                    <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
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

                      <div className="space-y-6">
                        {/* Logo Upload */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Logo Payment Method
                            <span className="text-xs text-gray-500 ml-1">
                              (Opsional, Maks. 2MB)
                            </span>
                          </label>
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              {logoPreview ? (
                                <div className="relative">
                                  <div className="h-24 w-24 rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-100">
                                    <Image
                                      src={logoPreview}
                                      alt="Logo preview"
                                      width={96}
                                      height={96}
                                      className="object-cover w-full h-full"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleRemoveLogo}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                  >
                                    <XIcon className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : selectedMethod?.logo &&
                                !removeLogo &&
                                modalType === "edit" ? (
                                <div className="relative">
                                  <div className="h-24 w-24 rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-100">
                                    <Image
                                      src={selectedMethod.logo}
                                      alt="Current logo"
                                      width={96}
                                      height={96}
                                      className="object-cover w-full h-full"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleRemoveLogo}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                  >
                                    <XIcon className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="h-24 w-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                                  <UploadIcon className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <input
                                type="file"
                                id="logo"
                                name="logo"
                                onChange={handleLogoChange}
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml,image/webp"
                                className="hidden"
                              />
                              <label
                                htmlFor="logo"
                                className="block w-full cursor-pointer"
                              >
                                <div className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                                  <div className="flex flex-col items-center justify-center space-y-2">
                                    <UploadIcon className="w-6 h-6 text-gray-400" />
                                    <span className="text-sm text-gray-600">
                                      {logoPreview ||
                                      (selectedMethod?.logo && !removeLogo)
                                        ? "Ganti Logo"
                                        : "Upload Logo"}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      Klik untuk memilih file
                                    </span>
                                  </div>
                                </div>
                              </label>

                              {logoFile && (
                                <div className="mt-2 flex items-center text-sm text-green-600">
                                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                                  <span className="truncate">
                                    {logoFile.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nama Payment Method *
                          </label>
                          <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Contoh: BCA Virtual Account"
                            className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              formErrors.name
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          />
                        </div>

                        {/* Code */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Kode Payment Method *
                          </label>
                          <input
                            type="text"
                            id="code"
                            value={formData.code}
                            onChange={handleInputChange}
                            placeholder="Contoh: bca"
                            className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              formErrors.code
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          />
                          {formErrors.code && (
                            <p className="mt-1 text-sm text-red-500">
                              {formErrors.code}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipe biaya admin
                          </label>
                          <select
                            id="fee_type"
                            value={formData.fee_type}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              formErrors.fee_type
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          >
                            <option value="">Pilih Tipe</option>
                            <option value="percentage">Percentage Fee</option>
                            <option value="flat">Nominal Fee</option>
                            <option value="mixed">Mixed</option>
                          </select>
                        </div>

                        {/* Fees */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {formData.fee_type === "flat" && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nominal Fee *
                              </label>
                              <FormatRupiahInput
                                id="nominal_fee"
                                value={formData.nominal_fee || ""}
                                onChange={handleInputChange}
                                error={!!formErrors.nominal_fee}
                              />
                            </div>
                          )}

                          {formData.fee_type === "percentage" && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Percentage Fee (%) *
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  id="percentage_fee"
                                  value={formData.percentage_fee || ""}
                                  onChange={handleInputChange}
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  className="w-full pl-10 pr-3 py-2.5 border rounded-lg"
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <PercentIcon className="h-5 w-5 text-gray-400" />
                                </div>
                              </div>
                            </div>
                          )}

                          {formData.fee_type === "mixed" && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Nominal Fee *
                                </label>
                                <FormatRupiahInput
                                  id="nominal_fee"
                                  value={formData.nominal_fee || ""}
                                  onChange={handleInputChange}
                                  error={!!formErrors.nominal_fee}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Percentage Fee (%) *
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    id="percentage_fee"
                                    value={formData.percentage_fee || ""}
                                    onChange={handleInputChange}
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    className="w-full pl-10 pr-3 py-2.5 border rounded-lg"
                                  />
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <PercentIcon className="h-5 w-5 text-gray-400" />
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Type and Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tipe Payment Method *
                            </label>
                            <select
                              id="type"
                              value={formData.type}
                              onChange={handleInputChange}
                              className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                formErrors.type
                                  ? "border-red-500"
                                  : "border-gray-300"
                              }`}
                            >
                              <option value="">Pilih Tipe</option>
                              <option value="bank_transfer">
                                Bank Transfer/VA
                              </option>
                              <option value="ewallet">E-Wallet</option>
                              <option value="qris">QRIS</option>
                              <option value="cc">Credit Card</option>
                              <option value="cstore">Convensional store</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Status *
                            </label>
                            <select
                              id="is_active"
                              value={formData.is_active}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value={true}>ACTIVE</option>
                              <option value={false}>INACTIVE</option>
                            </select>
                          </div>
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
                          className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? (
                            <>
                              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                              {modalType === "add"
                                ? "Menyimpan..."
                                : "Memperbarui..."}
                            </>
                          ) : modalType === "add" ? (
                            "Simpan Payment Method"
                          ) : (
                            "Perbarui Payment Method"
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
