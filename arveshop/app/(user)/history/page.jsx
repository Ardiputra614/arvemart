"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";

const statusConfig = {
  settlement: { label: "Sukses", color: "text-green-400", bg: "bg-green-500/10" },
  pending: { label: "Pending", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  expired: { label: "Expired", color: "text-red-400", bg: "bg-red-500/10" },
  failed: { label: "Gagal", color: "text-red-400", bg: "bg-red-500/10" },
  deny: { label: "Ditolak", color: "text-red-400", bg: "bg-red-500/10" },
};

export default function HistoryList() {
  const url = process.env.NEXT_PUBLIC_GOLANG_URL;
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (statusFilter) params.payment_status = statusFilter;
      if (productFilter) params.product_type = productFilter;

      const res = await axios.get(`${url}/api/history`, {
        params,
        withCredentials: true,
      });

      if (res.data?.data) {
        setOrders(res.data.data);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (err) {
      if (err.response?.status !== 401) {
        toast.error("Gagal memuat riwayat");
      }
    } finally {
      setLoading(false);
    }
  }, [url, page, search, statusFilter, productFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatRupiah = (val) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val || 0);

  const formatDate = (val) =>
    val
      ? new Date(val).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  const getStatus = (status) => statusConfig[status] || { label: status || "-", color: "text-gray-400", bg: "bg-gray-500/10" };

  return (
    <div className="min-h-screen text-white py-6 px-4">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Riwayat Transaksi</h1>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari order ID, produk, atau nomor..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Status</option>
            <option value="settlement">Sukses</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
            <option value="failed">Gagal</option>
          </select>
          <select
            value={productFilter}
            onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Tipe</option>
            <option value="pulsa">Pulsa</option>
            <option value="data">Data</option>
            <option value="pln">PLN</option>
            <option value="game">Game</option>
            <option value="pasca">Pascabayar</option>
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Belum ada transaksi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const st = getStatus(order.payment_status);
              return (
                <div
                  key={order.id}
                  onClick={() => router.push(`/history/${order.order_id}`)}
                  className="bg-gray-800 rounded-xl p-4 hover:bg-gray-750 transition-colors cursor-pointer border border-gray-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold truncate">
                          {order.product_name || "-"}
                        </span>
                        <span className="text-xs text-gray-500 shrink-0">
                          {order.product_type}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mb-1">
                        {order.customer_no}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(order.created_at)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold">
                        {formatRupiah(order.gross_amount)}
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs mt-1 px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 text-sm">
            <span className="text-gray-400">
              {total} transaksi — Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-600 transition-colors"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 bg-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-600 transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
