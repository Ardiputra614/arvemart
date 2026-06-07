"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Lock,
  Save,
  ArrowLeft,
  Loader2,
  Shield,
} from "lucide-react";
import api from "@/lib/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    no_hp: "",
    email: "",
    current_password: "",
    new_password: "",
  });

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get("/api/me");
      const userData = res.data?.user;
      if (!userData) {
        router.push("/login");
        return;
      }
      setUser(userData);
      setForm({
        name: userData.name || "",
        no_hp: userData.no_hp || "",
        email: userData.email || "",
        current_password: "",
        new_password: "",
      });
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (form.name !== user.name) payload.name = form.name;
      if (form.no_hp !== user.no_hp) payload.no_hp = form.no_hp;
      if (form.email !== user.email) payload.email = form.email;
      if (form.new_password) {
        payload.current_password = form.current_password;
        payload.new_password = form.new_password;
      }

      if (Object.keys(payload).length === 0) {
        toast.info("Tidak ada perubahan");
        return;
      }

      const res = await api.put("/api/me", payload);
      setUser(res.data.user);
      setForm((prev) => ({ ...prev, current_password: "", new_password: "" }));

      if (payload.email) {
        toast.success("Email diubah. Verifikasi email baru kamu.");
        setTimeout(() => router.push(`/verify-email?email=${form.email}`), 1500);
        return;
      }

      toast.success("Profil berhasil diperbarui");
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal update profil";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const getInitial = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      <div className="min-h-screen text-white px-4 py-8 max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Kembali
        </button>

        <h1 className="text-2xl font-bold mb-8">Edit Profil</h1>

        <div className="bg-[#2a2a2e] rounded-xl overflow-hidden">
          {/* Avatar Header */}
          <div className="px-6 py-6 bg-[#1a191d] flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
              {getInitial(user.name)}
            </div>
            <div>
              <p className="text-lg font-semibold">{user.name}</p>
              <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                {user.role === "superadmin" ? (
                  <>
                    <Shield size={14} className="text-blue-400" />
                    Super Admin
                  </>
                ) : (
                  "Member"
                )}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <User size={16} /> Nama
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full bg-[#1a191d] text-white px-4 py-3 rounded-lg outline-none border border-gray-700 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <Mail size={16} /> Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full bg-[#1a191d] text-white px-4 py-3 rounded-lg outline-none border border-gray-700 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <Phone size={16} /> No. HP
              </label>
              <input
                type="text"
                name="no_hp"
                value={form.no_hp}
                onChange={handleChange}
                className="w-full bg-[#1a191d] text-white px-4 py-3 rounded-lg outline-none border border-gray-700 focus:border-blue-500 transition-colors"
              />
            </div>

            <hr className="border-gray-700" />

            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-1">
                Ubah Password
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Kosongkan jika tidak ingin mengganti password
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <Lock size={16} /> Password Saat Ini
              </label>
              <input
                type="password"
                name="current_password"
                value={form.current_password}
                onChange={handleChange}
                placeholder="Diisi hanya jika ingin ganti password"
                className="w-full bg-[#1a191d] text-white px-4 py-3 rounded-lg outline-none border border-gray-700 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <Lock size={16} /> Password Baru
              </label>
              <input
                type="password"
                name="new_password"
                value={form.new_password}
                onChange={handleChange}
                placeholder="Minimal 6 karakter"
                className="w-full bg-[#1a191d] text-white px-4 py-3 rounded-lg outline-none border border-gray-700 focus:border-blue-500 transition-colors"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save size={20} />
              )}
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
