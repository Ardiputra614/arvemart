"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, Search, BookOpen, Feather, ChevronRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_GOLANG_URL || "https://api.arvemart.com";

export default function BlogLayout({ children }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Adsterra - loaded via AdsterraBanner component */}

      {/* Top Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-slate-300 text-xs py-2">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-white transition">arvemart.com</Link>
            <span className="text-slate-600">|</span>
            <span className="font-medium text-white tracking-wide">Blog</span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <Link href="/blog" className="hover:text-white transition">Artikel</Link>
            <Link href="/blog/story" className="hover:text-white transition">Cerita</Link>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/60" : "bg-white border-b border-slate-100"}`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/blog" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-all">
                <Feather className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900 tracking-tight">ARVE</span>
                <span className="text-lg font-light text-slate-400 tracking-tight">Blog</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink href="/blog" label="Artikel" active={pathname === "/blog"} />
              <NavLink href="/blog/story" label="Cerita" active={pathname.startsWith("/blog/story")} />
            </nav>

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition"
            >
              {mobileOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              <Link href="/blog" onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition ${pathname === "/blog" ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50"}`}>
                Artikel
              </Link>
              <Link href="/blog/story" onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition ${pathname.startsWith("/blog/story") ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50"}`}>
                Cerita
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 mt-20">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                <Feather className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold">ARVE Blog</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/blog" className="hover:text-white transition">Artikel</Link>
              <Link href="/blog/story" className="hover:text-white transition">Cerita</Link>
              <Link href="/" className="hover:text-white transition">Kembali ke ARVEMART</Link>
            </div>
            <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} ARVE Blog. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, label, active }) {
  return (
    <Link
      href={href}
      className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        active
          ? "text-violet-700 bg-violet-50"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
      }`}
    >
      {label}
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-violet-600 rounded-full" />
      )}
    </Link>
  );
}
