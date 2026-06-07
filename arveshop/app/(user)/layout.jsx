import { Geist, Geist_Mono } from "next/font/google";
import Header from "../../components/home/header";
import Footer from "../../components/home/Footer";
import { cookies } from "next/headers";
import ChatCustomer from "../../components/home/ChatCustomer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

async function getUser() {
  try {
    const cookieStore = await cookies();

    // ✅ Build cookie header dengan benar
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    // ✅ Cek token ada dulu sebelum fetch
    const accessToken = cookieStore.get("access_token");
    if (!accessToken) return null;

    // const res = await fetch(`${process.env.NEXT_PUBLIC_GOLANG_URL}/api/me`, {
    const res = await fetch(`${process.env.GOLANG_URL}/api/me`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.user ?? null;
  } catch (error) {
    // ✅ Kalau fetch gagal (backend mati, network error, dll) — return null saja
    // console.error("getUser error:", error.message);
    return null;
  }
}

// ✅ async di depan function
export default async function HomeLayout({ children }) {
  const user = await getUser(); // harus await

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#37353E]`}
    >
      <Header user={user} />
      <div className="container mx-auto">{children}</div>

      <ChatCustomer />
      <Footer />
    </div>
  );
}
