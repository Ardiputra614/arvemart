"use client";

import api from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2, X, Check, Ticket } from "lucide-react";

export default function AdminVouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: 0,
    min_purchase: 0,
    max_uses: 0,
    valid_from: "",
    valid_until: "",
    is_active: true,
  });

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      const res = await api.get("/api/admin/vouchers");
      setVouchers(res.data.data || []);
    } catch (error) {
      toast.error("Gagal mengambil data voucher");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      code: "",
      discount_type: "percentage",
      discount_value: 0,
      min_purchase: 0,
      max_uses: 0,
      valid_from: "",
      valid_until: "",
      is_active: true,
    });
    setShowModal(true);
  };

  const openEdit = (v) => {
    setEditingId(v.id);
    setForm({
      code: v.code,
      discount_type: v.discount_type,
      discount_value: v.discount_value,
      min_purchase: v.min_purchase,
      max_uses: v.max_uses,
      valid_from: v.valid_from ? v.valid_from.split("T")[0] : "",
      valid_until: v.valid_until ? v.valid_until.split("T")[0] : "",
      is_active: v.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.discount_value || form.discount_value <= 0) {
      toast.error("Kode dan nilai diskon wajib diisi");
      return;
    }

    try {
      if (editingId) {
        await api.put(`/api/admin/vouchers/${editingId}`, form);
        toast.success("Voucher berhasil diupdate");
      } else {
        await api.post("/api/admin/vouchers", form);
        toast.success("Voucher berhasil ditambahkan");
      }
      setShowModal(false);
      fetchVouchers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal menyimpan voucher");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus voucher ini?")) return;

    try {
      await api.delete(`/api/admin/vouchers/${id}`);
      toast.success("Voucher berhasil dihapus");
      fetchVouchers();
    } catch (error) {
      toast.error("Gagal menghapus voucher");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  const isExpired = (v) => {
    if (!v.valid_until) return false;
    return new Date(v.valid_until) < new Date();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Voucher</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} /> Tambah Voucher
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400">Memuat data...</div>
      ) : vouchers.length === 0 ? (
        <div className="text-gray-400">Belum ada voucher</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="text-left py-3 px-4">Kode</th>
                <th className="text-left py-3 px-4">Diskon</th>
                <th className="text-left py-3 px-4">Min Belanja</th>
                <th className="text-center py-3 px-4">Pemakaian</th>
                <th className="text-left py-3 px-4">Berlaku</th>
                <th className="text-center py-3 px-4">Status</th>
                <th className="text-center py-3 px-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id} className="border-b border-gray-100 text-gray-900">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Ticket size={16} className="text-blue-500" />
                      <span className="font-mono font-semibold">{v.code}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {v.discount_type === "percentage"
                      ? `${v.discount_value}%`
                      : `Rp${v.discount_value.toLocaleString()}`}
                  </td>
                  <td className="py-3 px-4">
                    {v.min_purchase > 0 ? `Rp${v.min_purchase.toLocaleString()}` : "-"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {v.used_count}/{v.max_uses > 0 ? v.max_uses : "∞"}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <div>{formatDate(v.valid_from)}</div>
                    <div className="text-gray-400">→ {formatDate(v.valid_until)}</div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {isExpired(v) ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        Kedaluwarsa
                      </span>
                    ) : v.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        Aktif
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(v)}
                        className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? "Edit Voucher" : "Tambah Voucher"}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kode Voucher *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                  placeholder="CONTOH100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Diskon *</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="flat">Nominal (Rp)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Diskon *</label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder={form.discount_type === "percentage" ? "10" : "5000"}
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min. Belanja</label>
                  <input
                    type="number"
                    value={form.min_purchase}
                    onChange={(e) => setForm({ ...form, min_purchase: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maks. Pemakaian</label>
                  <input
                    type="number"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="0 = tidak terbatas"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Berlaku Dari *</label>
                  <input
                    type="date"
                    value={form.valid_from}
                    onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Berlaku Sampai *</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">Aktif</label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Check size={18} /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
