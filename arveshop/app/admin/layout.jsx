"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  CreditCard,
  ShoppingCart,
  FolderTree,
  Settings,
  MessageSquare,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  WalletCards,
  ChartBarBig,
  Users,
  PanelTop,
} from "lucide-react";
import api from "@/lib/api";

export default function AdminLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  // Fetch user & cek role superadmin
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/api/me");
        const userData = res?.data?.user;

        // ✅ Kalau bukan superadmin, redirect ke home
        if (userData?.role !== "superadmin") {
          router.replace("/");
          return;
        }

        setUser(userData);
      } catch (err) {
        // Token invalid / tidak login → redirect ke login
        router.replace("/login");
      }
    };

    fetchUser();
  }, [router]);

  // Handle scroll
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (err) {
      console.error(err);
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const navLinks = [
    {
      href: "/admin/dashboard",
      label: "Dashboard",
      icon: <Home className="w-5 h-5" />,
      exact: true,
    },
    {
      href: "/admin/banners",
      label: "Banner",
      icon: <PanelTop className="w-5 h-5" />,
    },
    {
      href: "/admin/payment-method",
      label: "Payment Method",
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      href: "/admin/transaction",
      label: "Transaction",
      icon: <ShoppingCart className="w-5 h-5" />,
    },
    {
      href: "/admin/categories",
      label: "Category",
      icon: <FolderTree className="w-5 h-5" />,
    },
    {
      href: "/admin/services",
      label: "Service",
      icon: <Settings className="w-5 h-5" />,
    },
    {
      href: "/admin/users",
      label: "Users",
      icon: <Users className="w-5 h-5" />,
    },
    {
      href: "/admin/whatsapp",
      label: "WhatsApp Engine",
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      href: "/admin/profil-aplikasi",
      label: "Profil Aplikasi",
      icon: <User className="w-5 h-5" />,
    },
    {
      href: "/admin/topup",
      label: "Top up",
      icon: <WalletCards className="w-5 h-5" />,
    },
    {
      href: "/admin/monitor",
      label: "Monitor Digiflazz",
      icon: <ChartBarBig className="w-5 h-5" />,
    },
  ];

  const profileLinks = [
    {
      type: "link",
      href: "/admin/profile",
      label: "Edit Profil",
      icon: <User className="w-4 h-4" />,
    },
    { type: "divider" },
    {
      type: "button",
      label: "Logout",
      icon: <LogOut className="w-4 h-4" />,
      onClick: handleLogout,
      danger: true,
    },
  ];

  const isActive = (href, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  // ✅ Tampilkan loading sampai user terverifikasi
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-black bg-gray-50">
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-md"
            : "bg-white border-b border-gray-100"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link
                href="/admin/dashboard"
                className="flex items-center space-x-3"
              >
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <div className="hidden md:block">
                  <h1 className="text-xl font-bold text-gray-900">
                    AdminPanel
                  </h1>
                  <p className="text-xs text-gray-500">Management System</p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.slice(0, 5).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href, link.exact)
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="mr-2">{link.icon}</span>
                  {link.label}
                </Link>
              ))}

              {/* More dropdown */}
              <div className="relative group">
                <button className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium">
                  <span className="mr-1">More</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  {navLinks.slice(5).map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center px-4 py-3 hover:bg-gray-50 text-sm ${
                        isActive(link.href)
                          ? "text-indigo-600 font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      <span className="mr-3">{link.icon}</span>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* User dropdown */}
              <div className="relative">
                <button
                  onClick={() =>
                    setIsProfileDropdownOpen(!isProfileDropdownOpen)
                  }
                  className="flex items-center space-x-3 p-1 rounded-lg hover:bg-gray-100"
                >
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium text-gray-900">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500">Super Admin</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      isProfileDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>

                    {profileLinks.map((item, index) => {
                      if (item.type === "divider") {
                        return (
                          <div
                            key={index}
                            className="border-t border-gray-100 my-2"
                          />
                        );
                      }
                      if (item.type === "button") {
                        return (
                          <button
                            key={index}
                            onClick={() => {
                              item.onClick();
                              setIsProfileDropdownOpen(false);
                            }}
                            className={`flex items-center w-full px-4 py-3 text-sm hover:bg-gray-50 ${
                              item.danger ? "text-red-600" : "text-gray-700"
                            }`}
                          >
                            <span className="mr-3">{item.icon}</span>
                            {item.label}
                          </button>
                        );
                      }
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <span className="mr-3">{item.icon}</span>
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg ${
                    isActive(link.href, link.exact)
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="mr-3">{link.icon}</span>
                  {link.label}
                </Link>
              ))}

              <div className="pt-4 border-t border-gray-100">
                {profileLinks.map((item, index) => {
                  if (item.type === "divider") return null;
                  if (item.type === "button") {
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          item.onClick?.();
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex items-center w-full px-4 py-3 rounded-lg text-sm ${
                          item.danger
                            ? "text-red-600 hover:bg-red-50"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <span className="mr-3">{item.icon}</span>
                        {item.label}
                      </button>
                    );
                  }
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 text-sm"
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} AdminPanel. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Close dropdown when clicking outside */}
      {isProfileDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsProfileDropdownOpen(false)}
        />
      )}
    </div>
  );
}
