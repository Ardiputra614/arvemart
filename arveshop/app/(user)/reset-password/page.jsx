"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const url = process.env.NEXT_PUBLIC_GOLANG_URL;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Password tidak cocok");
      return;
    }

    if (!token) {
      setError("Token tidak valid");
      return;
    }

    setLoading(true);

    try {
      await api.post(`${url}/api/auth/reset-password`, {
        token,
        new_password: password,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal reset password");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-red-400 text-sm mb-4">Link reset password tidak valid.</p>
        <Link href="/forgot-password" className="text-white underline text-sm">
          Minta link baru
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <p className="text-green-400 text-sm mb-4">
          Password berhasil direset. Silakan login.
        </p>
        <Link href="/login" className="text-white underline text-sm">
          Login Sekarang
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs mb-2 uppercase text-white">Password Baru</label>
        <input
          type="password"
          value={password}
          required
          minLength={6}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimal 6 karakter"
          className="w-full py-3 text-sm bg-gray-500 rounded-lg text-white px-3 placeholder:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-xs mb-2 uppercase text-white">Konfirmasi Password</label>
        <input
          type="password"
          value={confirm}
          required
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Ulangi password"
          className="w-full py-3 text-sm bg-gray-500 rounded-lg text-white px-3 placeholder:text-gray-100"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-4 py-4 bg-white text-black text-sm uppercase transition-all hover:bg-gray-100"
      >
        {loading ? "Loading..." : "Reset Password →"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <h1 className="text-white text-3xl font-light mb-2">Reset password</h1>
          <p className="text-white text-sm">Masukkan password baru kamu.</p>
        </div>

        <Suspense fallback={<p className="text-white text-sm">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
