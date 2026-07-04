"use client";

import { useState, useEffect } from "react";
import FormatRupiah from "../../../../components/home/FormatRupiah";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import { useUser } from "@/hooks/useUser";

export default function AdminTopupDetail() {
  const url = process.env.NEXT_PUBLIC_GOLANG_URL || "https://api.arvemart.com";
  const params = useParams();
  const slug = params.slug;
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState(null);

  const [accountData, setAccountData] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const { user } = useUser();

  const [voucherCode, setVoucherCode] = useState("");
  const [voucherData, setVoucherData] = useState(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherLoading, setVoucherLoading] = useState(false);

  const [applicationFee, setApplicationFee] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, serviceRes, profilRes] = await Promise.all([
          axios.get(`${url}/api/products/${slug}`),
          axios.get(`${url}/api/service/${slug}`),
          axios.get(`${url}/api/profil-aplikasi`),
        ]);

        setProducts(productsRes.data.data || []);
        setService(serviceRes.data.data || null);
        setApplicationFee(parseFloat(profilRes.data.data?.application_fee) || 0);
      } catch (error) {
        let msg = "Gagal memuat data";
        if (error.response?.status === 404) msg = "Data tidak ditemukan";
        else if (error.response?.status === 500) msg = "Server error";
        else if (error.request) msg = "Koneksi ke server gagal";
        toast.error(msg);
        setProducts([]);
        setService(null);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchData();
  }, [slug, url]);

  const formatCustomerNo = () => {
    if (!service) return "";
    if (service.customer_no_format === "satu_input")
      return accountData.field1 || "";
    if (service.customer_no_format === "dua_input") {
      const f1 = accountData.field1 || "";
      const f2 = accountData.field2 || "";
      return f1 && f2 ? `${f1}|${f2}` : f1 || f2 || "";
    }
    return "";
  };

  const isAccountComplete = () => {
    if (!service) return false;
    if (service.customer_no_format === "satu_input")
      return !!accountData.field1?.trim();
    if (service.customer_no_format === "dua_input")
      return !!(accountData.field1?.trim() && accountData.field2?.trim());
    return false;
  };

  const isFormComplete = () =>
    isAccountComplete() && selectedProduct && customerName.trim() && agreed;

  const calculateTotalPayment = () => {
    const price = Number(selectedProduct?.selling_price) || 0;
    return price + applicationFee - voucherDiscount;
  };

  const handleApplyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      toast.error("Masukkan kode voucher");
      return;
    }

    setVoucherCode(code);
    setVoucherLoading(true);
    try {
      const totalAmount = (Number(selectedProduct?.selling_price) || 0) + applicationFee;
      const res = await axios.post(`${url}/api/vouchers/validate`, {
        code: code,
        total_amount: totalAmount,
      });

      if (res.data.valid) {
        setVoucherData(res.data.data);
        setVoucherDiscount(res.data.data.discount);
        toast.success("Voucher berhasil diterapkan!");
      } else {
        setVoucherData(null);
        setVoucherDiscount(0);
        toast.error(res.data.message);
      }
    } catch (error) {
      setVoucherData(null);
      setVoucherDiscount(0);
      toast.error(error.response?.data?.message || "Kode voucher tidak valid");
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    // setVoucherCode("");
    setVoucherData(null);
    setVoucherDiscount(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormComplete()) {
      toast.error("Lengkapi semua data terlebih dahulu");
      return;
    }

    setLoadingOrder(true);

    try {
      const customerNo = formatCustomerNo();
      const data = {
        id: selectedProduct.id,
        buyer_sku_code: selectedProduct.buyer_sku_code,
        product_name: selectedProduct.product_name,
        selling_price: selectedProduct.selling_price,
        purchase_price: selectedProduct.price,
        product_type: selectedProduct.product_type || "game",
        user_id: user?.id,
        is_admin: true,
        gross_amount: calculateTotalPayment(),
        fee: 0,
        application_fee: applicationFee,
        voucher_code: voucherCode.trim() || null,
        voucher_discount: voucherDiscount,
        payment_method_id: null,
        payment_method_name: "cash",
        payment_type: "cash",
        customer_no: customerNo,
        customer_name: customerName,
        customer_note: customerNote,
        customer_no_format: service?.customer_no_format,
        category_id: service?.category?.id,
        category_name: service?.category?.name,
      };

      await axios.post(`${url}/api/create-transaction`, data);
      toast.success("Topup berhasil!");
      setTimeout(() => router.push("/admin/topup"), 1500);
    } catch (error) {
      toast.error("Gagal melakukan topup");
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleAccountChange = (fieldKey, value) => {
    setAccountData((prev) => ({ ...prev, [fieldKey]: value }));
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );

  if (!service)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Service tidak ditemukan</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="container mx-auto px-4 max-w-7xl py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Topup: {service.name}</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Akun</h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {service.field1_label || "ID Pelanggan"} *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={service.field1_placeholder || "Masukkan data"}
                    value={accountData.field1 || ""}
                    onChange={(e) => handleAccountChange("field1", e.target.value)}
                  />
                  {service.example_format && (
                    <p className="text-xs text-gray-500 mt-1">Contoh: {service.example_format}</p>
                  )}
                </div>

                {service.customer_no_format === "dua_input" && service.field2_label && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {service.field2_label} *
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={service.field2_placeholder || "Masukkan data"}
                      value={accountData.field2 || ""}
                      onChange={(e) => handleAccountChange("field2", e.target.value)}
                    />
                  </div>
                )}

                {isAccountComplete() && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 text-sm font-medium">Data siap:</p>
                    <p className="font-mono text-sm text-gray-900 break-all">{formatCustomerNo()}</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Pelanggan</h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Pelanggan *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan nama pelanggan"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catatan (opsional)</label>
                  <textarea
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tambahkan catatan jika perlu"
                    rows="3"
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Pilih Nominal</h2>

                <div className="grid grid-cols-2 gap-3 mb-6 max-h-96 overflow-y-auto">
                  {products.map((product) => {
                    const isActive = product.buyer_product_status && product.seller_product_status;
                    const isSelected = selectedProduct?.id === product.id;
                    if (!isActive) return null;
                    return (
                      <div
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <div className="font-medium text-gray-900 mb-1">{product.product_name}</div>
                        <div className="text-lg font-bold text-green-600">
                          <FormatRupiah value={product.selling_price} />
                        </div>
                      </div>
                    );
                  })}
                  {products.length === 0 && (
                    <p className="text-gray-500 text-center py-4 col-span-2">Tidak ada produk</p>
                  )}
                </div>

                {selectedProduct && (
                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500">Harga</span>
                      <span className="font-semibold text-gray-900">
                        <FormatRupiah value={selectedProduct.selling_price} />
                      </span>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">Kode Voucher</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={voucherCode}
                          onChange={(e) => {
                                      const val = e.target.value;
                                      setVoucherCode(val);

                                      if (voucherData && val !== voucherCode) {
                                        handleRemoveVoucher();
                                      }
                                    }}
                          placeholder="Masukkan kode"
                          className="flex-1 px-3 py-2 rounded-lg text-sm border border-gray-300 text-gray-900 outline-none focus:border-blue-500 uppercase"
                          disabled={voucherLoading}
                        />
                        {voucherData ? (
                          <button
                            type="button"
                            onClick={handleRemoveVoucher}
                            className="px-3 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 transition"
                          >
                            X
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleApplyVoucher}
                            disabled={voucherLoading || !voucherCode.trim()}
                            className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                          >
                            {voucherLoading ? "..." : "Pakai"}
                          </button>
                        )}
                      </div>
                    </div>

                    {voucherDiscount > 0 && (
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-green-600">Diskon Voucher</span>
                        <span className="font-semibold text-green-600">
                          -<FormatRupiah value={voucherDiscount} />
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-lg font-bold mt-3 pt-3 border-t border-gray-200">
                      <span className="text-gray-900">Total</span>
                      <span className="text-green-600">
                        <FormatRupiah value={calculateTotalPayment()} />
                      </span>
                    </div>
                  </div>
                )}

                <label className="flex items-start gap-2 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">
                    Saya menyetujui{" "}
                    <Link href="/term-condition" className="text-blue-600 hover:underline">
                      syarat dan ketentuan
                    </Link>{" "}
                    yang berlaku
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={!isFormComplete() || loadingOrder}
                  className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
                    isFormComplete() && !loadingOrder
                      ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {loadingOrder ? "Memproses..." : "Proses Topup Admin"}
                </button>

                <p className="text-xs text-gray-500 text-center mt-3">* Pembayaran CASH langsung</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
