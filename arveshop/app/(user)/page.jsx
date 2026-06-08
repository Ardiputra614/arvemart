"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Service from "../../components/home/service";
import Link from "next/link";

const CACHE_TTL = 5 * 60 * 1000;
const URL = process.env.NEXT_PUBLIC_GOLANG_URL;

// Cache helper
const cacheManager = {
  get: (key) => {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data;
  },
  set: (key, data) => {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    );
  },
};

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [kategori, setKategori] = useState(null);
  const [banners, setBanners] = useState([]);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const fetchedRef = useRef(false);

  // Safety timeout: force loading off after 8s
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(t);
  }, []);

  const getServiceCacheKey = (kategoriId, page) =>
    `services_${kategoriId}_${page}`;

  const fetchBanners = async () => {
    try {
      const res = await fetch(`${URL}/api/banners`);
      const json = await res.json();
      setBanners(json?.data || []);
    } catch (err) {
      console.error("Failed to load banners:", err);
    }
  };

  // =========================
  // FETCH CATEGORIES
  // =========================
  const fetchCategories = async () => {
    const cached = cacheManager.get("categories");

    if (cached) {
      setCategories(cached);
      if (!kategori && cached.length > 0) {
        setKategori(cached[0].id);
      }
      return;
    }

    try {
      const res = await fetch(`${URL}/api/categories`);
      const json = await res.json();

      const data = json?.data || [];

      cacheManager.set("categories", data);
      setCategories(data);

      if (data.length > 0) {
        setKategori(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Gagal load kategori");
      setLoading(false);
    }
  };

  // =========================
  // FETCH SERVICES (PAGINATION)
  // =========================
  const fetchServices = async (
    pageNum = 1,
    kategoriId = null,
    append = false,
  ) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const cacheKey = getServiceCacheKey(kategoriId, pageNum);
      const cached = cacheManager.get(cacheKey);

      if (cached) {
        setServices((prev) =>
          append ? [...prev, ...cached.data] : cached.data,
        );
        setHasMore(pageNum < cached.meta.total_page);
        if (pageNum === 1) setLoading(false);
        else setLoadingMore(false);
        return;
      }

      const res = await fetch(
        `${URL}/api/services?page=${pageNum}&limit=12&category_id=${kategoriId}`,
      );

      const json = await res.json();

      const newData = json?.data || [];
      const meta = json?.meta;

      // simpan cache
      cacheManager.set(cacheKey, {
        data: newData,
        meta,
      });

      setServices((prev) => (append ? [...prev, ...newData] : newData));

      setHasMore(pageNum < meta.total_page);
    } catch (err) {
      console.error(err);
      setError("Gagal load layanan");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // =========================
  // INITIAL LOAD
  // =========================
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;

      const catCache = cacheManager.get("categories");
      if (catCache && catCache.length > 0) {
        setCategories(catCache);
        const firstId = catCache[0].id;
        setKategori(firstId);
        const svcCache = cacheManager.get(`services_${firstId}_1`);
        if (svcCache) {
          setServices(svcCache.data);
          setHasMore(1 < svcCache.meta.total_page);
          setLoading(false);
          const popularCache = cacheManager.get("popular_services");
          if (popularCache) setPopularServices(popularCache);
          return;
        }
      }

      fetchCategories();
      fetchBanners();
    }
  }, []);

  // =========================
  // LOAD SERVICES SAAT KATEGORI BERUBAH
  // =========================
  useEffect(() => {
    if (kategori) {
      setPage(1);
      setServices([]); // 🔥 kosongkan dulu biar smooth
      fetchServices(1, kategori, false);
      fetchPopularServices();
    }
  }, [kategori]);

  // =========================
  // LOAD MORE
  // =========================
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchServices(nextPage, kategori, true);
  };

  // =========================
  // AUTO SLIDE BANNER
  // =========================
  const [activePromo, setActivePromo] = useState(0);

  useEffect(() => {
    setActivePromo(0);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setActivePromo((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  // const promoInitialized = useRef(false);

  // useEffect(() => {
  //   if (promoInitialized.current) return;

  //   promoInitialized.current = true;

  //   const interval = setInterval(() => {
  //     setActivePromo((prev) => (prev + 1) % promos.length);
  //   }, 5000);

  //   return () => clearInterval(interval);
  // }, []);

  const [popularServices, setPopularServices] = useState([]);

  const fetchPopularServices = async () => {
    try {
      const res = await fetch(`${URL}/api/services/popular`);
      const json = await res.json();

      cacheManager.set("popular_services", json.data);
      setPopularServices(json.data || []);
    } catch (err) {
      console.error("Error popular:", err);
    }
  };

  // =========================
  // ERROR
  // =========================
  if (error) {
    return (
      <div className="min-h-screen bg-[#37353E] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => fetchServices(1, kategori)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#37353E] p-10 text-white">
        Loading...
      </div>
    );
  }

  const gradients = [
    "bg-gradient-to-r from-yellow-800 to-yellow-600",
    "bg-gradient-to-r from-blue-700 to-blue-500",
    "bg-gradient-to-r from-indigo-700 to-indigo-500",
    "bg-gradient-to-r from-orange-700 to-orange-500",
    "bg-gradient-to-r from-purple-700 to-purple-500",
    "bg-gradient-to-r from-gray-700 to-gray-500",
  ];

  const PopularSection = ({ data }) => {
    return (
      <div className="mb-10 px-4 container">
        {/* TITLE */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            🔥 POPULER SEKARANG!
          </h2>
          <p className="text-gray-400 text-sm">
            Berikut adalah beberapa produk yang paling populer saat ini.
          </p>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((item, index) => (
            <div
              key={item.id}
              className={`relative rounded-2xl p-4 flex items-center gap-3 overflow-hidden cursor-pointer transition hover:scale-[1.02]`}
            >
              {/* BACKGROUND GRADIENT */}
              <div
                className={`absolute inset-0 opacity-90 bg-gray-700 text-white ${gradients[index]}`}
              />

              {/* CONTENT */}
              <Link
                href={`/${item.slug}`}
                className="relative flex items-center gap-3 z-10"
              >
                <img
                  src={`${item.logo}?f_auto,q_auto,w_100`}
                  alt={item.name}
                  className="w-14 h-14 rounded-xl object-cover"
                />

                <div>
                  <h3 className="text-white font-semibold text-sm md:text-base">
                    {item.name}
                  </h3>
                  <p className="text-gray-200 text-xs">
                    {item.category?.name || "Game"}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const selectedCategory = categories.find((c) => c.id === kategori);

  return (
    <>
      {/* HERO */}
      <div className="bg-[#37353E] p-6">
        <div className="relative h-64 rounded-3xl overflow-hidden">
          {banners.length > 0 ? (
            banners.map((banner, idx) => (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  idx === activePromo ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                {banner.link ? (
                  <a href={banner.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                    <img
                      src={`${banner.image}?f_auto,q_auto,w_1200`}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute bottom-6 left-6 text-white">
                      <h3 className="text-2xl font-bold">{banner.title}</h3>
                      {banner.description && <p>{banner.description}</p>}
                    </div>
                  </a>
                ) : (
                  <>
                    <img
                      src={`${banner.image}?f_auto,q_auto,w_1200`}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute bottom-6 left-6 text-white">
                      <h3 className="text-2xl font-bold">{banner.title}</h3>
                      {banner.description && <p>{banner.description}</p>}
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-700 text-gray-400">
              No Banner
            </div>
          )}
        </div>
      </div>

      <PopularSection data={popularServices} />

      {/* MAIN */}
      <div className="container mx-auto px-4 pb-10 bg-[#37353E]">
        {/* CATEGORY */}
        <div className="flex overflow-x-auto mb-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setKategori(cat.id)}
              className={`px-4 py-2 mx-2 rounded-xl ${
                kategori === cat.id
                  ? "bg-white text-black"
                  : "bg-gray-700 text-white"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* SERVICES */}
        {services.length > 0 ? (
          <>
            <Service
              games={services}
              title={selectedCategory?.name || "Layanan"}
              layout="grid"
              columns={4}
            />

            {/* LOAD MORE */}
            {hasMore && (
              <div className="text-center mt-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl"
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-white py-10">Tidak ada layanan</div>
        )}
      </div>
    </>
  );
}
