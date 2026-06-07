"use client";

import React, { useState, useEffect } from "react";

import axios from "axios";
import { useParams } from "next/navigation";
import Image from "next/image";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import FormatRupiah from "@/components/home/FormatRupiah";
import { useUser } from "@/hooks/useUser";

// =============================================
// KOMPONEN: PLN Inquiry Result Card
// =============================================
const PLNResultCard = ({ data, onReset }) => (
  <div className="rounded-xl p-4 border border-green-500/40 bg-green-500/10 mt-3">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shrink-0">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div>
          <p className="text-green-400 text-xs font-semibold uppercase tracking-wide mb-1">
            Data Pelanggan Ditemukan
          </p>
          <p className="text-white font-bold text-lg">{data.name}</p>
          <div className="mt-1 space-y-0.5">
            <p className="text-gray-300 text-sm">
              No. Pelanggan:{" "}
              <span className="font-mono text-gray-100">
                {data.customer_no}
              </span>
            </p>
            <p className="text-gray-300 text-sm">
              No. Meter:{" "}
              <span className="font-mono text-gray-100">{data.meter_no}</span>
            </p>
            <p className="text-gray-300 text-sm">
              Daya:{" "}
              <span className="text-yellow-400 font-semibold">
                {data.segment_power}
              </span>
            </p>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="text-gray-400 hover:text-white transition text-xs mt-1 shrink-0 ml-2"
      >
        Ubah
      </button>
    </div>
  </div>
);

// =============================================
// KOMPONEN: PLN Inquiry Error Card
// =============================================
const PLNErrorCard = ({ message }) => (
  <div className="rounded-xl p-4 border border-red-500/40 bg-red-500/10 mt-3">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center shrink-0">
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <div>
        <p className="text-red-400 text-xs font-semibold uppercase tracking-wide">
          Tidak Ditemukan
        </p>
        <p className="text-gray-300 text-sm mt-0.5">{message}</p>
      </div>
    </div>
  </div>
);

// =============================================
// MAIN COMPONENT
// =============================================
const GamesTopup = () => {
  const url = process.env.NEXT_PUBLIC_GOLANG_URL;
  const params = useParams();
  const slug = params.slug;
  const router = useRouter();

  const COLORS = {
    primary: "#1F2937",
    secondary: "#374151",
    accent: "#4B5563",
    surface: "#111827",
    light: "#F9FAFB",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
    purple: "#8B5CF6",
    pink: "#EC4899",
  };

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [service, setService] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);

  // Form States
  const [accountData, setAccountData] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [waPembeli, setWaPembeli] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [loadingOrder, setLoadingOrder] = useState(false);

  // PLN Inquiry State
  const [plnData, setPlnData] = useState(null);
  const [plnError, setPlnError] = useState(null);
  const [plnLoading, setPlnLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, serviceRes, paymentRes] = await Promise.all([
          axios.get(`${url}/api/products/${slug}`),
          axios.get(`${url}/api/service/${slug}`),
          axios.get(`${url}/api/payment-method`),
        ]);
        setProducts(productsRes.data.data || []);
        setService(serviceRes.data.data || null);
        setPaymentMethods(paymentRes.data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchData();
  }, [slug, url]);

  const isPlnProduct = service?.category?.name?.toLowerCase() === "pln";

  const formatCustomerNo = () => {
    if (!service) return "";
    if (service.customer_no_format === "satu_input")
      return accountData.field1 || "";
    if (service.customer_no_format === "dua_input") {
      const f1 = accountData.field1 || "";
      const f2 = accountData.field2 || "";
      return f1 && f2 ? `${f1}${f2}` : f1 || f2 || "";
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

  const handleAccountChange = (fieldKey, value) => {
    const cleaned = value.replace(/\s+/g, "");
    setAccountData((prev) => ({ ...prev, [fieldKey]: cleaned }));

    if (isPlnProduct) {
      setPlnData(null);
      setPlnError(null);
    }
  };

  // =============================================
  // PLN INQUIRY
  // =============================================
  const handlePLNInquiry = async () => {
    const customerNo = accountData.field1?.trim();
    if (!customerNo) return;

    setPlnLoading(true);
    setPlnData(null);
    setPlnError(null);

    try {
      const response = await axios.post(`${url}/api/inquiry-pln`, {
        customer_no: customerNo,
      });

      if (response.data.success) {
        setPlnData(response.data);
        toast.success(`Pelanggan ditemukan: ${response.data.name}`);
      } else {
        setPlnError(response.data.message || "Nomor tidak ditemukan");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal menghubungi server";
      setPlnError(msg);
      toast.error(msg);
    } finally {
      setPlnLoading(false);
    }
  };

  const resetPLN = () => {
    setPlnData(null);
    setPlnError(null);
    setAccountData({});
  };

  // Form validation
  const isFormComplete = () => {
    const accountOk = isAccountComplete();
    const plnOk = isPlnProduct ? !!plnData : true;
    const nameOk = isPlnProduct ? !!plnData?.name : customerName.trim() !== "";
    const paymentOk = !!selectedProduct && !!paymentMethod;
    const waOk = waPembeli.trim() !== "";

    return accountOk && plnOk && nameOk && paymentOk && waOk;
  };

  const groupedPaymentMethods = paymentMethods.reduce((acc, method) => {
    const type = method.type || "Lainnya";
    if (!acc[type]) acc[type] = [];
    acc[type].push(method);
    return acc;
  }, {});

  const [openAccordion, setOpenAccordion] = useState(null);

  const toggleAccordion = (type) => {
    setOpenAccordion(openAccordion === type ? null : type);
  };

  const formatType = (type) => {
    switch (type.toLowerCase()) {
      case "bank_transfer":
        return "Virtual Account";
      case "cc":
        return "Credit Card";
      case "ewallet":
        return "E-Wallet";
      case "cstore":
        return "Retail Outlet";
      case "qris":
        return "QRIS";
      default:
        return type;
    }
  };

  // =============================================
  // RENDER INPUT AKUN
  // =============================================
  const renderAccountInputs = () => {
    if (!service) return null;

    return (
      <div className="space-y-4">
        {/* Field 1 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            {service.field1_label || "ID Pelanggan"} *
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                className="w-full px-4 py-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 transition bg-gray-800 text-gray-100 border-gray-700 focus:border-blue-500 focus:ring-blue-500/30"
                placeholder={service.field1_placeholder || "Masukkan data"}
                value={accountData.field1 || ""}
                onChange={(e) => handleAccountChange("field1", e.target.value)}
                disabled={isPlnProduct && !!plnData}
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            </div>

            {isPlnProduct && !plnData && (
              <button
                type="button"
                onClick={handlePLNInquiry}
                disabled={!accountData.field1?.trim() || plnLoading}
                className="px-4 py-3 rounded-lg font-semibold text-sm transition-all shrink-0 disabled:opacity-50"
                style={{
                  background: accountData.field1?.trim()
                    ? `linear-gradient(135deg, ${COLORS.info}, ${COLORS.purple})`
                    : COLORS.secondary,
                  color: "white",
                  minWidth: "80px",
                }}
              >
                {plnLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Cek</span>
                  </div>
                ) : (
                  "Cek PLN"
                )}
              </button>
            )}
          </div>

          {service.example_format && (
            <p className="text-xs text-gray-400">
              Contoh: {service.example_format}
            </p>
          )}
        </div>

        {/* Hasil Inquiry PLN */}
        {isPlnProduct && plnData && (
          <PLNResultCard data={plnData} onReset={resetPLN} />
        )}
        {isPlnProduct && plnError && !plnData && (
          <PLNErrorCard message={plnError} />
        )}

        {/* Field 2 */}
        {!isPlnProduct &&
          service.customer_no_format === "dua_input" &&
          service.field2_label && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-200">
                {service.field2_label} *
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-4 py-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 transition bg-gray-800 text-gray-100 border-gray-700 focus:border-blue-500 focus:ring-blue-500/30"
                  placeholder={service.field2_placeholder || "Masukkan data"}
                  value={accountData.field2 || ""}
                  onChange={(e) =>
                    handleAccountChange("field2", e.target.value)
                  }
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

        {/* Preview Data */}
        {!isPlnProduct && isAccountComplete() && (
          <div className="rounded-xl p-4 border border-green-500/40 bg-green-500/10">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mr-3">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-100">Data sudah terisi</p>
                <p className="text-gray-300 text-sm font-mono break-all">
                  {formatCustomerNo()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // =============================================
  // PRODUCT CARD
  // =============================================
  const ProductCard = ({ product, selectedProduct, onSelect, color }) => {
    const isSelected = selectedProduct?.id === product.id;
    const isActive =
      product.buyer_product_status && product.seller_product_status;

    if (!isActive) {
      return (
        <div
          className="relative border-2 rounded-xl p-4 cursor-not-allowed opacity-60"
          style={{
            backgroundColor: COLORS.secondary + "80",
            borderColor: COLORS.error + "40",
          }}
        >
          <div className="absolute top-2 right-2">
            <div
              className="text-xs px-2 py-1 rounded-full font-medium"
              style={{
                backgroundColor: COLORS.error + "30",
                color: COLORS.error,
              }}
            >
              TIDAK AKTIF
            </div>
          </div>
          <div className="font-bold text-gray-400 mb-2 line-clamp-2">
            {product.product_name}
          </div>
          <div className="text-lg font-bold text-gray-500">
            <FormatRupiah value={product.selling_price} />
          </div>
        </div>
      );
    }

    return (
      <div
        className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:transform hover:-translate-y-1 ${
          isSelected
            ? "shadow-lg scale-105"
            : "border-gray-700 hover:border-gray-500"
        }`}
        onClick={() => onSelect(product)}
        style={{
          backgroundColor: isSelected ? `${color}20` : COLORS.secondary,
          borderColor: isSelected ? color : "transparent",
        }}
      >
        {isSelected && (
          <div
            className="absolute -top-2 -right-2 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md"
            style={{ backgroundColor: color }}
          >
            ✓
          </div>
        )}
        <div className="font-bold text-gray-100 mb-2 line-clamp-2">
          {product.product_name}
        </div>
        <div className="text-lg font-bold text-white">
          <FormatRupiah value={product.selling_price} />
        </div>
      </div>
    );
  };

  const renderProducts = () => {
    if (loading)
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-gray-400 mt-4">Memuat produk...</p>
        </div>
      );

    if (error)
      return (
        <div className="text-center py-12 text-red-400">
          <p>Error: {error}</p>
        </div>
      );

    if (!products || products.length === 0)
      return (
        <div className="text-center py-12 text-gray-400">
          <p>Tidak ada produk tersedia</p>
        </div>
      );

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            selectedProduct={selectedProduct}
            onSelect={setSelectedProduct}
            color={COLORS.accent}
          />
        ))}
      </div>
    );
  };

  const calculateTotalFee = () => {
    if (!paymentMethod || !selectedProduct) return 0;
    const price = Number(selectedProduct.selling_price) || 0;
    let fee = 0;
    if (paymentMethod.percentase_fee > 0)
      fee += (price * paymentMethod.percentase_fee) / 100;
    fee += Number(paymentMethod.nominal_fee) || 0;
    return fee;
  };

  const calculateTotalPayment = () => {
    const price = Number(selectedProduct?.selling_price) || 0;
    return price + calculateTotalFee();
  };

  const { user } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormComplete()) {
      toast.error("Mohon lengkapi semua data terlebih dahulu.");
      return;
    }

    if (isPlnProduct && !plnData) {
      toast.error("Mohon cek nomor PLN terlebih dahulu.");
      return;
    }

    const customerNo = formatCustomerNo();
    const categoryId = service?.category?.id;
    const categoryName = service?.category?.name;

    // Data untuk dikirim ke backend
    const data = {
      // Basic Info
      id: selectedProduct.id,
      buyer_sku_code: selectedProduct.buyer_sku_code,
      product_name: selectedProduct.product_name,
      selling_price: selectedProduct.selling_price,
      purchase_price: selectedProduct.price,
      product_type: selectedProduct.product_type || "game",
      user_id: user?.id || user?.user_id || null,
      is_admin: false,

      // Payment
      gross_amount: calculateTotalPayment(),
      fee: Number(paymentMethod.nominal_fee),
      payment_method_id: paymentMethod.id,
      payment_method_name: paymentMethod.name,
      payment_type: paymentMethod.type,

      // Customer
      customer_no: customerNo,
      wa_pembeli: waPembeli,
      customer_name: isPlnProduct ? plnData?.name || "" : customerName,
      customer_note: customerNote,
      customer_no_format: service?.customer_no_format,

      // Category
      category_id: categoryId,
      category_name: categoryName,

      // Admin (default false untuk user)
      is_admin: false,
    };

    console.log(data);

    setLoadingOrder(true);
    try {
      const response = await axios.post(`${url}/api/create-transaction`, data);
      toast.success("Berhasil membuat transaksi");
    //   router.push(`/history/${response.data.data.order_id}`);
    router.push(response.data.payment_url);
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal membuat transaksi");
    } finally {
      setLoadingOrder(false);
    }
  };

  if (loading && products.length === 0 && !service) {
    return (
      <div className="min-h-screen bg-[#37353E] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-[#37353E] flex items-center justify-center">
        <div className="text-white">Service tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#37353E]">
      <div className="container mx-auto px-4 max-w-7xl py-6">
        {/* Header */}
        <div
          className="rounded-2xl shadow-xl overflow-hidden mb-6"
          style={{ backgroundColor: COLORS.primary }}
        >
          <div
            className="p-6 md:p-8"
            style={{
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary}, ${COLORS.accent})`,
            }}
          >
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="relative bg-white">
                <Image
                  src={service.logo}
                  alt={`${service.name} Logo`}
                  className="w-24 h-24 md:w-28 md:h-28 rounded-xl shadow-2xl object-cover border-4 border-white/20"
                  width={120}
                  height={120}
                />
                <div
                  className="absolute -bottom-2 -right-2 text-white text-xs font-bold px-3 py-1 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${COLORS.warning}, ${COLORS.accent})`,
                  }}
                >
                  {isPlnProduct ? "PLN" : "TOP UP"}
                </div>
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {service.name}
                </h1>
                <p className="text-gray-300 text-lg">
                  {service.description ||
                    (isPlnProduct
                      ? "Bayar tagihan listrik"
                      : "Top up cepat & aman")}
                </p>
                {service.notes && (
                  <p className="text-sm text-gray-400 mt-2">{service.notes}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="lg:flex lg:space-x-6">
            {/* Left Column */}
            <div className="lg:w-8/12 space-y-6">
              {/* Step 1: Data Akun */}
              <div
                className="rounded-2xl shadow-lg p-6"
                style={{ backgroundColor: COLORS.primary }}
              >
                <div className="flex items-center mb-6">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mr-4"
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.info}, ${COLORS.secondary})`,
                    }}
                  >
                    <span className="text-white font-bold">1</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-100">
                    Data {isPlnProduct ? "PLN" : "Akun"}
                  </h2>
                </div>
                {renderAccountInputs()}
              </div>

              {/* Step 2: Pilih Nominal */}
              <div
                className="rounded-2xl shadow-lg p-6"
                style={{ backgroundColor: COLORS.primary }}
              >
                <div className="flex items-center mb-6">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mr-4"
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.secondary})`,
                    }}
                  >
                    <span className="text-white font-bold">2</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-100">
                    Pilih Nominal
                  </h2>
                  <div className="ml-auto text-sm text-gray-400">
                    {products.length} produk
                  </div>
                </div>
                {renderProducts()}
              </div>

              {/* Step 3: Metode Pembayaran - Menggunakan Accordion seperti kode kedua */}
              <div
                className="rounded-2xl shadow-lg p-6"
                style={{ backgroundColor: COLORS.primary }}
              >
                <div className="flex items-center mb-6">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mr-4"
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.pink}, ${COLORS.secondary})`,
                    }}
                  >
                    <span className="text-white font-bold">3</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-100">
                    Metode Pembayaran
                  </h2>
                </div>
                <div className="space-y-3">
                  {Object.entries(groupedPaymentMethods).map(
                    ([type, methods]) => (
                      <div
                        key={type}
                        className="border rounded-xl overflow-hidden"
                        style={{ borderColor: COLORS.accent }}
                      >
                        {/* HEADER */}
                        <button
                          type="button"
                          onClick={() => toggleAccordion(type)}
                          className="w-full flex justify-between items-center p-4 text-left"
                          style={{ backgroundColor: COLORS.secondary }}
                        >
                          <span className="font-bold text-white">
                            {formatType(type)}
                          </span>
                          <span className="text-white">
                            {openAccordion === type ? "−" : "+"}
                          </span>
                        </button>

                        {/* CONTENT */}
                        {openAccordion === type && (
                          <div className="p-4 grid sm:grid-cols-1 lg:grid-cols-2 gap-3">
                            {methods.map((method) => (
                              <div
                                key={method.id}
                                className={`border-2 rounded-xl p-4 flex items-center cursor-pointer transition-all ${
                                  paymentMethod?.id === method.id
                                    ? "shadow-lg scale-105"
                                    : ""
                                }`}
                                onClick={() => setPaymentMethod(method)}
                                style={{
                                  backgroundColor:
                                    paymentMethod?.id === method.id
                                      ? COLORS.secondary
                                      : COLORS.primary,
                                  borderColor:
                                    paymentMethod?.id === method.id
                                      ? COLORS.success
                                      : COLORS.accent,
                                }}
                              >
                                {method.logo && (
                                  <Image
                                    src={method.logo}
                                    alt={method.name}
                                    width={32}
                                    height={32}
                                    className="object-contain mr-3"
                                  />
                                )}

                                <div className="flex-grow">
                                  <div className="font-semibold text-gray-100">
                                    {method.name}
                                  </div>
                                  {method.percentase_fee > 0 ||
                                  method.nominal_fee > 0 ? (
                                    <div className="text-xs text-gray-400 mt-1">
                                      {method.percentase_fee > 0 &&
                                        `Fee ${method.percentase_fee}% `}
                                      {method.nominal_fee > 0 &&
                                        `+ Rp${method.nominal_fee.toLocaleString()}`}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-green-400 mt-1">
                                      Tanpa biaya
                                    </div>
                                  )}
                                </div>

                                {paymentMethod?.id === method.id && (
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: COLORS.success }}
                                  >
                                    ✓
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Step 4: Data Pembeli */}
              <div
                className="rounded-2xl shadow-lg p-6"
                style={{ backgroundColor: COLORS.primary }}
              >
                <div className="flex items-center mb-6">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mr-4"
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.warning}, ${COLORS.secondary})`,
                    }}
                  >
                    <span className="text-white font-bold">4</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-100">
                    Data Pembeli
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Nama Pelanggan */}
                  {!isPlnProduct && (
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Nama Pelanggan <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                        placeholder="Masukkan nama lengkap pelanggan"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Nomor WhatsApp */}
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Nomor WhatsApp <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <span className="text-gray-400">+62</span>
                      </div>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 pl-16 border rounded-lg focus:outline-none focus:ring-2 transition bg-gray-800 text-gray-100 border-gray-700 focus:border-green-500 focus:ring-green-500/30"
                        placeholder="81234567890"
                        value={waPembeli}
                        onChange={(e) => setWaPembeli(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Untuk notifikasi status transaksi
                    </p>
                  </div>

                  {/* Info Tambahan untuk PLN */}
                  {isPlnProduct && plnData && (
                    <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-blue-400 text-sm font-medium mb-1">
                        Data Pelanggan PLN
                      </p>
                      <p className="text-white">{plnData.name}</p>
                      <p className="text-gray-400 text-xs mt-2">
                        Nama akan otomatis terisi
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Konfirmasi */}
            <div className="lg:w-4/12">
              <div
                className="rounded-2xl shadow-lg overflow-hidden sticky top-6"
                style={{ backgroundColor: COLORS.primary }}
              >
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-100 mb-4">
                    Konfirmasi Pembayaran
                  </h3>

                  {selectedProduct ? (
                    <>
                      <div
                        className="border rounded-lg overflow-hidden"
                        style={{ borderColor: COLORS.secondary }}
                      >
                        <div
                          className="p-4 border-b"
                          style={{ backgroundColor: COLORS.secondary }}
                        >
                          <h4 className="font-bold text-gray-100">
                            {selectedProduct.product_name}
                          </h4>
                        </div>
                        <div className="p-4 space-y-3">
                          {/* Info PLN */}
                          {isPlnProduct && plnData && (
                            <div
                              className="pb-3 border-b"
                              style={{ borderColor: COLORS.secondary }}
                            >
                              <p className="text-xs text-gray-400 mb-1">
                                Pelanggan PLN
                              </p>
                              <p className="text-sm font-semibold text-green-400">
                                {plnData.name}
                              </p>
                              <p className="text-xs font-mono text-gray-300">
                                {plnData.customer_no}
                              </p>
                            </div>
                          )}

                          {/* Info Akun */}
                          {!isPlnProduct && isAccountComplete() && (
                            <div
                              className="pb-3 border-b"
                              style={{ borderColor: COLORS.secondary }}
                            >
                              <p className="text-xs text-gray-400 mb-1">
                                Data Akun
                              </p>
                              <p className="text-sm font-mono font-semibold break-all text-gray-200">
                                {formatCustomerNo()}
                              </p>
                            </div>
                          )}

                          {/* Nama Customer */}
                          {(customerName || plnData?.name) && (
                            <div
                              className="pb-3 border-b"
                              style={{ borderColor: COLORS.secondary }}
                            >
                              <p className="text-xs text-gray-400 mb-1">
                                Nama Pelanggan
                              </p>
                              <p className="text-sm text-gray-200">
                                {isPlnProduct ? plnData?.name : customerName}
                              </p>
                            </div>
                          )}

                          {/* Metode Pembayaran */}
                          {paymentMethod && (
                            <div
                              className="pb-3 border-b"
                              style={{ borderColor: COLORS.secondary }}
                            >
                              <p className="text-xs text-gray-400 mb-1">
                                Metode Pembayaran
                              </p>
                              <p className="text-sm font-semibold text-gray-200">
                                {paymentMethod.name}
                              </p>
                            </div>
                          )}

                          {/* Harga */}
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400">Harga</span>
                            <span className="font-semibold text-white">
                              <FormatRupiah
                                value={Number(
                                  selectedProduct.selling_price || 0,
                                )}
                              />
                            </span>
                          </div>

                          {paymentMethod && calculateTotalFee() > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-400">
                                Biaya Layanan
                              </span>
                              <span
                                className="font-semibold"
                                style={{ color: COLORS.error }}
                              >
                                <FormatRupiah value={calculateTotalFee()} />
                              </span>
                            </div>
                          )}

                          <div
                            className="flex justify-between items-center pt-3 border-t"
                            style={{ borderColor: COLORS.secondary }}
                          >
                            <span className="text-lg font-bold text-gray-100">
                              Total
                            </span>
                            <div
                              className="text-xl font-bold"
                              style={{ color: COLORS.success }}
                            >
                              <FormatRupiah value={calculateTotalPayment()} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {isPlnProduct && !plnData && (
                        <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                          <p className="text-yellow-400 text-xs text-center">
                            ⚡ Cek nomor PLN terlebih dahulu
                          </p>
                        </div>
                      )}

                      <div className="mt-4">
                        <button
                          type="submit"
                          disabled={!isFormComplete() || loadingOrder}
                          className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
                            isFormComplete() && !loadingOrder
                              ? "text-white hover:scale-[1.02] shadow-lg cursor-pointer"
                              : "bg-gray-700 text-gray-500 cursor-not-allowed"
                          }`}
                          style={
                            isFormComplete() && !loadingOrder
                              ? {
                                  background: `linear-gradient(135deg, ${COLORS.success}, ${COLORS.info})`,
                                }
                              : {}
                          }
                        >
                          {loadingOrder ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Memproses...</span>
                            </div>
                          ) : (
                            "Pesan Sekarang"
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div
                      className="rounded-xl border border-dashed p-6 text-center"
                      style={{ borderColor: COLORS.secondary }}
                    >
                      <p className="text-gray-400">
                        Pilih produk terlebih dahulu
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GamesTopup;
