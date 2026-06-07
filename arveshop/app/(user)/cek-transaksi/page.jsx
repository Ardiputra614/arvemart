"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, CreditCard, Search } from "lucide-react";

const CekTransaksi = () => {
  const [orderId, setOrderId] = useState("");

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-[#37353E] border-gray-500 rounded-3xl p-8 shadow-xl border w-full max-w-lg">
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

        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <Clock size={16} />
            Status update real-time setiap 5 menit
          </p>
        </div>
      </div>
    </div>
  );
};

export default CekTransaksi;
