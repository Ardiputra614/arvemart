import Navbar from "../../components/home/header";
import Footer from "../../components/home/Footer";
import ChatCustomer from "../../components/home/ChatCustomer";

export default function HomeLayout({ children }) {
  return (
    <>
      <Navbar />
      <div className="bg-[#37353E] min-h-screen w-full">
        <div className="container mx-auto">
          {children}
        </div>
      </div>
      <ChatCustomer />
      <Footer />
    </>
  );
}