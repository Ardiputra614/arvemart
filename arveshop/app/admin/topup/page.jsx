"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Search,
  Filter,
  Package,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";

export default function AdminTopupList() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const url = process.env.NEXT_PUBLIC_GOLANG_URL || "http://localhost:8080";

      const [categoriesRes, servicesRes] = await Promise.all([
        axios.get(`${url}/api/categories`),
        axios.get(`${url}/api/services`),
      ]);

      const categoriesData = categoriesRes.data.data || [];
      const servicesData = servicesRes.data.data || [];

      setCategories(categoriesData);
      setServices(servicesData);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.slug?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" ||
      String(service.category_id) === String(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  const handleTopupClick = (service) => {
    router.push(`/admin/topup/${service.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Memuat data layanan...</p>
        </div>
      </div>
    );
  }

  const ServiceLogo = ({ service }) => {
    const [imgSrc, setImgSrc] = useState(service.logo || null);

    if (!imgSrc) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <Package className="w-8 h-8 text-gray-400" />
        </div>
      );
    }

    return (
      <Image
        src={imgSrc}
        alt={service.name}
        width={64}
        height={64}
        unoptimized
        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
        onError={() => setImgSrc(null)}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Admin Topup Panel</h1>
              <p className="text-gray-600">Kelola dan lakukan topup untuk semua layanan</p>
            </div>
          </div>
        </div>

        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari layanan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>

            <div className="md:w-64 relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({services.filter((s) => String(s.category_id) === String(cat.id)).length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <p className="text-gray-600">
              Menampilkan <span className="font-semibold text-gray-900">{filteredServices.length}</span> dari{" "}
              <span className="font-semibold text-gray-900">{services.length}</span> layanan
            </p>
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="text-blue-600 hover:text-blue-500">
                Reset pencarian
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              onClick={() => handleTopupClick(service)}
              className="group bg-white rounded-xl p-5 cursor-pointer transition-all border border-gray-200 hover:border-blue-500 hover:shadow-lg"
            >
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform border border-gray-100">
                  <ServiceLogo service={service} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {service.name}
                  </h3>
                </div>
              </div>
            </div>
          ))}

          {filteredServices.length === 0 && (
            <div className="col-span-full text-center py-16">
              <div className="bg-white rounded-2xl p-8 max-w-md mx-auto shadow-sm border border-gray-200">
                <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl text-gray-900 mb-2">Tidak ada layanan</h3>
                <p className="text-gray-500 mb-4">
                  Tidak ditemukan layanan dengan kata kunci &quot;{searchTerm}&quot;
                </p>
                <button
                  onClick={() => { setSearchTerm(""); setSelectedCategory("all"); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reset Filter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
