"use client";

import api from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function TermCondition() {
  const [term, setTerm] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/api/profil-aplikasi");
        setTerm(res.data.data.privacy_policy);
      } catch (error) {
        toast.error("Gagal mengambil data");
      }
    };

    fetchData();
  }, []);

  // Escape HTML to prevent XSS, then highlight ARVESHOP
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
        {/* Title */}
        <h1 className="text-center text-2xl font-bold mb-6 text-white">
          Kebijakan Privasi
        </h1>

        {/* Content */}
        <div className=" p-6 rounded-xl shadow-lg leading-relaxed">
          {term ? (
            <div
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: formatText(term) }}
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
