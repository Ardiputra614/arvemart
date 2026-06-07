"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const initialForm = {
  product_name: "",
  slug: "",
  category: "",
  brand: "",
  type: "",
  product_type: "prepaid",
  seller_name: "",

  price: 0,
  selling_price: 0,
  admin: 0,
  commission: 0,

  buyer_sku_code: "",

  buyer_product_status: true,
  seller_product_status: true,

  unlimited_stock: false,
  multi: false,

  stock: "0",

  start_cut_off: "00:00",
  end_cut_off: "23:59",

  desc: "",

  provider: "digiflazz",

  is_active: true,

  retry_count: 0,
  max_retry: 3,
  retry_interval: 5,
};

export default function ProductPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(false);

  const [openModal, setOpenModal] = useState(false);

  const [editId, setEditId] = useState(null);

  const [meta, setMeta] = useState({});

  const [page, setPage] = useState(1);

  const [form, setForm] = useState(initialForm);

  const [filters, setFilters] = useState({
    search: "",
    category: "",
    product_type: "",
    buyer_product_status: "",
    seller_product_status: "",
  });

  async function getCategories() {
    try {
      const response = await api.get("/api/admin/categories");

      setCategories(response.data.data || []);
    } catch (error) {
      console.log(error);
    }
  }

  async function getProducts() {
    try {
      setLoading(true);

      const response = await api.get("/api/admin/products", {
        params: {
          ...filters,
          page,
          limit: 20,
        },
      });

      setProducts(response.data.data || []);

      setMeta(response.data.meta || {});
    } catch (error) {
      console.log(error);

      toast.error(error?.response?.data?.message || "Failed get products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const delay = setTimeout(() => {
      getProducts();
      getCategories();
    }, 500);

    return () => clearTimeout(delay);
  }, [filters, page]);

  // RESET PAGE SAAT FILTER BERUBAH
  useEffect(() => {
    setPage(1);
  }, [filters]);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      if (editId) {
        await api.put(`/api/admin/products/${editId}`, form);
      } else {
        await api.post("/api/admin/products", form);
      }

      toast.success("Success");

      setOpenModal(false);

      setEditId(null);

      setForm(initialForm);

      getProducts();
    } catch (error) {
      console.log(error);

      toast.error(error?.response?.data?.message || "Failed save product");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete product?")) return;

    try {
      await api.delete(`/api/admin/products/${id}`);

      getProducts();
    } catch (error) {
      console.log(error);
    }
  }

  function handleEdit(item) {
    setEditId(item.id);

    setForm({
      product_name: item.product_name || "",
      slug: item.slug || "",
      category: item.category || "",
      brand: item.brand || "",
      type: item.type || "",
      product_type: item.product_type || "prepaid",
      seller_name: item.seller_name || "",

      price: item.price || 0,
      selling_price: item.selling_price || 0,

      admin: item.admin || 0,
      commission: item.commission || 0,

      buyer_sku_code: item.buyer_sku_code || "",

      buyer_product_status: item.buyer_product_status ?? true,

      seller_product_status: item.seller_product_status ?? true,

      unlimited_stock: item.unlimited_stock ?? false,

      multi: item.multi ?? false,

      stock: item.stock || "0",

      start_cut_off: item.start_cut_off || "00:00",

      end_cut_off: item.end_cut_off || "23:59",

      desc: item.desc || "",

      provider: item.provider || "digiflazz",

      is_active: item.is_active ?? true,

      retry_count: item.retry_count || 0,

      max_retry: item.max_retry || 3,

      retry_interval: item.retry_interval || 5,
    });

    setOpenModal(true);
  }

  async function handleDeleteAllFilter() {
    setFilters({
      search: "",
      category: "",
      product_type: "",
      buyer_product_status: "",
      seller_product_status: "",
    });
  }

  async function handleSync(type) {
    try {
      setLoading(true);

      await api.post(`/api/admin/products/sync?type=${type}`);

      toast.success(`Sync ${type} started`);

      getProducts();
    } catch (error) {
      console.log(error);

      toast.error(error?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <ToastContainer position="top-right" autoClose={3000} />
    <div className="min-h-screen p-3 md:p-6">
      {/* HEADER */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold">Product Management</h1>

          <p className="text-gray-500">PPOB Product Dashboard</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleSync("prepaid")}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl"
          >
            Sync Prepaid
          </button>

          <button
            onClick={() => handleSync("pasca")}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl"
          >
            Sync Pasca
          </button>

          <button
            onClick={() => {
              setOpenModal(true);
              setEditId(null);
              setForm(initialForm);
            }}
            className="bg-black text-white px-4 py-2 rounded-xl"
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* FILTER */}
      <div className="bg-white p-5 rounded-2xl shadow-sm mb-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        <input
          type="text"
          placeholder="Search..."
          value={filters.search}
          className="border rounded-xl p-3"
          onChange={(e) =>
            setFilters({
              ...filters,
              search: e.target.value,
            })
          }
        />

        <select
          value={filters.product_type}
          className="border rounded-xl p-3"
          onChange={(e) => {
            const value = e.target.value;

            setFilters((prev) => ({
              ...prev,
              product_type: value,
            }));
          }}
        >
          <option value="">Product Type</option>

          <option value="prepaid">Prepaid</option>

          <option value="postpaid">Postpaid</option>
        </select>

        <select
          value={filters.buyer_product_status}
          className="border rounded-xl p-3"
          onChange={(e) =>
            setFilters({
              ...filters,
              buyer_product_status: e.target.value,
            })
          }
        >
          <option value="">Buyer Status</option>

          <option value="true">Active</option>

          <option value="false">Inactive</option>
        </select>

        <select
          value={filters.seller_product_status}
          className="border rounded-xl p-3"
          onChange={(e) =>
            setFilters({
              ...filters,
              seller_product_status: e.target.value,
            })
          }
        >
          <option value="">Seller Status</option>

          <option value="true">Active</option>

          <option value="false">Inactive</option>
        </select>

        <button
          onClick={handleDeleteAllFilter}
          className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-3"
        >
          Reset Filter
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 text-left">Product</th>
                <th className="p-4 text-left">Category</th>
                <th className="p-4 text-left">Brand</th>
                <th className="p-4 text-left">Type</th>
                <th className="p-4 text-left">Price</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center">
                    Loading...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center">
                    No products
                  </td>
                </tr>
              ) : (
                products.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-semibold">{item.product_name}</div>

                      <div className="text-xs text-gray-500">
                        {item.buyer_sku_code}
                      </div>
                    </td>

                    <td className="p-4">{item.category}</td>

                    <td className="p-4">{item.brand}</td>

                    <td className="p-4">{item.product_type}</td>

                    <td className="p-4 font-semibold">
                      Rp {Number(item.selling_price || 0).toLocaleString()}
                    </td>

                    <td className="p-4">
                      <div className="flex gap-2 flex-wrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs text-white ${
                            item.buyer_product_status
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        >
                          Buyer
                        </span>

                        <span
                          className={`px-3 py-1 rounded-full text-xs text-white ${
                            item.seller_product_status
                              ? "bg-blue-500"
                              : "bg-gray-400"
                          }`}
                        >
                          Seller
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 border-t">
          <div className="text-sm text-gray-500">
            Total: {meta.total || 0} products
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={!meta.prev_page}
              onClick={() => setPage(meta.prev_page)}
              className="px-4 py-2 rounded-lg border disabled:opacity-50"
            >
              Prev
            </button>

            <div className="text-sm">
              Page {meta.page || 1} / {meta.total_page || 1}
            </div>

            <button
              disabled={!meta.next_page}
              onClick={() => setPage(meta.next_page)}
              className="px-4 py-2 rounded-lg border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {/* MODAL */}
      {openModal && (
        <div className="fixed inset-0 bg-black/50 overflow-auto py-10 z-50">
          <div className="bg-white w-[95%] md:w-full max-w-6xl rounded-2xl p-4 md:p-6 mx-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editId ? "Edit Product" : "Create Product"}
            </h2>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {/* TEXT INPUT */}
              {[
                ["product_name", "Product Name"],
                ["slug", "Slug"],
                ["category", "Category"],
                ["brand", "Brand"],
                ["type", "Type"],
                ["seller_name", "Seller Name"],
                ["buyer_sku_code", "Buyer SKU Code"],
                // ["stock", "Stock"],
              ].map(([key, label]) => (
                <div key={key} className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    {label}
                  </label>

                  <input
                    type="text"
                    placeholder={`Input ${label}`}
                    className="border p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                    value={form[key]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [key]: e.target.value,
                      })
                    }
                  />
                </div>
              ))}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Stock
                </label>

                <input
                  type="number"
                  placeholder="Input Stock"
                  disabled={form.unlimited_stock}
                  className={`border p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-black ${
                    form.unlimited_stock ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                  value={form.stock}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      stock: e.target.value,
                    })
                  }
                />

                {form.unlimited_stock && (
                  <span className="text-xs text-red-500">
                    Unlimited stock aktif
                  </span>
                )}
              </div>

              {/* NUMBER INPUT */}
              {[
                ["price", "Price"],
                ["selling_price", "Selling Price"],

                // hanya tampil kalau postpaid
                ...(form.product_type === "postpaid"
                  ? [
                      ["admin", "Admin"],
                      ["commission", "Commission"],
                    ]
                  : []),

                ["retry_count", "Retry Count"],
                ["max_retry", "Max Retry"],
                ["retry_interval", "Retry Interval"],
              ].map(([key, label]) => (
                <div key={key} className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    {label}
                  </label>

                  <input
                    type="number"
                    placeholder={`Input ${label}`}
                    className="border p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                    value={form[key]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [key]: Number(e.target.value),
                      })
                    }
                  />
                </div>
              ))}

              {/* START CUT OFF */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Start Cut Off
                </label>

                <input
                  type="time"
                  className="border p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                  value={form.start_cut_off}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      start_cut_off: e.target.value,
                    })
                  }
                />
              </div>

              {/* END CUT OFF */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  End Cut Off
                </label>

                <input
                  type="time"
                  className="border p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                  value={form.end_cut_off}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      end_cut_off: e.target.value,
                    })
                  }
                />
              </div>

              {/* PRODUCT TYPE */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Product Type
                </label>

                <select
                  className="border p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                  value={form.product_type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      product_type: e.target.value,
                    })
                  }
                >
                  <option value="prepaid">Prepaid</option>

                  <option value="postpaid">Postpaid</option>
                </select>
              </div>

              {/* DESCRIPTION */}
              <div className="col-span-1 md:col-span-2 xl:col-span-3 flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>

                <textarea
                  placeholder="Input Description"
                  rows={4}
                  className="border p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                  value={form.desc}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      desc: e.target.value,
                    })
                  }
                />
              </div>

              {/* CHECKBOX */}
              <div className="col-span-1 md:col-span-2 xl:col-span-3">
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  Product Settings
                </label>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                  {[
                    ["buyer_product_status", "Buyer Active"],
                    ["seller_product_status", "Seller Active"],
                    ["unlimited_stock", "Unlimited Stock"],
                    ["multi", "Multi"],
                    ["is_active", "Is Active"],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-3 border rounded-xl p-3 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={form[key] || false}
                        onChange={(e) => {
                          const checked = e.target.checked;

                          setForm({
                            ...form,
                            [key]: checked,

                            // otomatis stock jadi 0 kalau unlimited aktif
                            ...(key === "unlimited_stock" && checked
                              ? { stock: "0" }
                              : {}),
                          });
                        }}
                      />

                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* BUTTON */}
              <div className="col-span-1 md:col-span-2 xl:col-span-3 flex justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="border px-5 py-3 rounded-xl hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="bg-black text-white px-5 py-3 rounded-xl hover:bg-gray-800"
                >
                  {editId ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
