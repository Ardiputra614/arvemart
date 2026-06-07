"use client";

import { useEffect, useState, useCallback } from "react";
import GenerateReportModal from "../../../components/home/GenerateReportModal"; // sesuaikan path

// ─── Config ────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_GOLANG_URL ?? "http://localhost:8080";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatIDR = (amount) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatNumber = (n) => new Intl.NumberFormat("id-ID").format(n);

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
};

// ─── Status badge config ───────────────────────────────────────────────────────

const STATUS_MAP = {
  settlement: {
    label: "Sukses",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  success: {
    label: "Sukses",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  pending: {
    label: "Pending",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-400",
  },
  failed: {
    label: "Gagal",
    badge: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
  },
  cancel: {
    label: "Dibatalkan",
    badge: "bg-gray-100 text-gray-600 ring-gray-200",
    dot: "bg-gray-400",
  },
  expire: {
    label: "Expired",
    badge: "bg-gray-100 text-gray-600 ring-gray-200",
    dot: "bg-gray-400",
  },
  expired: {
    label: "Expired",
    badge: "bg-gray-100 text-gray-600 ring-gray-200",
    dot: "bg-gray-400",
  },
};

const getStatus = (s) =>
  STATUS_MAP[s?.toLowerCase()] ?? {
    label: s,
    badge: "bg-gray-100 text-gray-600 ring-gray-200",
    dot: "bg-gray-400",
  };

const PRODUCT_ABBR = {
  pulsa: "PL",
  data: "DA",
  pln: "LN",
  pdam: "PD",
  bpjs: "BP",
  game: "GM",
  voucher: "VC",
};
const productAbbr = (type) =>
  type
    ? (PRODUCT_ABBR[type.toLowerCase()] ?? type.slice(0, 2).toUpperCase())
    : "--";

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function Sk({ w, h = "h-4" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${h} ${w}`} />;
}

// ─── Change Badge ──────────────────────────────────────────────────────────────

function ChangeBadge({ value }) {
  const pos = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${
        pos
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-red-50 text-red-600 ring-red-200"
      }`}
    >
      {pos ? "↑" : "↓"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ title, value, change, icon, iconBg, loading, footer }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold  uppercase tracking-widest truncate">
            {title}
          </p>
          <div className="mt-2 h-8 flex items-center">
            {loading ? (
              <Sk w="w-36" h="h-7" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 truncate">
                {value}
              </p>
            )}
          </div>
        </div>
        <div
          className={`p-2.5 rounded-xl ${iconBg} group-hover:scale-110 transition-transform duration-200 shrink-0`}
        >
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {loading ? (
          <Sk w="w-28" />
        ) : (
          <>
            <ChangeBadge value={change} />
            <span className=" text-xs">{footer ?? "vs bulan lalu"}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

function IcoUsers() {
  return (
    <svg
      className="w-5 h-5 text-blue-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
function IcoRevenue() {
  return (
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
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
function IcoOrders() {
  return (
    <svg
      className="w-5 h-5 text-violet-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}
function IcoPending() {
  return (
    <svg
      className="w-5 h-5 text-amber-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
function IcoProfit() {
  return (
    <svg
      className="w-5 h-5 text-rose-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  );
}
function IcoRefresh({ spin }) {
  return (
    <svg
      className={`w-4 h-4 ${spin ? "animate-spin" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  // ✅ Deklarasi state — tidak ada duplikat
  const [showReport, setShowReport] = useState(false);
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAll = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    try {
      const [statsRes, recentRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/dashboard/stats`, {
          credentials: "include",
        }),
        fetch(`${API_BASE}/api/admin/dashboard/recent-transactions`, {
          credentials: "include",
        }),
      ]);

      if (!statsRes.ok)
        throw new Error(`Gagal memuat statistik (${statsRes.status})`);
      if (!recentRes.ok)
        throw new Error(`Gagal memuat transaksi terbaru (${recentRes.status})`);

      const [statsData, recentData] = await Promise.all([
        statsRes.json(),
        recentRes.json(),
      ]);

      setStats(statsData);
      setRecent(recentData.data ?? []);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const id = setInterval(() => fetchAll(true), 60_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const successRate =
    stats && stats.total_orders > 0
      ? ((stats.success_orders / stats.total_orders) * 100).toFixed(1)
      : "0";

  return (
    // ✅ Wrapper div yang hilang ditambahkan kembali
    <div className="space-y-6 bg-gray-50 min-h-screen p-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {lastUpdated
              ? `Diperbarui pukul ${lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
              : "Memuat data…"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <IcoRefresh spin={refreshing} />
            Refresh
          </button>
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
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
            Generate Report
          </button>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <svg
            className="w-5 h-5 shrink-0"
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
          <span className="flex-1">{error}</span>
          <button
            onClick={() => fetchAll()}
            className="font-semibold underline hover:no-underline shrink-0"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* ── Stats Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Pengguna"
          value={stats ? formatNumber(stats.total_users) : "0"}
          change={stats?.users_change ?? 0}
          icon={<IcoUsers />}
          iconBg="bg-blue-50"
          loading={loading}
          footer="registrasi bulan ini"
        />
        <StatCard
          title="Revenue Bulan Ini"
          value={stats ? formatIDR(stats.total_revenue) : "Rp 0"}
          change={stats?.revenue_change ?? 0}
          icon={<IcoRevenue />}
          iconBg="bg-emerald-50"
          loading={loading}
        />
        <StatCard
          title="Total Transaksi"
          value={stats ? formatNumber(stats.total_orders) : "0"}
          change={stats?.orders_change ?? 0}
          icon={<IcoOrders />}
          iconBg="bg-violet-50"
          loading={loading}
          footer="transaksi bulan ini"
        />
        <StatCard
          title="Menunggu Konfirmasi"
          value={stats ? formatNumber(stats.pending_orders) : "0"}
          change={stats?.pending_change ?? 0}
          icon={<IcoPending />}
          iconBg="bg-amber-50"
          loading={loading}
          footer="transaksi pending"
        />
        <StatCard
          title="Total Profit"
          value={stats ? formatIDR(stats.total_profit) : "Rp 0"}
          change={stats?.profit_change ?? 0}
          icon={<IcoProfit />}
          iconBg="bg-rose-50"
          loading={loading}
        />
      </div>

      {/* ── Summary Bar ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold  uppercase tracking-widest mb-4">
          Ringkasan Status Transaksi Bulan Ini
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            {
              label: "Berhasil",
              val: stats?.success_orders,
              dot: "bg-emerald-500",
              color: "text-emerald-600",
            },
            {
              label: "Pending",
              val: stats?.pending_orders,
              dot: "bg-amber-400",
              color: "text-amber-600",
            },
            {
              label: "Gagal",
              val: stats?.failed_orders,
              dot: "bg-red-500",
              color: "text-red-600",
            },
            {
              label: "Success Rate",
              val: null,
              custom: `${successRate}%`,
              dot: "bg-indigo-500",
              color: "text-indigo-600",
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.dot}`}
              />
              <div>
                <p className="text-xs ">{item.label}</p>
                {loading ? (
                  <Sk w="w-16" h="h-5" />
                ) : (
                  <p className={`text-xl font-bold ${item.color}`}>
                    {item.custom ?? formatNumber(item.val)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {!loading && stats && (
          <div className="mt-5">
            <div className="flex justify-between text-xs  mb-1.5">
              <span>Tingkat keberhasilan transaksi bulan ini</span>
              <span className="font-semibold text-gray-700">
                {successRate}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Recent Transactions ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Transaksi Terbaru
          </h2>
          <a
            href="/admin/transaction"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Lihat semua →
          </a>
        </div>

        <div className="divide-y divide-gray-50">
          {/* Skeleton rows */}
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Sk w="w-10" h="h-10" />
                <div className="flex-1 space-y-2">
                  <Sk w="w-48" />
                  <Sk w="w-32" h="h-3" />
                </div>
                <Sk w="w-24" />
                <Sk w="w-16" />
              </div>
            ))}

          {/* Empty state */}
          {!loading && recent.length === 0 && (
            <div className="py-16 text-center ">
              <svg
                className="w-10 h-10 mx-auto mb-3 opacity-40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-sm">Belum ada transaksi</p>
            </div>
          )}

          {/* Transaction rows */}
          {!loading &&
            recent.map((trx) => {
              const st = getStatus(trx.payment_status);
              return (
                <div
                  key={trx.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-600 text-xs font-bold">
                    {productAbbr(trx.product_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {trx.product_name ?? "—"}
                    </p>
                    <p className="text-xs  truncate mt-0.5">
                      {trx.customer_no}
                      {trx.category_name ? ` · ${trx.category_name}` : ""}
                      {" · "}
                      {timeAgo(trx.created_at)}
                    </p>
                  </div>

                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatIDR(trx.gross_amount)}
                    </p>
                    {trx.profit > 0 && (
                      <p className="text-xs text-emerald-600 mt-0.5">
                        +{formatIDR(trx.profit)}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${st.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── Generate Report Modal ─────────────────────────────────────────── */}
      {showReport && (
        <GenerateReportModal onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
