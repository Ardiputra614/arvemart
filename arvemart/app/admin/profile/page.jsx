"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Lock,
  Save,
  Loader2,
  Shield,
} from "lucide-react";
import api from "@/lib/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdminProfilePage() {
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
      if (!userData || userData.role !== "superadmin") {
        router.push("/admin/dashboard");
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

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} theme="light" />
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <User className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Profil</h1>
            <p className="text-sm text-gray-500 mt-1">
              Perbarui informasi akun admin Anda
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                Super Admin
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <User size={15} className="text-gray-400" /> Nama
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Mail size={15} className="text-gray-400" /> Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Phone size={15} className="text-gray-400" /> No. HP
                </label>
                <input
                  type="text"
                  name="no_hp"
                  value={form.no_hp}
                  onChange={handleChange}
                  className="w-full border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <hr className="border-gray-200" />

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Lock size={15} className="text-gray-400" /> Ubah Password
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Kosongkan jika tidak ingin mengganti password
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Lock size={15} className="text-gray-400" /> Password Saat
                    Ini
                  </label>
                  <input
                    type="password"
                    name="current_password"
                    value={form.current_password}
                    onChange={handleChange}
                    placeholder="Diisi jika ingin ganti password"
                    className="w-full border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Lock size={15} className="text-gray-400" /> Password Baru
                  </label>
                  <input
                    type="password"
                    name="new_password"
                    value={form.new_password}
                    onChange={handleChange}
                    placeholder="Minimal 6 karakter"
                    className="w-full border border-gray-300 text-gray-900 px-4 py-2.5 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
