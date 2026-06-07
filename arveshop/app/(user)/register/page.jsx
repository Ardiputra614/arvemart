"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [noHp, setNoHp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [, setFocused] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const url = process.env.NEXT_PUBLIC_GOLANG_URL;
  const strength =
    password.length === 0
      ? 0
      : password.length < 6
        ? 1
        : password.length < 10
          ? 2
          : 3;

  const strengthLabel = ["", "Weak", "Fair", "Strong"];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#22c55e"];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Password tidak cocok");
      return;
    }

    try {
      setLoading(true);

      await api.post(`${url}/api/auth/register`, {
        name,
        no_hp: noHp,
        email,
        password,
      });

      // Kalau backend auto-login → bisa langsung push("/")
      // router.push("/login");
      router.push(`/verify-email?email=${email}`);
    } catch (error) {
      const code = error.response?.data?.code;
      const message = error.response?.data?.message;
      console.log(error);

      if (code === "EMAIL_NOT_VERIFIED") {
        // redirect ke halaman verify + kirim email
        router.push(`/verify-email?email=${email}`);
        return;
      }
      setError(err.response?.data?.message || "Register gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <h1 className="text-white text-3xl font-light mb-2">
            Create account.
          </h1>
          <p className="text-white text-sm">
            Get started — it only takes a moment.
          </p>

          <p className="text-xs text-gray-300">
            Setelah daftar, cek email untuk verifikasi akun.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* NAME */}
          <div>
            <label className="block text-xs mb-2 uppercase text-white">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              required
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
              placeholder="Masukan Nama"
              className="w-full py-3 text-sm bg-gray-500 rounded-lg text-white px-3 placeholder:text-gray-100"
            />
          </div>

          {/* NO. HP */}
          <div>
            <label className="block text-xs mb-2 uppercase text-white">
              No. HP
            </label>
            <input
              type="tel"
              value={noHp}
              required
              onChange={(e) => setNoHp(e.target.value)}
              placeholder="Masukan nomor HP"
              className="w-full py-3 text-sm bg-gray-500 rounded-lg text-white px-3 placeholder:text-gray-100"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="block text-xs mb-2 uppercase text-white">
              Email
            </label>
            <input
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukan email"
              className="w-full py-3 text-sm bg-gray-500 rounded-lg text-white px-3 placeholder:text-gray-100"
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-xs mb-2 uppercase text-white">
              Password
            </label>
            <input
              type="password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukan Password"
              className="w-full py-3 text-sm bg-gray-500 rounded-lg text-white px-3 placeholder:text-gray-100"
            />

            {password.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-1 flex-1"
                      style={{
                        backgroundColor:
                          strength >= i ? strengthColor[strength] : "#333",
                      }}
                    />
                  ))}
                </div>
                <span
                  className="text-xs"
                  style={{ color: strengthColor[strength] }}
                >
                  {strengthLabel[strength]}
                </span>
              </div>
            )}
          </div>

          {/* CONFIRM */}
          <div>
            <label className="block text-xs mb-2 uppercase text-white">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              required
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Masukan ulang password"
              className="w-full py-3 text-sm bg-gray-500 rounded-lg text-white px-3 placeholder:text-gray-100"
            />
          </div>

          {/* ERROR */}
          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-4 bg-white text-black text-sm uppercase transition-all hover:bg-gray-100"
          >
            {loading ? "Loading..." : "Create Account →"}
          </button>
        </form>

        <p className="text-center text-xs text-white mt-8">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
