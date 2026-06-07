"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import api from "@/lib/api";

export default function Navbar({ user }) {
  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState(false);

  // 🔥 SEARCH STATE
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  // =========================
  // 🔥 SEARCH DEBOUNCE
  // =========================
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        setLoadingSearch(true);
        const res = await api.get(`/api/services/search?q=${query}`);
        setResults(res.data.data || []);
        setShowSearch(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [query]);

  // =========================
  // 🔥 CLOSE CLICK OUTSIDE
  // =========================
  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest("#search-box")) {
        setShowSearch(false);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const isActive = (path) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const menuClass = (path) =>
    isActive(path)
      ? "text-white border-b-2 border-blue-500 pb-1"
      : "text-gray-300 hover:text-white pb-1";

  const getInitial = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  const handleLogout = async () => {
    await api.post(`/api/auth/logout`);
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <nav className="bg-[#1a191d] border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* LOGO */}
            <Link href="/" className="text-white font-bold text-lg">
              ARVE
            </Link>

            {/* ========================= */}
            {/* 🔥 SEARCH DESKTOP */}
            {/* ========================= */}
            <div
              id="search-box"
              className="flex-1 max-w-2xl hidden md:block relative"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSearch(true)}
                placeholder="Cari Game dan lainnya"
                className="w-full bg-[#2a2a2e] text-white px-5 py-2.5 rounded-full outline-none border border-gray-700 focus:border-blue-500"
              />

              {showSearch && (
                <div className="absolute top-full mt-2 w-full bg-[#222] border border-gray-700 rounded-xl shadow-lg overflow-hidden z-50">
                  {loadingSearch && (
                    <div className="p-4 text-sm text-gray-400">Loading...</div>
                  )}

                  {!loadingSearch && query && results.length === 0 && (
                    <div className="p-4 text-sm text-gray-400">
                      Tidak ditemukan
                    </div>
                  )}

                  {!loadingSearch &&
                    results.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          router.push(`/${item.slug}`);
                          setShowSearch(false);
                          setQuery("");
                        }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700 cursor-pointer"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                        <span className="text-sm text-white">{item.name}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-4">
              {/* 🔥 MOBILE SEARCH BUTTON */}
              <button
                className="md:hidden text-white"
                onClick={() => setMobileSearchOpen(true)}
              >
                🔍
              </button>

              {/* USER */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setDropdown(!dropdown)}
                    className="flex items-center gap-3 bg-gray-700 px-3 py-2 rounded-lg text-white"
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-blue-600 rounded-full text-sm font-bold">
                      {getInitial(user.name)}
                    </div>
                    <span className="hidden md:block">{user.name}</span>
                    <ChevronDown size={16} />
                  </button>

                  {dropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-[#222] border border-gray-700 rounded-lg shadow-lg">
                      <Link
                        href="/history"
                        className="block px-4 py-3 text-sm text-gray-300 hover:bg-gray-700"
                      >
                        History
                      </Link>
                      <Link
                        href="/profile"
                        className="block px-4 py-3 text-sm text-gray-300 hover:bg-gray-700"
                      >
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-700"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="text-gray-300 hover:text-white">
                  Login
                </Link>
              )}

              {/* MOBILE MENU BUTTON */}
              <button
                className="md:hidden text-white"
                onClick={() => setOpen(!open)}
              >
                {open ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex items-center gap-8 h-12 border-t border-gray-800 text-sm">
            <Link href="/" className={menuClass("/")}>
              Topup
            </Link>
            <Link href="/cek-transaksi" className={menuClass("/cek-transaksi")}>
              Cek Transaksi
            </Link>
          </div>
        </div>
      </nav>

      {/* ========================= */}
      {/* 🔥 MOBILE MENU */}
      {/* ========================= */}
      {open && (
        <div className="md:hidden bg-[#1a191d] border-t border-gray-800 px-4 py-4 space-y-4">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="block text-gray-300"
          >
            Topup
          </Link>

          <Link
            href="/cek-transaksi"
            onClick={() => setOpen(false)}
            className="block text-gray-300"
          >
            Cek Transaksi
          </Link>

          {user ? (
            <>
              <Link
                href="/history"
                onClick={() => setOpen(false)}
                className="block text-gray-300"
              >
                History
              </Link>

              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="block text-gray-300"
              >
                Profile
              </Link>

              <button
                onClick={() => {
                  handleLogout();
                  setOpen(false);
                }}
                className="block text-red-400"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block text-gray-300"
            >
              Login
            </Link>
          )}
        </div>
      )}

      {/* ========================= */}
      {/* 🔥 MOBILE SEARCH OVERLAY */}
      {/* ========================= */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 bg-[#1a191d] z-[999] flex flex-col">
          <div className="flex items-center gap-3 p-4 border-b border-gray-700">
            <button onClick={() => setMobileSearchOpen(false)}>
              <X className="text-white" />
            </button>

            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari Game..."
              className="flex-1 bg-[#2a2a2e] text-white px-4 py-2 rounded-lg outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingSearch && (
              <div className="p-4 text-gray-400">Loading...</div>
            )}

            {!loadingSearch && query && results.length === 0 && (
              <div className="p-4 text-gray-400">Tidak ditemukan</div>
            )}

            {!loadingSearch &&
              results.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    router.push(`/${item.slug}`);
                    setMobileSearchOpen(false);
                    setQuery("");
                  }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-800"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <span className="text-white text-sm">{item.name}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
}
