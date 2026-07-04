"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const email = params.get("email");
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function check() {
      if (!email) return;

      try {
        const res = await api.get(
          `/api/auth/check-verification?email=${email}`,
        );

        if (res.data.verified) {
          // ✅ sudah verified → lempar ke home
          router.replace("/");
        }
      } catch (err) {
        router.replace("/login");
      }
    }

    check();
  }, [email, router]);

  async function resend() {
    try {
      setLoading(true);

      await api.post("/api/auth/resend-verification", {
        email,
      });

      setMessage("Email verifikasi dikirim ulang");
    } catch (err) {
      setMessage("Gagal kirim ulang");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl mb-4">Verifikasi Email</h1>

        <p className="text-sm mb-6">
          Kami sudah mengirim link verifikasi ke:
          <br />
          <b>{email}</b>
        </p>

        <button
          onClick={resend}
          disabled={loading}
          className="bg-white text-black px-4 py-2"
        >
          {loading ? "Loading..." : "Kirim Ulang"}
        </button>

        {message && <p className="mt-4 text-sm">{message}</p>}
      </div>
    </div>
  );
}
