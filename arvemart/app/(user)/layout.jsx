import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "../../components/home/header"; // pakai Navbar
import Footer from "../../components/home/Footer";
import ChatCustomer from "../../components/home/ChatCustomer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function HomeLayout({ children }) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#37353E]`}>
      <Navbar />
      <div className="container mx-auto">{children}</div>
      <ChatCustomer />
      <Footer />
    </div>
  );
}