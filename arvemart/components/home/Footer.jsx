"use client";

import Link from "next/link";
import {
  Facebook,
  Instagram,
  Twitter,
  Mail,
  PhoneCall,
  MapPin,
  Shield,
  Zap,
  Users,
  MessageCircle,
  HelpCircle,
} from "lucide-react";
import api from "@/lib/api";
import { useEffect, useState } from "react";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [paymentMethod, setPaymentMethod] = useState([]);
  const [profil, setProfil] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pmRes, profilRes] = await Promise.all([
          api.get("/api/payment-method"),
          api.get("/api/profil-aplikasi"),
        ]);
        setPaymentMethod(pmRes.data.data);
        setProfil(profilRes.data.data);
      } catch (error) {
        console.error("Gagal mengambil data footer", error);
      }
    };

    fetchData();
  }, []);

  const socialLinks = [
    {
      url: profil?.facebook,
      icon: <Facebook size={18} />,
      bg: "bg-blue-600",
      label: "Facebook",
    },
    {
      url: profil?.instagram,
      icon: <Instagram size={18} />,
      bg: "bg-pink-600",
      label: "Instagram",
    },
    {
      url: profil?.twitter,
      icon: <Twitter size={18} />,
      bg: "bg-sky-500",
      label: "Twitter",
    },
  ];

  return (
    <footer className="bg-[#44444E] border-t border-gray-700/50 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#44444E] flex items-center justify-center">
                <Zap className="text-white" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-400 -mt-2">Top Up & Payment</p>
              </div>
            </div>

            <p className="text-gray-300">
              Platform top up terpercaya dengan layanan lengkap dan proses
              instan.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <PhoneCall size={14} className="text-gray-400" />
                <span className="text-gray-300">
                  {profil?.business_phone || "+62 878-6470-5664"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={14} className="text-gray-400" />
                <span className="text-gray-300">
                  {profil?.business_email || "arfenaz@gmail.com"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={14} className="text-gray-400" />
                <span className="text-gray-300">
                  {profil?.business_address || "Purbalingga, Central Java"}
                </span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[#D3DAD9] flex items-center gap-2">
              <Shield size={18} className="text-teal-400" />
              Informasi
            </h3>
            <ul className="space-y-3">
              {[
                { name: "Syarat & Ketentuan", href: "/term-condition" },
                { name: "Kebijakan Privasi", href: "/privacy-policy" },
                { name: "Kebijakan Refund", href: "/refund-policy" },
                { name: "FAQ", href: "/faq" },
                { name: "Kontak", href: "/contact" },
              ].map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-gray-400 hover:text-teal-400 transition"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>

            {profil?.no_wa && (
              <div className="pt-4">
                <a
                  href={`https://wa.me/${profil.no_wa.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                >
                  <MessageCircle size={16} />
                  Hubungi WhatsApp
                </a>
              </div>
            )}
          </div>

          {/* Social */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[#D3DAD9] flex items-center gap-2">
              <Users size={18} className="text-cyan-400" />
              Terhubung Dengan Kami
            </h3>

            <div className="flex gap-3">
              {socialLinks.filter((s) => s.url).map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center text-white hover:opacity-80 transition`}
                >
                  {s.icon}
                </a>
              ))}
            </div>

            <div className="pt-6 border-t border-gray-700/50">
              <p className="text-gray-400 text-sm mb-3">Metode Pembayaran</p>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {paymentMethod.map((m, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg p-2 flex items-center justify-center 
                 hover:bg-gray-700 transition cursor-pointer"
                    title={m.name}
                  >
                    {m.logo ? (
                      <img
                        src={m.logo}
                        alt={m.name}
                        className="h-6 object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-gray-400">N/A</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-700/50 text-center">
          <p className="text-gray-400 text-sm">
            &copy; {currentYear}{" "}
            <span className="text-purple-400 font-semibold">ARFENAZ</span>. All
            rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
