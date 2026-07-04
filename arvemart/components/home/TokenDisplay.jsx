"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "react-toastify";

export default function TokenDisplay({ serialNumber }) {
  const [copied, setCopied] = useState(false);

  if (!serialNumber) return null;

  // PLN token format: "12345 67890 12345 67890/450 KWH"
  const isPlnToken = serialNumber.includes("/") && serialNumber.includes("KWH");
  const token = isPlnToken ? serialNumber.split("/")[0]?.trim() : serialNumber;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Token berhasil disalin");
    } catch {
      toast.error("Gagal menyalin token");
    }
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg">
      <div className="text-gray-400 text-sm mb-2">
        {isPlnToken ? "Token Listrik" : "Serial Number"}
      </div>
      <div className="font-mono text-lg break-all bg-black p-3 rounded mb-3">
        {token}
      </div>
      <button
        onClick={handleCopy}
        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm flex items-center transition-colors"
      >
        <Copy className="w-4 h-4 mr-2" />
        {copied ? "Tersalin ✓" : "Salin Token"}
      </button>
    </div>
  );
}
