"use client";

import api from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

export default function AdminFaq() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ question: "", answer: "", order: 0 });

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      const res = await api.get("/api/admin/faq");
      setFaqs(res.data.data || []);
    } catch (error) {
      toast.error("Gagal mengambil data FAQ");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ question: "", answer: "", order: 0 });
    setShowModal(true);
  };

  const openEdit = (faq) => {
    setEditingId(faq.id);
    setForm({ question: faq.question, answer: faq.answer, order: faq.order });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.question || !form.answer) {
      toast.error("Pertanyaan dan jawaban wajib diisi");
      return;
    }

    try {
      if (editingId) {
        await api.put(`/api/admin/faq/${editingId}`, form);
        toast.success("FAQ berhasil diupdate");
      } else {
        await api.post("/api/admin/faq", form);
        toast.success("FAQ berhasil ditambahkan");
      }
      setShowModal(false);
      fetchFaqs();
    } catch (error) {
      toast.error("Gagal menyimpan FAQ");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus FAQ ini?")) return;

    try {
      await api.delete(`/api/admin/faq/${id}`);
      toast.success("FAQ berhasil dihapus");
      fetchFaqs();
    } catch (error) {
      toast.error("Gagal menghapus FAQ");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">FAQ</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} /> Tambah FAQ
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400">Memuat data...</div>
      ) : faqs.length === 0 ? (
        <div className="text-gray-400">Belum ada FAQ</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="text-left py-3 px-4">No</th>
                <th className="text-left py-3 px-4">Pertanyaan</th>
                <th className="text-left py-3 px-4">Jawaban</th>
                <th className="text-center py-3 px-4">Urutan</th>
                <th className="text-center py-3 px-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {faqs.map((faq, i) => (
                <tr key={faq.id} className="border-b border-gray-100 text-gray-900">
                  <td className="py-3 px-4">{i + 1}</td>
                  <td className="py-3 px-4 max-w-xs truncate">{faq.question}</td>
                  <td className="py-3 px-4 max-w-sm truncate text-gray-600">{faq.answer}</td>
                  <td className="py-3 px-4 text-center">{faq.order}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(faq)}
                        className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(faq.id)}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? "Edit FAQ" : "Tambah FAQ"}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pertanyaan</label>
                <input
                  type="text"
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Masukkan pertanyaan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jawaban</label>
                <textarea
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  rows={5}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
                  placeholder="Masukkan jawaban"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urutan</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
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
