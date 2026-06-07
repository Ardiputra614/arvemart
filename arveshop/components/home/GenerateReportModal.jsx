"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

const API_BASE = process.env.NEXT_PUBLIC_GOLANG_URL ?? "http://localhost:8080";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatIDR = (amount) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const safeStr = (val) => val ?? "-";

const STATUS_LABEL = {
  settlement: "Sukses",
  success: "Sukses",
  pending: "Pending",
  failed: "Gagal",
  cancel: "Dibatalkan",
  expire: "Expired",
  expired: "Expired",
};

// ─── Today & first-of-month helpers ───────────────────────────────────────────

const today = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

// ─── XLSX Generator ───────────────────────────────────────────────────────────

function generateXLSX(data) {
  const { summary, transactions, date_from, date_to, generated_at } = data;
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ──────────────────────────────────────────────────────
  const summaryRows = [
    ["LAPORAN TRANSAKSI - ARVESHOP"],
    [],
    ["Periode", `${date_from} s/d ${date_to}`],
    ["Dibuat pada", formatDate(generated_at)],
    [],
    ["RINGKASAN"],
    ["Total Revenue", summary.total_revenue],
    ["Total Profit", summary.total_profit],
    ["Total Transaksi", summary.total_orders],
    ["Transaksi Sukses", summary.success_orders],
    ["Transaksi Pending", summary.pending_orders],
    ["Transaksi Gagal", summary.failed_orders],
    ["Success Rate", `${summary.success_rate.toFixed(1)}%`],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);

  // Styling lebar kolom summary
  wsSummary["!cols"] = [{ wch: 22 }, { wch: 30 }];

  // Format currency cells
  ["A7", "A8"].forEach((_, i) => {
    const cell = wsSummary[`B${7 + i}`];
    if (cell) {
      cell.t = "n";
      cell.z = '"Rp"#,##0';
    }
  });

  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // ── Sheet 2: Transaksi ────────────────────────────────────────────────────
  const headers = [
    "No",
    "Tanggal",
    "Order ID",
    "No. Pelanggan",
    "No. WA",
    "Produk",
    "Tipe Produk",
    "Kategori",
    "Gross Amount",
    "Selling Price",
    "Purchase Price",
    "Profit",
    "Admin Fee",
    "Status Bayar",
    "Status Digiflazz",
    "Metode Bayar",
    "Serial Number",
  ];

  const rows = transactions.map((trx, i) => [
    i + 1,
    formatDate(trx.created_at),
    trx.order_id,
    trx.customer_no,
    trx.wa_pembeli,
    safeStr(trx.product_name),
    safeStr(trx.product_type),
    safeStr(trx.category_name),
    trx.gross_amount,
    trx.selling_price,
    trx.purchase_price,
    trx.profit,
    trx.admin_fee,
    STATUS_LABEL[trx.payment_status?.toLowerCase()] ?? trx.payment_status,
    safeStr(trx.digiflazz_status),
    safeStr(trx.payment_type),
    safeStr(trx.serial_number),
  ]);

  const wsTransaksi = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Lebar kolom transaksi
  wsTransaksi["!cols"] = [
    { wch: 4 }, // No
    { wch: 18 }, // Tanggal
    { wch: 26 }, // Order ID
    { wch: 16 }, // No. Pelanggan
    { wch: 16 }, // No. WA
    { wch: 28 }, // Produk
    { wch: 14 }, // Tipe
    { wch: 16 }, // Kategori
    { wch: 16 }, // Gross
    { wch: 16 }, // Selling
    { wch: 16 }, // Purchase
    { wch: 14 }, // Profit
    { wch: 12 }, // Admin Fee
    { wch: 14 }, // Status Bayar
    { wch: 16 }, // Status Digiflazz
    { wch: 16 }, // Metode Bayar
    { wch: 20 }, // Serial Number
  ];

  // Format kolom currency (I, J, K, L, M = index 8–12)
  const currencyCols = [8, 9, 10, 11, 12]; // 0-based
  rows.forEach((_, rowIdx) => {
    currencyCols.forEach((colIdx) => {
      const cellAddr = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx });
      const cell = wsTransaksi[cellAddr];
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        cell.z = '"Rp"#,##0';
      }
    });
  });

  XLSX.utils.book_append_sheet(wb, wsTransaksi, "Transaksi");

  // ── Download ──────────────────────────────────────────────────────────────
  const fileName = `laporan_${date_from}_sd_${date_to}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ─── Modal Component ──────────────────────────────────────────────────────────

export default function GenerateReportModal({ onClose }) {
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null); // summary setelah fetch

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/report?from=${dateFrom}&to=${dateTo}`,
        { credentials: "include" },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }

      const data = await res.json();

      if (data.transactions.length === 0) {
        setError("Tidak ada transaksi pada periode yang dipilih.");
        return;
      }

      setPreview(data.summary);
      generateXLSX(data);
    } catch (e) {
      setError(e.message ?? "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <svg
                  className="w-5 h-5 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Generate Report
                </h2>
                <p className="text-xs text-gray-400">
                  Download laporan transaksi (.xlsx)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  max={today()}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* Quick range buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                {
                  label: "Bulan Ini",
                  action: () => {
                    setDateFrom(firstOfMonth());
                    setDateTo(today());
                  },
                },
                {
                  label: "Bulan Lalu",
                  action: () => {
                    const d = new Date();
                    const y =
                      d.getMonth() === 0
                        ? d.getFullYear() - 1
                        : d.getFullYear();
                    const m = d.getMonth() === 0 ? 12 : d.getMonth();
                    const lastDay = new Date(y, m, 0).getDate();
                    setDateFrom(`${y}-${String(m).padStart(2, "0")}-01`);
                    setDateTo(`${y}-${String(m).padStart(2, "0")}-${lastDay}`);
                  },
                },
                {
                  label: "7 Hari Terakhir",
                  action: () => {
                    const d = new Date();
                    d.setDate(d.getDate() - 6);
                    setDateFrom(d.toISOString().split("T")[0]);
                    setDateTo(today());
                  },
                },
                {
                  label: "30 Hari Terakhir",
                  action: () => {
                    const d = new Date();
                    d.setDate(d.getDate() - 29);
                    setDateFrom(d.toISOString().split("T")[0]);
                    setDateTo(today());
                  },
                },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={btn.action}
                  className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors"
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </div>
            )}

            {/* Preview summary setelah berhasil */}
            {preview && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  File berhasil didownload
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-emerald-800">
                  <span>Total Transaksi</span>
                  <span className="font-semibold">{preview.total_orders}</span>
                  <span>Revenue</span>
                  <span className="font-semibold">
                    {formatIDR(preview.total_revenue)}
                  </span>
                  <span>Profit</span>
                  <span className="font-semibold">
                    {formatIDR(preview.total_profit)}
                  </span>
                  <span>Success Rate</span>
                  <span className="font-semibold">
                    {preview.success_rate.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !dateFrom || !dateTo}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Memproses…
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
