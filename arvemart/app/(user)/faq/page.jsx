"use client";

import api from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function FaqPage() {
  const [faqs, setFaqs] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/api/faq");
        setFaqs(res.data.data || []);
      } catch (error) {
        toast.error("Gagal mengambil data FAQ");
      }
    };

    fetchData();
  }, []);

  const toggle = (id) => {
    setOpenId(openId === id ? null : id);
  };

  const formatText = (text) => {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  return (
    <div className="min-h-screen text-gray-200 px-3 py-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-center text-2xl font-bold mb-6 text-white">
          Frequently Asked Questions
        </h1>

        {faqs.length === 0 ? (
          <div className="text-center text-gray-400">Tidak ada FAQ</div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="bg-[#2a2a2e] rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => toggle(faq.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left text-white font-medium"
                >
                  <span>{faq.question}</span>
                  {openId === faq.id ? (
                    <ChevronUp size={20} className="text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400 shrink-0" />
                  )}
                </button>
                {openId === faq.id && (
                  <div
                    className="px-5 pb-4 text-gray-300 leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: formatText(faq.answer),
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
