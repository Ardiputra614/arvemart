"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";

export default function VerifyPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");

  const [message, setMessage] = useState("Verifying...");

  useEffect(() => {
    async function verify() {
      try {
        await api.get(`/api/auth/verify?token=${token}`);
        setMessage("Email berhasil diverifikasi");

        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } catch (err) {
        setMessage("Token tidak valid atau expired");
      }
    }

    if (token) verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <h1>{message}</h1>
    </div>
  );
}
