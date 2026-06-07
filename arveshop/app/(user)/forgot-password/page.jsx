"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const url = process.env.NEXT_PUBLIC_GOLANG_URL;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post(`${url}/api/auth/forgot-password`, { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal, coba lagi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <h1 className="text-white text-3xl font-light mb-2">Reset password</h1>
          <p className="text-white text-sm">
            Masukkan email untuk menerima link reset password.
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-green-400 text-sm mb-4">
              Link reset password telah dikirim ke email kamu.
            </p>
            <Link href="/login" className="text-white underline text-sm">
              Kembali ke Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs mb-2 uppercase text-white">Email</label>
              <input
                type="email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukan email"
                className="w-full py-3 text-sm bg-gray-500 rounded-lg text-white px-3 placeholder:text-gray-100"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-4 bg-white text-black text-sm uppercase transition-all hover:bg-gray-100"
            >
              {loading ? "Loading..." : "Kirim Link Reset →"}
            </button>

            <p className="text-center text-xs text-white mt-4">
              <Link href="/login" className="underline">Kembali ke Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
