"use client";

import api from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  PhoneCall,
  Mail,
  MapPin,
  MessageCircle,
  Facebook,
  Instagram,
  Twitter,
} from "lucide-react";
import Link from "next/link";

export default function ContactPage() {
  const [profil, setProfil] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/api/profil-aplikasi");
        setProfil(res.data.data);
      } catch (error) {
        toast.error("Gagal mengambil data kontak");
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen text-gray-200 px-3 py-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-center text-2xl font-bold mb-8 text-white">
          Kontak Kami
        </h1>

        {!profil ? (
          <div className="text-center text-gray-400">Memuat data...</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-[#2a2a2e] rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center">
                  <PhoneCall size={22} className="text-teal-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Telepon</p>
                  <p className="text-white font-medium">
                    {profil.business_phone || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center">
                  <Mail size={22} className="text-teal-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-white font-medium">
                    {profil.business_email || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center">
                  <MapPin size={22} className="text-teal-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Alamat</p>
                  <p className="text-white font-medium">
                    {profil.business_address || "-"}
                  </p>
                </div>
              </div>
            </div>

            {profil.no_wa && (
              <a
                href={`https://wa.me/${profil.no_wa.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium"
              >
                <MessageCircle size={20} />
                Hubungi Via WhatsApp
              </a>
            )}

            <div className="bg-[#2a2a2e] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Ikuti Kami
              </h2>
              <div className="flex gap-4">
                {profil.facebook && (
                  <a
                    href={profil.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white hover:opacity-80 transition"
                  >
                    <Facebook size={20} />
                  </a>
                )}
                {profil.instagram && (
                  <a
                    href={profil.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center text-white hover:opacity-80 transition"
                  >
                    <Instagram size={20} />
                  </a>
                )}
                {profil.twitter && (
                  <a
                    href={profil.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-sky-500 rounded-xl flex items-center justify-center text-white hover:opacity-80 transition"
                  >
                    <Twitter size={20} />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
