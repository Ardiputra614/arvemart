"use client";

import {
  SearchIcon,
  XIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  FilterIcon,
  EyeIcon,
  DollarSignIcon,
  FileTextIcon,
} from "lucide-react";
import { Fragment, useState, useEffect, useCallback } from "react";
import { Dialog, Transition } from "@headlessui/react";
import api from "@/lib/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// URL API dengan fallback
const API_URL = process.env.NEXT_PUBLIC_GOLANG_URL || "http://localhost:8080";
const TRANSACTION_API = `${API_URL}/api/admin/transactions`;

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "dd MMM yyyy HH:mm", { locale: id });
  } catch {
    return dateString;
  }
};

export default function TransactionPage() {
  // State untuk data
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Fungsi fetch data
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Fetching transactions from:", TRANSACTION_API);
      const response = await api.get(TRANSACTION_API);

      console.log("API Response:", response.data);

      if (response.data && response.data.data) {
        setTransactions(response.data.data);
      } else {
        console.error("Unexpected API response format");
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data pada mount
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  // Filter data
  useEffect(() => {
    if (!transactions.length) {
      setFilteredTransactions([]);
      return;
    }

    let filtered = [...transactions];

    // Filter by search (order_id, customer_no, product_name)
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (transaction) =>
          transaction.order_id?.toLowerCase().includes(searchLower) ||
          transaction.customer_no?.toLowerCase().includes(searchLower) ||
          transaction.product_name?.toLowerCase().includes(searchLower) ||
          transaction.buyer_sku_code?.toLowerCase().includes(searchLower),
      );
    }

    // Filter by payment status
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (transaction) => transaction.payment_status === statusFilter,
      );
    }

    // Filter by product type
    if (typeFilter !== "all") {
      filtered = filtered.filter(
        (transaction) => transaction.product_type === typeFilter,
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, search, statusFilter, typeFilter]);

  // Handle search
  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const handleTypeChange = (e) => {
    setTypeFilter(e.target.value);
  };

  // Open detail modal
  const openDetailModal = (transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailModalOpen(true);
  };

  // Reset filters
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  // Get unique product types for filter
  const productTypes = [
    ...new Set(transactions.map((t) => t.product_type).filter(Boolean)),
  ];

  // Get status badge color
  const getStatusBadge = (status) => {
    const statusMap = {
      pending: "bg-yellow-100 text-yellow-800",
      success: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      expired: "bg-gray-100 text-gray-800",
      settlement: "bg-blue-100 text-blue-800",
    };
    return statusMap[status] || "bg-gray-100 text-gray-800";
  };

  // Get Digiflazz status badge
  const getDigiflazzStatusBadge = (status) => {
    if (!status) return "bg-gray-100 text-gray-800";

    const statusMap = {
      success: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      failed: "bg-red-100 text-red-800",
      processing: "bg-blue-100 text-blue-800",
    };
    return statusMap[status] || "bg-gray-100 text-gray-800";
  };

  // Render specific fields based on product type
  // const renderSpecificFields = (transaction) => {
  //   if (!transaction.product_type) return null;

  //   const type = transaction.product_type.toLowerCase();

  //   // Untuk PLN / Tagihan Listrik
  //   if (
  //     type.includes("pln") ||
  //     type.includes("listrik") ||
  //     type.includes("pasca")
  //   ) {
  //     return (
  //       <>
  //         {transaction.kwh && (
  //           <div className="mt-2 text-xs bg-blue-50 p-2 rounded">
  //             <span className="font-medium">KWH:</span> {transaction.kwh} kWh
  //           </div>
  //         )}
  //         {transaction.meter_no && (
  //           <div className="text-xs">
  //             <span className="font-medium">No. Meter:</span>{" "}
  //             {transaction.meter_no}
  //           </div>
  //         )}
  //         {transaction.subscriber_id && (
  //           <div className="text-xs">
  //             <span className="font-medium">ID Pelanggan:</span>{" "}
  //             {transaction.subscriber_id}
  //           </div>
  //         )}
  //         {transaction.customer_name && (
  //           <div className="text-xs">
  //             <span className="font-medium">Nama Pelanggan:</span>{" "}
  //             {transaction.customer_name}
  //           </div>
  //         )}
  //       </>
  //     );
  //   }

  //   // Untuk Pulsa / Data / Voucher
  //   if (
  //     type.includes("pulsa") ||
  //     type.includes("data") ||
  //     type.includes("voucher")
  //   ) {
  //     return (
  //       <>
  //         {transaction.serial_number && (
  //           <div className="mt-2 text-xs bg-green-50 p-2 rounded">
  //             <span className="font-medium">SN:</span>{" "}
  //             {transaction.serial_number}
  //           </div>
  //         )}
  //         {transaction.voucher_code && (
  //           <div className="text-xs">
  //             <span className="font-medium">Kode Voucher:</span>{" "}
  //             {transaction.voucher_code}
  //           </div>
  //         )}
  //         {transaction.ref_id && (
  //           <div className="text-xs">
  //             <span className="font-medium">Ref ID:</span> {transaction.ref_id}
  //           </div>
  //         )}
  //       </>
  //     );
  //   }

  //   // Untuk BPJS / Tagihan Lainnya
  //   if (type.includes("bpjs") || type.includes("tagihan")) {
  //     return (
  //       <>
  //         {transaction.customer_name && (
  //           <div className="mt-2 text-xs bg-purple-50 p-2 rounded">
  //             <span className="font-medium">Nama:</span>{" "}
  //             {transaction.customer_name}
  //           </div>
  //         )}
  //         {transaction.meter_no && (
  //           <div className="text-xs">
  //             <span className="font-medium">No. Meter:</span>{" "}
  //             {transaction.meter_no}
  //           </div>
  //         )}
  //         {transaction.subscriber_id && (
  //           <div className="text-xs">
  //             <span className="font-medium">ID Pelanggan:</span>{" "}
  //             {transaction.subscriber_id}
  //           </div>
  //         )}
  //       </>
  //     );
  //   }

  //   return null;
  // };

  // Komponen Loading
  const LoadingSpinner = () => (
    <div className="py-20 text-center">
      <div className="inline-flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading transactions...</span>
      </div>
    </div>
  );

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Transaction Management
              </h1>
              <p className="text-gray-600 mt-2">
                Monitor and manage all transactions
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Transaksi</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {transactions.length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50">
                  <FileTextIcon className="w-8 h-8 text-blue-500" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Pendapatan</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(
                      transactions
                        .filter(
                          (t) =>
                            t.payment_status === "settlement" ||
                            t.payment_status === "success",
                        )
                        .reduce(
                          (sum, t) => sum + Number(t.gross_amount || 0),
                          0,
                        ),
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-50">
                  <DollarSignIcon className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Sukses</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {
                      transactions.filter(
                        (t) =>
                          t.payment_status === "settlement" ||
                          t.payment_status === "success",
                      ).length
                    }
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
                  <p className="text-gray-500 text-sm">Pending</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {
                      transactions.filter((t) => t.payment_status === "pending")
                        .length
                    }
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-50">
                  <AlertCircleIcon className="w-8 h-8 text-yellow-500" />
                </div>
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
                    placeholder="Search by Order ID, Customer No, Product..."
                    className="block w-full pl-10 pr-3 py-2.5 border text-black border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 text-black">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FilterIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={handleFilterChange}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Semua Status</option>
                    <option value="pending">Pending</option>
                    <option value="settlement">Settlement</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={handleTypeChange}
                    className="block w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Semua Tipe</option>
                    {productTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {(search || statusFilter !== "all" || typeFilter !== "all") && (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Showing{" "}
              <span className="font-semibold">
                {filteredTransactions.length}
              </span>{" "}
              of <span className="font-semibold">{transactions.length}</span>{" "}
              transactions
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <LoadingSpinner />
            ) : filteredTransactions.length === 0 ? (
              <div className="py-20 text-center">
                <div className="max-w-md mx-auto">
                  <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No transactions found
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {search || statusFilter !== "all" || typeFilter !== "all"
                      ? "Try adjusting your search or filter"
                      : "No transactions available."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        No
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Produk
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Pelanggan
                      </th>
                      {/* <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Field Spesifik
                      </th> */}
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status Payment
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status Digiflazz
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTransactions.slice((page - 1) * perPage, page * perPage).map((transaction, index) => (
                      <tr
                        key={transaction.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.order_id}
                          </div>
                          <div className="text-xs text-gray-500">
                            {transaction.transaction_id || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.product_name || "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {transaction.product_type || "-"}
                          </div>
                          <div className="text-xs text-gray-400">
                            {transaction.buyer_sku_code}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {transaction.customer_no}
                          </div>
                          {transaction.customer_name && (
                            <div className="text-xs text-gray-500">
                              {transaction.customer_name}
                            </div>
                          )}
                          <div className="text-xs text-gray-400">
                            WA: {transaction.wa_pembeli}
                          </div>
                        </td>
                        {/* <td className="px-4 py-3">
                          {renderSpecificFields(transaction)}
                        </td> */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(transaction.gross_amount)}
                          </div>
                          {transaction.selling_price && (
                            <div className="text-xs text-green-600">
                              Jual: {formatCurrency(transaction.selling_price)}
                            </div>
                          )}
                          {transaction.purchase_price && (
                            <div className="text-xs text-red-600">
                              Beli: {formatCurrency(transaction.purchase_price)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                              transaction.payment_status,
                            )}`}
                          >
                            {transaction.payment_status?.toUpperCase()}
                          </span>
                          {transaction.payment_method_name && (
                            <div className="text-xs text-gray-500 mt-1">
                              {transaction.payment_method_name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {transaction.digiflazz_status ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getDigiflazzStatusBadge(
                                transaction.digiflazz_status,
                              )}`}
                            >
                              {transaction.digiflazz_status?.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                          {transaction.retry_count > 0 && (
                            <div className="text-xs text-yellow-600 mt-1">
                              Retry: {transaction.retry_count}x
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <div>{formatDate(transaction.created_at)}</div>
                          {transaction.digiflazz_sent_at && (
                            <div className="text-xs text-gray-400">
                              Sent: {formatDate(transaction.digiflazz_sent_at)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => openDetailModal(transaction)}
                            className="inline-flex items-center px-3 py-1.5 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <EyeIcon className="w-4 h-4 mr-1" />
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredTransactions.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {(page - 1) * perPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(page * perPage, filteredTransactions.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium">
                  {filteredTransactions.length}
                </span>{" "}
                results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {Math.ceil(filteredTransactions.length / perPage)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(filteredTransactions.length / perPage)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Transition show={isDetailModalOpen} as={Fragment}>
        <Dialog
          onClose={() => setIsDetailModalOpen(false)}
          className="relative text-black z-50"
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" />
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
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <Dialog.Title className="text-lg font-semibold text-gray-900">
                        Transaction Detail
                      </Dialog.Title>
                      <button
                        onClick={() => setIsDetailModalOpen(false)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <XIcon className="w-6 h-6" />
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Order ID: {selectedTransaction?.order_id}
                    </p>
                  </div>

                  {/* Content */}
                  {selectedTransaction && (
                    <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                          <h3 className="font-semibold text-gray-900 border-b pb-2">
                            Informasi Dasar
                          </h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-gray-500">Order ID:</span>
                            <span className="font-medium">
                              {selectedTransaction.order_id}
                            </span>

                            <span className="text-gray-500">
                              Transaction ID:
                            </span>
                            <span className="font-medium">
                              {selectedTransaction.transaction_id || "-"}
                            </span>

                            <span className="text-gray-500">Product:</span>
                            <span className="font-medium">
                              {selectedTransaction.product_name || "-"}
                            </span>

                            <span className="text-gray-500">Type:</span>
                            <span className="font-medium">
                              {selectedTransaction.product_type || "-"}
                            </span>

                            <span className="text-gray-500">SKU:</span>
                            <span className="font-medium">
                              {selectedTransaction.buyer_sku_code}
                            </span>

                            <span className="text-gray-500">Customer No:</span>
                            <span className="font-medium">
                              {selectedTransaction.customer_no}
                            </span>

                            <span className="text-gray-500">WA Pembeli:</span>
                            <span className="font-medium">
                              {selectedTransaction.wa_pembeli}
                            </span>
                          </div>
                        </div>

                        {/* Payment Info */}
                        <div className="space-y-4">
                          <h3 className="font-semibold text-gray-900 border-b pb-2">
                            Informasi Pembayaran
                          </h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-gray-500">Gross Amount:</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(selectedTransaction.gross_amount)}
                            </span>

                            <span className="text-gray-500">
                              Selling Price:
                            </span>
                            <span className="font-medium">
                              {formatCurrency(
                                selectedTransaction.selling_price || 0,
                              )}
                            </span>

                            <span className="text-gray-500">
                              Purchase Price:
                            </span>
                            <span className="font-medium text-red-600">
                              {formatCurrency(
                                selectedTransaction.purchase_price || 0,
                              )}
                            </span>

                            <span className="text-gray-500">Payment Type:</span>
                            <span className="font-medium">
                              {selectedTransaction.payment_type || "-"}
                            </span>

                            <span className="text-gray-500">
                              Payment Method:
                            </span>
                            <span className="font-medium">
                              {selectedTransaction.payment_method_name || "-"}
                            </span>

                            <span className="text-gray-500">
                              Payment Status:
                            </span>
                            <span>
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                                  selectedTransaction.payment_status,
                                )}`}
                              >
                                {selectedTransaction.payment_status?.toUpperCase()}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Specific Fields based on Product Type */}
                        {(selectedTransaction.product_type
                          ?.toLowerCase()
                          .includes("pln") ||
                          selectedTransaction.product_type
                            ?.toLowerCase()
                            .includes("listrik") ||
                          selectedTransaction.product_type
                            ?.toLowerCase()
                            .includes("pasca")) && (
                          <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 border-b pb-2">
                              Informasi PLN/Tagihan Listrik
                            </h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {selectedTransaction.kwh && (
                                <>
                                  <span className="text-gray-500">KWH:</span>
                                  <span className="font-medium">
                                    {selectedTransaction.kwh} kWh
                                  </span>
                                </>
                              )}
                              {selectedTransaction.meter_no && (
                                <>
                                  <span className="text-gray-500">
                                    No. Meter:
                                  </span>
                                  <span className="font-medium">
                                    {selectedTransaction.meter_no}
                                  </span>
                                </>
                              )}
                              {selectedTransaction.subscriber_id && (
                                <>
                                  <span className="text-gray-500">
                                    ID Pelanggan:
                                  </span>
                                  <span className="font-medium">
                                    {selectedTransaction.subscriber_id}
                                  </span>
                                </>
                              )}
                              {selectedTransaction.customer_name && (
                                <>
                                  <span className="text-gray-500">
                                    Nama Pelanggan:
                                  </span>
                                  <span className="font-medium">
                                    {selectedTransaction.customer_name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {(selectedTransaction.product_type
                          ?.toLowerCase()
                          .includes("pulsa") ||
                          selectedTransaction.product_type
                            ?.toLowerCase()
                            .includes("data") ||
                          selectedTransaction.product_type
                            ?.toLowerCase()
                            .includes("voucher")) && (
                          <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 border-b pb-2">
                              Informasi Pulsa/Data/Voucher
                            </h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {selectedTransaction.serial_number && (
                                <>
                                  <span className="text-gray-500">
                                    Serial Number:
                                  </span>
                                  <span className="font-medium">
                                    {selectedTransaction.serial_number}
                                  </span>
                                </>
                              )}
                              {selectedTransaction.voucher_code && (
                                <>
                                  <span className="text-gray-500">
                                    Kode Voucher:
                                  </span>
                                  <span className="font-medium">
                                    {selectedTransaction.voucher_code}
                                  </span>
                                </>
                              )}
                              {selectedTransaction.ref_id && (
                                <>
                                  <span className="text-gray-500">Ref ID:</span>
                                  <span className="font-medium">
                                    {selectedTransaction.ref_id}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Digiflazz Info */}
                        <div className="space-y-4">
                          <h3 className="font-semibold text-gray-900 border-b pb-2">
                            Informasi Digiflazz
                          </h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-gray-500">Status:</span>
                            <span>
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getDigiflazzStatusBadge(
                                  selectedTransaction.digiflazz_status,
                                )}`}
                              >
                                {selectedTransaction.digiflazz_status?.toUpperCase() ||
                                  "-"}
                              </span>
                            </span>

                            <span className="text-gray-500">Flag:</span>
                            <span className="font-medium">
                              {selectedTransaction.digiflazz_flag || "-"}
                            </span>

                            <span className="text-gray-500">
                              Status Message:
                            </span>
                            <span className="font-medium">
                              {selectedTransaction.status_message || "-"}
                            </span>

                            <span className="text-gray-500">Retry Count:</span>
                            <span className="font-medium">
                              {selectedTransaction.retry_count}
                            </span>

                            {selectedTransaction.last_error_code && (
                              <>
                                <span className="text-gray-500">
                                  Last Error:
                                </span>
                                <span className="font-medium text-red-600">
                                  {selectedTransaction.last_error_code}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Timestamps */}
                        <div className="space-y-4">
                          <h3 className="font-semibold text-gray-900 border-b pb-2">
                            Timeline
                          </h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-gray-500">Created At:</span>
                            <span className="font-medium">
                              {formatDate(selectedTransaction.created_at)}
                            </span>

                            <span className="text-gray-500">Updated At:</span>
                            <span className="font-medium">
                              {formatDate(selectedTransaction.updated_at)}
                            </span>

                            {selectedTransaction.saldo_debited_at && (
                              <>
                                <span className="text-gray-500">
                                  Saldo Debited:
                                </span>
                                <span className="font-medium">
                                  {formatDate(
                                    selectedTransaction.saldo_debited_at,
                                  )}
                                </span>
                              </>
                            )}

                            {selectedTransaction.digiflazz_sent_at && (
                              <>
                                <span className="text-gray-500">
                                  Digiflazz Sent:
                                </span>
                                <span className="font-medium">
                                  {formatDate(
                                    selectedTransaction.digiflazz_sent_at,
                                  )}
                                </span>
                              </>
                            )}

                            {selectedTransaction.retry_at && (
                              <>
                                <span className="text-gray-500">
                                  Next Retry:
                                </span>
                                <span className="font-medium">
                                  {formatDate(selectedTransaction.retry_at)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* URLs */}
                        {(selectedTransaction.url ||
                          selectedTransaction.deeplink_gopay) && (
                          <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 border-b pb-2">
                              Links
                            </h3>
                            <div className="space-y-2 text-sm">
                              {selectedTransaction.url && (
                                <div>
                                  <span className="text-gray-500 block">
                                    URL:
                                  </span>
                                  <a
                                    href={selectedTransaction.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline break-all"
                                  >
                                    {selectedTransaction.url}
                                  </a>
                                </div>
                              )}
                              {selectedTransaction.deeplink_gopay && (
                                <div>
                                  <span className="text-gray-500 block">
                                    Deeplink Gopay:
                                  </span>
                                  <a
                                    href={selectedTransaction.deeplink_gopay}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline break-all"
                                  >
                                    {selectedTransaction.deeplink_gopay}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-end">
                      <button
                        onClick={() => setIsDetailModalOpen(false)}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Close
                      </button>
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
