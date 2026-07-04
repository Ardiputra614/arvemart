"use client";

import api from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function RefundPolicy() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/api/profil-aplikasi");
        setData(res.data.data.refund_policy);
      } catch (error) {
        toast.error("Gagal mengambil data");
      }
    };

    fetchData();
  }, []);

  const formatText = (text) => {
    if (!text) return "";
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    return escaped.replace(
      /ARVESHOP/gi,
      '<span class="text-blue-400 font-semibold">ARVESHOP</span>',
    );
  };

  return (
    <div className="min-h-screen text-gray-200 px-3 py-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-center text-2xl font-bold mb-6 text-white">
          Kebijakan Refund
        </h1>

        <div className="p-6 rounded-xl shadow-lg leading-relaxed">
          {data ? (
            <div
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: formatText(data) }}
            />
          ) : (
            <div className="text-center text-gray-400">
              Data tidak ditemukan
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
