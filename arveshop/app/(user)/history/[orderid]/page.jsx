"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";

import {
  CheckCircle,
  Copy,
  Download,
  Clock,
  XCircle,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import Head from "next/head";
import { useParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import DescDetail from "@/components/home/DescDetail";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function History() {
  const url = process.env.NEXT_PUBLIC_GOLANG_URL;
  const params = useParams();
  const order_id = params.orderid;
  const qrRef = useRef(null);

  const [finalData, setFinalData] = useState({});
  const [copied, setCopied] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [status, setStatus] = useState("pending");
  const [timeLeft, setTimeLeft] = useState(null);
  const [expiryTime, setExpiryTime] = useState(null);
  const [digiflazzStatus, setDigiflazzStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [isExpiring, setIsExpiring] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const timerRef = useRef(null);
  const pollingRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const prevStatusRef = useRef("pending");
  const prevDigiflazzRef = useRef("pending");
  const isMountedRef = useRef(true);
  const isExpired = status === "failed" || timeLeft === 0;

  const invoiceRef = useRef(null);

  const downloadInvoice = async () => {
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const W = 210;
      const margin = 20;
      const contentW = W - margin * 2;

      // ── HELPERS ──────────────────────────────────────────────
      const formatRupiah = (val) =>
        new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
        }).format(val || 0);

      const formatDate = (val) =>
        val
          ? new Date(val).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-";

      const statusLabel = {
        success: "Pembayaran Berhasil",
        settlement: "Pembayaran Berhasil",
        pending: "Menunggu Pembayaran",
        failed: "Pembayaran Gagal",
        expired: "Kadaluarsa",
      };

      const statusColor = {
        success: [59, 109, 17],
        settlement: [59, 109, 17],
        pending: [133, 79, 11],
        failed: [163, 45, 45],
        expired: [163, 45, 45],
      };

      // ── HEADER GELAP ─────────────────────────────────────────
      pdf.setFillColor(26, 26, 46);
      pdf.rect(0, 0, W, 38, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("ARVESHOP", margin, 16);

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(180, 180, 200);
      pdf.text("Platform Topup & Tagihan", margin, 22);

      pdf.setTextColor(180, 180, 200);
      pdf.setFontSize(8);
      pdf.text("INVOICE", W - margin, 13, { align: "right" });

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(finalData.order_id || "-", W - margin, 21, { align: "right" });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(180, 180, 200);
      pdf.text(formatDate(finalData.created_at), W - margin, 28, {
        align: "right",
      });

      // ── STATUS BAR ───────────────────────────────────────────
      const resolvedStatus =
        finalData.payment_status === "settlement" ? "success" : status;
      const [sr, sg, sb] = statusColor[resolvedStatus] || [100, 100, 100];

      pdf.setFillColor(sr + 160, sg + 130, sb + 100); // warna muda
      pdf.rect(0, 38, W, 10, "F");

      pdf.setTextColor(sr, sg, sb);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `● ${statusLabel[resolvedStatus] || status.toUpperCase()}`,
        margin,
        44.5,
      );

      // ── SECTION HELPER ───────────────────────────────────────
      let y = 58;
      const lineHeight = 7;

      const sectionTitle = (title) => {
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(140, 140, 140);
        pdf.text(title.toUpperCase(), margin, y);
        y += 4;
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.3);
        pdf.line(margin, y, W - margin, y);
        y += 6;
      };

      const fieldRow = (label, value, mono = false) => {
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(130, 130, 130);
        pdf.text(label, margin, y);

        pdf.setFont(mono ? "courier" : "helvetica", "normal");
        pdf.setTextColor(30, 30, 30);
        pdf.text(String(value || "-"), W - margin, y, { align: "right" });
        y += lineHeight;
      };

      // ── DETAIL TRANSAKSI ─────────────────────────────────────
      sectionTitle("Detail Transaksi");
      fieldRow("Order ID", finalData.order_id, true);
      fieldRow("Produk", finalData.product_name);
      fieldRow("Nomor Tujuan", finalData.customer_no, true);
      fieldRow(
        "Metode Pembayaran",
        finalData.payment_method_name?.toUpperCase(),
      );
      if (finalData.duitku_reference) {
        fieldRow("ID Referensi Duitku", finalData.duitku_reference, true);
      }
      y += 4;

      // ── RINCIAN BIAYA ────────────────────────────────────────
      sectionTitle("Rincian Biaya");

      const sellingPrice = parseFloat(finalData.selling_price || 0);
      const grossAmount = parseFloat(finalData.gross_amount || 0);
      const fee = grossAmount - sellingPrice;

      fieldRow("Harga Produk", formatRupiah(sellingPrice));
      if (fee > 0) fieldRow("Biaya Layanan", formatRupiah(fee));

      y += 2;

      // Total box
      pdf.setFillColor(245, 245, 248);
      pdf.roundedRect(margin, y, contentW, 14, 2, 2, "F");

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100);
      pdf.text("Total Pembayaran", margin + 6, y + 9);

      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(26, 26, 46);
      pdf.text(formatRupiah(grossAmount), W - margin - 6, y + 9, {
        align: "right",
      });

      y += 22;

      // ── TOKEN / SERIAL NUMBER ────────────────────────────────
      if (
        finalData.serial_number &&
        (digiflazzStatus === "Sukses" || digiflazzStatus === "success")
      ) {
        sectionTitle("Token / Serial Number");

        pdf.setFillColor(235, 245, 255);
        pdf.roundedRect(margin, y - 2, contentW, 12, 2, 2, "F");

        pdf.setFontSize(11);
        pdf.setFont("courier", "bold");
        pdf.setTextColor(14, 68, 124);

        const token = finalData.serial_number.includes("/")
          ? finalData.serial_number.split("/")[0].trim()
          : finalData.serial_number;

        pdf.text(token, W / 2, y + 6, { align: "center" });
        y += 18;
      }

      // ── CATATAN ──────────────────────────────────────────────
      pdf.setFillColor(250, 250, 250);
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin, y, contentW, 14, 2, 2, "FD");

      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(120, 120, 120);
      pdf.text(
        "Simpan invoice ini sebagai bukti transaksi yang sah.",
        W / 2,
        y + 6,
        { align: "center" },
      );
      pdf.text(
        "Hubungi arveshop.ofc@gmail.com jika ada pertanyaan.",
        W / 2,
        y + 11,
        { align: "center" },
      );
      y += 20;

      // ── FOOTER ───────────────────────────────────────────────
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.3);
      pdf.line(margin, 280, W - margin, 280);

      pdf.setFontSize(8);
      pdf.setTextColor(160, 160, 160);
      pdf.text("arveshop.com", margin, 286);
      pdf.text(
        "Diterbitkan otomatis — tidak memerlukan tanda tangan",
        W - margin,
        286,
        { align: "right" },
      );

      // ── SAVE ─────────────────────────────────────────────────
      pdf.save(`Invoice-${finalData.order_id || "transaksi"}.pdf`);
      toast.success("Invoice berhasil diunduh");
    } catch (err) {
      console.error(err);
      toast.error("Gagal generate invoice");
    }
  };

  const handlePay = () => {
    if (!finalData.duitku_payment_url) {
      toast.error("Link pembayaran tidak tersedia");
      return;
    }

    window.open(finalData.duitku_payment_url, "_blank");
  };

  // ─── Cek apakah sudah terminal ───────────────────────────────────
  const isTerminalState = useCallback((payStatus, digiStatus) => {
    const paymentFailed = [
      "expired",
      "cancel",
      "failure",
      "deny",
      "failed",
    ].includes(payStatus);
    const digiflazzFailed = digiStatus === "Gagal" || digiStatus === "failed";
    return paymentFailed || digiflazzFailed;
  }, []);

  const parseStatus = useCallback((paymentStatus) => {
    if (paymentStatus === "settlement" || paymentStatus === "capture")
      return "success";
    if (paymentStatus === "pending") return "pending";
    if (
      ["expired", "cancel", "failure", "deny", "failed"].includes(paymentStatus)
    )
      return "failed";
    return paymentStatus || "pending";
  }, []);

  const parseDigiflazzStatus = useCallback((digiflazzStatus) => {
    if (!digiflazzStatus) return "pending";
    if (digiflazzStatus === "Sukses" || digiflazzStatus === "success")
      return "success";
    if (digiflazzStatus === "Gagal" || digiflazzStatus === "failed")
      return "failed";
    if (digiflazzStatus === "Pending" || digiflazzStatus === "pending")
      return "pending";
    return "pending";
  }, []);

  // Helper untuk mendapatkan payment URL dari Duitku response
  const getPaymentUrl = useCallback((data) => {
    // Priority: Duitku payment URL
    if (data.duitku_payment_url) return data.duitku_payment_url;
    // Fallback: old Midtrans URL
    if (data.url) return data.url;
    // For QRIS, might be in duitku_qr_string
    if (data.payment_type === "qris" && data.duitku_qr_string)
      return data.duitku_qr_string;
    return null;
  }, []);

  // Helper untuk mendapatkan VA number
  const getVaNumber = useCallback((data) => {
    if (data.duitku_va) return data.duitku_va;
    if (data.url && data.payment_type === "bank_transfer")
      return data.duitku_va;
    return null;
  }, []);

  // Helper untuk mendapatkan expiry time dari Duitku
  const getExpiryTime = useCallback((data) => {
    if (data.duitku_expiry) return new Date(data.duitku_expiry);
    if (data.midtrans_response) {
      let midtransResp = data.midtrans_response;
      if (typeof midtransResp === "string") {
        try {
          midtransResp = JSON.parse(midtransResp);
        } catch (e) {
          console.error("Error parsing midtrans_response:", e);
        }
      }
      if (midtransResp?.expiry_time) return new Date(midtransResp.expiry_time);
    }
    return null;
  }, []);

  const updateFromData = useCallback(
    (data, showToast = false) => {
      if (!data || !isMountedRef.current) return;

      console.log("📦 Update from data:", data);

      const newStatus = parseStatus(data.payment_status);
      const newDigiflazzRaw = data.digiflazz_status || "pending";
      const newDigiflazz = parseDigiflazzStatus(newDigiflazzRaw);

      if (showToast && prevStatusRef.current !== newStatus) {
        if (newStatus === "success") toast.success("✅ Pembayaran berhasil!");
        else if (newStatus === "failed") toast.error("❌ Pembayaran gagal");
      }

      if (showToast && prevDigiflazzRef.current !== newDigiflazz) {
        if (newDigiflazz === "success")
          toast.success("✅ Produk berhasil dikirim!");
        else if (newDigiflazz === "failed")
          toast.error("❌ Pengiriman produk gagal");
      }

      prevStatusRef.current = newStatus;
      prevDigiflazzRef.current = newDigiflazz;

      // Transform data for consistent UI
      const transformedData = {
        ...data,
        // Map Duitku fields to what UI expects
        url: getPaymentUrl(data),
        va_number: getVaNumber(data),
        payment_type: data.payment_type || data.payment_method_type,
      };

      setFinalData((prev) => ({ ...prev, ...transformedData }));

      if (data.payment_status !== undefined) setStatus(newStatus);
      if (data.digiflazz_status !== undefined)
        setDigiflazzStatus(newDigiflazzRaw);

      // Set expiry time from Duitku
      const expiry = getExpiryTime(data);
      if (expiry) setExpiryTime(expiry);
    },
    [
      parseStatus,
      parseDigiflazzStatus,
      getPaymentUrl,
      getVaNumber,
      getExpiryTime,
    ],
  );

  const fetchHistory = useCallback(
    async (showToast = false) => {
      if (!isMountedRef.current) return;
      try {
        const response = await axios.get(`${url}/api/history/${order_id}`, {
          withCredentials: true,
        });
        if (response.data?.data) {
          updateFromData(response.data.data, showToast);
        }
      } catch (error) {
        console.error("Error fetching history:", error);
      }
    },
    [order_id, url, updateFromData],
  );

  // Initial load
  useEffect(() => {
    if (!order_id) return;
    isMountedRef.current = true;
    const init = async () => {
      setLoading(true);
      await fetchHistory(false);
      setLoading(false);
    };
    init();
    return () => {
      isMountedRef.current = false;
    };
  }, [order_id, fetchHistory]);

  // ─── WebSocket (same as before) ───────────────────────────────────
  useEffect(() => {
    if (!order_id || !isMountedRef.current) return;
    if (isTerminalState(status, digiflazzStatus)) return;

    const wsURL = url
      ?.replace("https://", "wss://")
      ?.replace("http://", "ws://");

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    let shouldReconnect = true;

    const connect = () => {
      if (!shouldReconnect || !isMountedRef.current) return;

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      try {
        const wsUrl = `${wsURL}/ws`;
        console.log("🔌 Connecting to WebSocket:", wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMountedRef.current) return;
          console.log("✅ WebSocket connected");
          setIsConnected(true);
          reconnectAttempts = 0;

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }

          ws.send(JSON.stringify({ type: "subscribe", order_id }));
          console.log("📨 Subscribed to order:", order_id);
        };

        ws.onmessage = (event) => {
          if (!isMountedRef.current) return;
          try {
            const payload = JSON.parse(event.data);
            console.log("📨 WebSocket message received:", payload);

            if (payload.type === "order_update" && payload.data) {
              updateFromData(payload.data, true);
            } else if (payload.order_id || payload.payment_status) {
              updateFromData(payload, true);
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        ws.onclose = (event) => {
          if (!isMountedRef.current) return;
          console.log("❌ WebSocket closed:", event.code, event.reason);
          setIsConnected(false);

          if (!shouldReconnect || !isMountedRef.current) return;
          if (isTerminalState(status, digiflazzStatus)) return;

          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttempts),
              30000,
            );
            console.log(
              `🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`,
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current && shouldReconnect) {
                reconnectAttempts++;
                connect();
              }
            }, delay);
          } else {
            console.log(
              "⚠️ Max reconnect attempts reached, using polling only",
            );
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error("Error creating WebSocket:", error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [order_id, url, updateFromData, status, digiflazzStatus, isTerminalState]);

  // ─── Polling fallback ──────────────────────────────────────────────
  useEffect(() => {
    if (!order_id || !isMountedRef.current) return;
    if (isTerminalState(status, digiflazzStatus)) return;

    if (isConnected) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const interval = 7000;

    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      if (isMountedRef.current && !isConnected) {
        await fetchHistory(true);
      }
    }, interval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [
    order_id,
    status,
    digiflazzStatus,
    isConnected,
    fetchHistory,
    isTerminalState,
  ]);

  // ─── Stop all processes saat terminal state ─────────────────────────
  useEffect(() => {
    if (!isTerminalState(status, digiflazzStatus)) return;

    console.log("🛑 Terminal state reached, stopping all processes");

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [status, digiflazzStatus, isTerminalState]);

  // ─── Expire handler ────────────────────────────────────────────────
  const handleExpireTransaction = useCallback(async () => {
    if (isExpiring) return;
    setIsExpiring(true);
    try {
      await axios.post(
        `${url}/transaction/${order_id}/expire`,
        {},
        { withCredentials: true },
      );
      setStatus("failed");
      setTimeLeft(0);
      toast.info("⏰ Waktu pembayaran telah habis");
      await fetchHistory(false);
    } catch (error) {
      console.error("Error expiring transaction:", error);
      setStatus("failed");
      setTimeLeft(0);
      toast.warning("⏰ Waktu habis");
    } finally {
      setIsExpiring(false);
    }
  }, [order_id, url, isExpiring, fetchHistory]);

  const calculateTimeLeft = useCallback(() => {
    if (!expiryTime) return null;
    const diff = expiryTime - new Date();
    return diff <= 0 ? 0 : Math.floor(diff / 1000);
  }, [expiryTime]);

  useEffect(() => {
    if (status !== "pending" || !expiryTime) return;
    const initial = calculateTimeLeft();
    if (initial <= 0) {
      handleExpireTransaction();
      return;
    }
    setTimeLeft(initial);
    timerRef.current = setInterval(async () => {
      const remaining = calculateTimeLeft();
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        await handleExpireTransaction();
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [expiryTime, status, calculateTimeLeft, handleExpireTransaction]);

  // ─── Helpers ───────────────────────────────────────────────────────
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "--:--";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0)
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatRupiah = (amount) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount || 0);

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Berhasil disalin");
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  const handleCopyToken = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
      toast.success("Token berhasil disalin");
    } catch {
      toast.error("Gagal menyalin token");
    }
  };

  const downloadQR = () => {
    try {
      const canvas = qrRef.current?.querySelector("canvas");

      if (!canvas) {
        toast.error("QR tidak ditemukan");
        return;
      }

      const url = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.href = url;
      link.download = `QRIS-${finalData.order_id}.png`;
      link.click();

      toast.success("QR berhasil di-download");
    } catch (err) {
      console.error(err);
      toast.error("Gagal download QR");
    }
  };

  const statusConfig = {
    success: {
      icon: CheckCircle,
      color: "text-green-500",
      label: "Pembayaran Berhasil",
      message: "Pembayaran telah diterima",
    },
    pending: {
      icon: Clock,
      color: "text-yellow-400",
      label: "Menunggu Pembayaran",
      message: "Segera selesaikan pembayaran",
    },
    failed: {
      icon: XCircle,
      color: "text-red-500",
      label: "Pembayaran Gagal / Kedaluwarsa",
      message: "Transaksi tidak berhasil",
    },
  };

  const CurrentIcon = statusConfig[status]?.icon || Clock;

  const TokenDisplay = ({ serialNumber }) => {
    if (!serialNumber) return null;
    const isPlnToken =
      serialNumber.includes("/") && serialNumber.includes("KWH");
    const token = isPlnToken
      ? serialNumber.split("/")[0]?.trim()
      : serialNumber;

    return (
      <div className="bg-gray-900 p-4 rounded-lg">
        <div className="text-gray-400 text-sm mb-2">
          {isPlnToken ? "Token Listrik" : "Serial Number"}
        </div>
        <div className="font-mono text-lg break-all bg-black p-3 rounded mb-3">
          {token}
        </div>
        <button
          onClick={() => handleCopyToken(token)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm flex items-center transition-colors"
        >
          <Copy className="w-4 h-4 mr-2" />
          {copiedToken ? "Tersalin" : "Salin Token"}
        </button>
      </div>
    );
  };

  const formatDigiflazzStatus = (status) => {
    if (status === "Sukses" || status === "success") return "Berhasil";
    if (status === "Gagal" || status === "failed") return "Gagal";
    if (status === "Pending" || status === "pending") return "Menunggu";
    return status || "Menunggu";
  };

  const getDigiflazzStatusColor = (status) => {
    if (status === "Sukses" || status === "success") return "text-green-400";
    if (status === "Gagal" || status === "failed") return "text-red-400";
    return "text-yellow-400";
  };

  // Get display VA number (priority Duitku VA)
  const displayVaNumber =
    finalData.duitku_va || finalData.va_number || finalData.url;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Transaksi {finalData.order_id || order_id}</title>
      </Head>

      {isExpired && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-bold">
            QR EXPIRED
          </div>
        </div>
      )}

      <div className="min-h-screen text-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Status Bar */}
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-400">Order ID: {order_id}</div>
            <div className="flex items-center gap-2">
              {!isTerminalState(status, digiflazzStatus) && (
                <div className="flex items-center bg-gray-800 px-3 py-1 rounded-full">
                  <div className="animate-spin rounded-full h-3 w-3 border border-blue-400 border-t-transparent mr-2" />
                  <span className="text-xs text-blue-400">
                    {isConnected ? "Live Update" : "Polling Mode"}
                  </span>
                </div>
              )}
              <div className="flex items-center bg-gray-800 px-3 py-1 rounded-full">
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-500 mr-2 animate-pulse" />
                    <span className="text-xs text-green-500">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-yellow-500 mr-2" />
                    <span className="text-xs text-yellow-500">Polling</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4">
              <CurrentIcon
                className={`w-10 h-10 ${statusConfig[status]?.color}`}
              />
              <div>
                <h2 className="text-xl font-bold">
                  {statusConfig[status]?.label}
                </h2>
                <p className="text-gray-400">{statusConfig[status]?.message}</p>
              </div>
            </div>

            {status === "pending" && timeLeft !== null && (
              <div className="mt-4 text-yellow-400 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                <span>
                  Sisa waktu: {formatTime(timeLeft)}
                  {expiryTime && (
                    <span className="text-xs text-gray-500 ml-2">
                      (s.d. {expiryTime.toLocaleTimeString("id-ID")})
                    </span>
                  )}
                </span>
              </div>
            )}

            {isExpiring && (
              <div className="mt-2 text-xs text-blue-400 flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border border-blue-400 border-t-transparent mr-2" />
                Mensinkronkan status...
              </div>
            )}
          </div>

          {/* Token / Serial Number */}
          {finalData.serial_number &&
            (digiflazzStatus === "Sukses" || digiflazzStatus === "success") && (
              <div className="bg-gray-800 rounded-xl p-6 mb-6">
                <h3 className="font-semibold mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                  Detail Produk
                </h3>
                <TokenDisplay serialNumber={finalData.serial_number} />
              </div>
            )}

          {/* Pascabayar desc detail */}
          {finalData.digiflazz_response && (
            <DescDetail data={finalData.digiflazz_response} />
          )}

          {/* Virtual Account - UPDATED for Duitku */}
          {finalData.payment_type === "bank_transfer" &&
            status === "pending" &&
            displayVaNumber && (
              <div className="bg-gray-800 rounded-xl p-6 mb-6">
                <h3 className="font-semibold mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Virtual Account {finalData.payment_method_name?.toUpperCase()}
                </h3>
                <div className="flex justify-between items-center bg-gray-900 p-4 rounded-lg">
                  <span className="font-mono text-xl break-all">
                    {displayVaNumber}
                  </span>
                  <button
                    onClick={() => handleCopy(displayVaNumber)}
                    className="text-blue-400 flex items-center hover:text-blue-300 ml-4 shrink-0"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {copied ? "✓ Tersalin" : "Salin"}
                  </button>
                </div>
                <p className="text-gray-400 text-sm mt-3">
                  Transfer ke nomor VA di atas untuk menyelesaikan pembayaran
                </p>
              </div>
            )}

          {/* QRIS - UPDATED for Duitku */}
          {finalData.payment_type === "qris" && status === "pending" && (
            <div className="bg-gray-800 rounded-xl p-6 mb-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <Download className="w-5 h-5 mr-2" />
                QRIS
              </h3>

              <div className="flex flex-col items-center gap-4">
                {finalData.duitku_qr_string && (
                  <>
                    <div
                      ref={qrRef}
                      className={`p-3 rounded-lg shadow-lg transition-all duration-300 ${
                        isExpired
                          ? "bg-gray-300 opacity-50 blur-sm"
                          : "bg-white"
                      }`}
                    >
                      <QRCodeCanvas
                        value={finalData.duitku_qr_string}
                        size={220}
                        level="H"
                        includeMargin={true}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={downloadQR}
                        disabled={isExpired}
                        className={`px-4 py-2 rounded-lg flex items-center ${
                          isExpired
                            ? "bg-gray-500 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download QR
                      </button>

                      <button
                        onClick={() => handleCopy(finalData.duitku_qr_string)}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Salin String
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Redirect URL for other payment methods */}
          {status === "pending" &&
            finalData.payment_type !== "qris" &&
            finalData.payment_type !== "bank_transfer" && (
              <div className="bg-gray-800 rounded-xl p-6 mb-6">
                <h3 className="font-semibold mb-4">Lanjutkan Pembayaran</h3>

                <button
                  onClick={handlePay}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold"
                >
                  Bayar Sekarang
                </button>

                <p className="text-gray-400 text-sm mt-3">
                  Kamu akan diarahkan ke halaman pembayaran
                </p>
              </div>
            )}

          {finalData.payment_type === "cstore" && status === "pending" && (
            <div className="bg-gray-800 rounded-xl p-6 mb-6">
              <h3 className="font-semibold mb-4">
                Kode Pembayaran {finalData.payment_method_name}
              </h3>

              <div className="flex justify-between items-center bg-gray-900 p-4 rounded-lg">
                <span className="font-mono text-xl">
                  {finalData.duitku_va || finalData.duitku_reference}
                </span>

                <button
                  onClick={() =>
                    handleCopy(
                      finalData.duitku_va || finalData.duitku_reference,
                    )
                  }
                  className="text-blue-400"
                >
                  Salin
                </button>
              </div>

              <p className="text-gray-400 text-sm mt-3">
                Datang ke kasir {finalData.payment_method_name}, lalu tunjukkan
                kode di atas
              </p>

              <ul className="text-sm text-gray-400 mt-3 list-disc pl-5">
                <li>Datang ke {finalData.payment_method_name}</li>
                <li>Sebutkan kode pembayaran ke kasir</li>
                <li>Bayar sesuai nominal</li>
              </ul>
            </div>
          )}

          {/* Informasi Transaksi */}
          <div ref={invoiceRef} className="bg-gray-800 rounded-xl p-6">
            <h3 className="font-semibold mb-4 pb-3 border-b border-gray-700">
              Informasi Transaksi
            </h3>
            <div className="space-y-3">
              {[
                { label: "Order ID", value: finalData.order_id, mono: true },
                { label: "Produk", value: finalData.product_name },
                { label: "Nomor Tujuan", value: finalData.customer_no },
                {
                  label: "Metode Pembayaran",
                  value: finalData.payment_method_name?.toUpperCase(),
                },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-2">
                  <span className="text-gray-400">{item.label}</span>
                  <span className={item.mono ? "font-mono" : "font-medium"}>
                    {item.value || "-"}
                  </span>
                </div>
              ))}

              <div className="flex justify-between py-2">
                <span className="text-gray-400">Status Pemesanan</span>
                <span
                  className={`font-semibold ${getDigiflazzStatusColor(digiflazzStatus)}`}
                >
                  {formatDigiflazzStatus(digiflazzStatus)}
                </span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-gray-400">Tanggal Transaksi</span>
                <span className="font-medium">
                  {finalData.created_at &&
                    new Date(finalData.created_at).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                </span>
              </div>

              {expiryTime && status === "pending" && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Batas Pembayaran</span>
                  <span className="font-medium text-yellow-400">
                    {expiryTime.toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-2 font-bold border-t border-gray-700 pt-4 mt-2">
                <span>Total Pembayaran</span>
                <span className="text-lg">
                  {formatRupiah(finalData.gross_amount)}
                </span>
              </div>

              <button
                onClick={downloadInvoice}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold"
              >
                Download Invoice PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
