"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function LoginPage() {
  const [focused, setFocused] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const url = process.env.NEXT_PUBLIC_GOLANG_URL;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post(`${url}/api/auth/login`, { email, password });

      // ✅ Cek apakah ada halaman yang disimpan sebelumnya
      const redirectTo = sessionStorage.getItem("redirectAfterLogin");
      sessionStorage.removeItem("redirectAfterLogin");

      router.push(redirectTo || "/");
      router.refresh();
    } catch (error) {
      const code = error.response?.data?.code;
      const message = error.response?.data?.message;
      console.log(error);

      if (code === "EMAIL_NOT_VERIFIED") {
        // redirect ke halaman verify + kirim email
        router.push(`/verify-email?email=${email}`);
        return;
      }

      setError(message || "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Heading */}
        <div className="mb-10">
          <h1
            className="text-white text-3xl font-light mb-2"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Sign In
          </h1>
          <p
            className="text-gray-100 text-sm"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            Enter your credentials to continue.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className="block text-xs mb-2 tracking-widest uppercase text-white"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              placeholder="you@example.com"
              required
              className="w-full px-3 border-b py-3 text-sm bg-gray-500 rounded-lg outline-none transition-colors duration-200 text-white placeholder-gray-100"
              style={{
                fontFamily: "'Courier New', monospace",
                borderColor: focused === "email" ? "#fff" : "#333",
              }}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label
                className="text-xs tracking-widest uppercase text-white"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-white hover:text-gray-300 transition-colors duration-200"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                Forgot?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              placeholder="••••••••"
              required
              className="w-full border-b py-3 px-3 text-sm bg-gray-500 rounded-lg outline-none transition-colors duration-200 text-white placeholder-gray-100"
              style={{
                fontFamily: "'Courier New', monospace",
                borderColor: focused === "password" ? "#fff" : "#333",
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-10 py-4 bg-white text-black text-sm tracking-widest uppercase transition-all duration-200 hover:bg-gray-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {loading ? "Signing In..." : "Sign In →"}
          </button>
        </form>

        {/* Switch */}
        <p
          className="text-center text-xs text-gray-100 mt-8"
          style={{ fontFamily: "'Courier New', monospace" }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-white underline underline-offset-2 hover:no-underline transition-all"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
