"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  CreditCard,
  Search,
  RefreshCw,
} from "lucide-react";

const statusBadge = (status) => {
  const map = {
    pending: "bg-yellow-500/20 text-yellow-400",
    success: "bg-green-500/20 text-green-400",
    failed: "bg-red-500/20 text-red-400",
    expired: "bg-gray-500/20 text-gray-400",
    settlement: "bg-green-500/20 text-green-400",
  };
  return `px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-gray-500/20 text-gray-400"}`;
};

const CekTransaksi = () => {
  const [orderId, setOrderId] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const apiUrl = process.env.NEXT_PUBLIC_GOLANG_URL;
  const wsUrl = apiUrl?.replace("https://", "wss://").replace("http://", "ws://");

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/transactions/recent`);
      const json = await res.json();
      if (json.code === 200) setTransactions(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    let reconnectTimeout;

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(`${wsUrl}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setLive(true);
        ws.send(JSON.stringify({ type: "subscribe_public" }));
        if (reconnectRef.current) {
          clearTimeout(reconnectRef.current);
          reconnectRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "public_update" && msg.data) {
            setTransactions((prev) => {
              const exists = prev.find(
                (t) => t.order_id === msg.data.order_id
              );
              if (exists) {
                return prev.map((t) =>
                  t.order_id === msg.data.order_id ? { ...t, ...msg.data } : t
                );
              }
              return [msg.data, ...prev].slice(0, 20);
            });
          }
        } catch (e) {
          // ignore
        }
      };

      ws.onclose = () => {
        setLive(false);
        reconnectTimeout = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [wsUrl]);

  const handleRefresh = () => {
    fetchTransactions();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "subscribe_public" }));
    }
  };

  return (
    <div className="min-h-[70vh] py-8 px-4 max-w-5xl mx-auto space-y-8">
      {/* Search Card */}
      <div className="bg-[#37353E] border-gray-500 rounded-3xl p-8 shadow-xl border w-full max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#37353E] flex items-center justify-center shadow-lg">
            <Search className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              Cek Status Transaksi
            </h3>
            <p className="text-gray-300">Lacak pesanan Anda dengan mudah</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Masukkan ID Transaksi
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Contoh: TRX-123456789"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-4 py-4 pl-12 bg-[#44444E] rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
              />
              <CreditCard
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
            </div>
          </div>

          <Link
            href={orderId ? `/history/${orderId}` : "#"}
            className={`w-full inline-flex items-center justify-center gap-2 bg-black text-white px-6 py-4 rounded-xl font-semibold transition-all shadow-lg ${
              !orderId
                ? "opacity-50 cursor-not-allowed pointer-events-none"
                : "hover:shadow-xl hover:scale-[1.02]"
            }`}
          >
            Cek Status Transaksi
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-[#37353E] border-gray-500 rounded-3xl p-6 sm:p-8 shadow-xl border">
        <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">
                Transaksi Terbaru
              </h3>
            </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-[#44444E] text-gray-300 hover:text-white hover:bg-[#55555E] transition"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">
            Memuat data...
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            Belum ada transaksi
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-600 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 pr-6">Tanggal</th>
                  <th className="pb-3 pr-6">Status</th>
                  <th className="pb-3 pr-6">Referensi</th>
                  <th className="pb-3 pr-6">Pelanggan</th>
                  <th className="pb-3">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr
                    key={t.order_id || i}
                    className="border-b border-gray-700/50 text-white hover:bg-white/5 transition"
                  >
                    <td className="py-3 pr-6 text-gray-400 whitespace-nowrap font-mono text-xs">
                      {t.created_at}
                    </td>
                    <td className="py-3 pr-6">
                      <span className={statusBadge(t.payment_status)}>
                        {t.payment_status === "success" || t.payment_status === "settlement"
                          ? "Berhasil"
                          : t.payment_status === "pending"
                            ? "Pending"
                            : t.payment_status === "expired"
                              ? "Kadaluarsa"
                              : t.payment_status === "failed"
                                ? "Gagal"
                                : t.payment_status}
                      </span>
                    </td>
                    <td className="py-3 pr-6 font-mono text-xs tracking-wider text-gray-300">
                      {t.order_id}
                    </td>
                    <td className="py-3 pr-6 font-mono text-xs tracking-wider text-gray-400">
                      {t.customer_no}
                    </td>
                    <td className="py-3 font-mono text-xs text-gray-300">
                      {t.gross_amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CekTransaksi;
