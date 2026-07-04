// hooks/useUser.js
"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${process.env.NEXT_PUBLIC_GOLANG_URL}/api/me`, {
        withCredentials: true, // ✅ kirim cookie
      })
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
