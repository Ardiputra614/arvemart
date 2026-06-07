"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";

export default function ChatCustomer() {
  const [open, setOpen] = useState(false);

  const csList = [
    {
      name: "Customer Service WhatsApp",
      desc: "Respon cepat 24 jam",
      link: "https://wa.me/6287864705663",
    },
    {
      name: "Instagram Admin",
      desc: "@arveshop.official",
      link: "https://instagram.com/arveshop.official",
    },
  ];

  return (
    <>
      {/* FLOAT BUTTON */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setOpen(!open)}
          className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition"
        >
          {open ? <X size={20} /> : <MessageCircle size={20} />}
        </button>
      </div>

      {/* OVERLAY LIST */}
      {open && (
        <div className="fixed bottom-20 right-6 w-80 max-w-[90vw] bg-[#2F2F37] rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* HEADER */}
          <div className="bg-[#44444E] p-4 text-white flex justify-between items-center">
            <h3 className="font-bold">Hubungi Kami</h3>
            <button onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* LIST CS */}
          <div className="p-3 space-y-3">
            {csList.map((cs, index) => (
              <a
                key={index}
                href={cs.link}
                target="_blank"
                className="flex items-center gap-3 p-3 rounded-xl bg-[#3A3A42] hover:bg-[#4A4A52] transition"
              >
                {/* ICON BULAT */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white bg-gray-700`}
                >
                  💬
                </div>

                {/* TEXT */}
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
