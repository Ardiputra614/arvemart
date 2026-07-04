"use client";

import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import api from "@/lib/api";

export default function ChatCustomer() {
  const [open, setOpen] = useState(false);
  const [profil, setProfil] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/api/profil-aplikasi");
        setProfil(res.data.data);
      } catch (_) {}
    };
    fetchData();
  }, []);

  const csList = [];
  if (profil?.no_wa) {
    csList.push({
      name: "Customer Service WhatsApp",
      desc: "Respon cepat 24 jam",
      link: `https://wa.me/${profil.no_wa.replace(/[^0-9]/g, "")}`,
    });
  }
  if (profil?.instagram) {
    csList.push({
      name: "Instagram",
      desc: profil.instagram.replace(/https?:\/\/(www\.)?/, ""),
      link: profil.instagram,
    });
  }
  if (profil?.facebook) {
    csList.push({
      name: "Facebook",
      desc: profil.facebook.replace(/https?:\/\/(www\.)?/, ""),
      link: profil.facebook,
    });
  }
  if (profil?.twitter) {
    csList.push({
      name: "Twitter",
      desc: profil.twitter.replace(/https?:\/\/(www\.)?/, ""),
      link: profil.twitter,
    });
  }
  if (profil?.business_email) {
    csList.push({
      name: "Email",
      desc: profil.business_email,
      link: `mailto:${profil.business_email}`,
    });
  }

  if (csList.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setOpen(!open)}
          className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition"
        >
          {open ? <X size={20} /> : <MessageCircle size={20} />}
        </button>
      </div>

      {open && (
        <div className="fixed bottom-20 right-6 w-80 max-w-[90vw] bg-[#2F2F37] rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="bg-[#44444E] p-4 text-white flex justify-between items-center">
            <h3 className="font-bold">Hubungi Kami</h3>
            <button onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="p-3 space-y-3">
            {csList.map((cs, index) => (
              <a
                key={index}
                href={cs.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-[#3A3A42] hover:bg-[#4A4A52] transition"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-gray-700">
                  💬
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{cs.name}</p>
                  <p className="text-gray-400 text-xs">{cs.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
