"use client";

import { useState, useEffect, useRef } from "react";
import Service from "../../components/home/service";
import Link from "next/link";

const CACHE_TTL = 5 * 60 * 1000;
const API_URL = process.env.NEXT_PUBLIC_GOLANG_URL || "https://api.arvemart.com";

const cacheManager = {
  get: (key) => {
    try {
      const cached = sessionStorage.getItem(key);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_TTL) {
        sessionStorage.removeItem(key);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },
  set: (key, data) => {
    try {
      sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {}
  },
};

const gradients = [
  "bg-gradient-to-r from-yellow-800 to-yellow-600",
  "bg-gradient-to-r from-blue-700 to-blue-500",
  "bg-gradient-to-r from-indigo-700 to-indigo-500",
  "bg-gradient-to-r from-orange-700 to-orange-500",
  "bg-gradient-to-r from-purple-700 to-purple-500",
  "bg-gradient-to-r from-gray-700 to-gray-500",
];

const PopularSection = ({ data }) => {
  if (!data || data.length === 0) return null;
  return (
    <div className="mb-10 px-4 container">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          🔥 POPULER SEKARANG!
        </h2>
        <p className="text-gray-400 text-sm">
          Berikut adalah beberapa produk yang paling populer saat ini.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((item, index) => (
          <Link
            key={item.id}
            href={`/${item.slug}`}
            className={`relative rounded-2xl p-4 flex items-center gap-3 overflow-hidden transition hover:scale-[1.02] ${gradients[index % gradients.length]}`}
          >
            <img
              src={`${item.logo}?f_auto,q_auto,w_100`}
              alt={item.name}
              width={56}
              height={56}
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
        ))}
      </div>
    </div>
  );
};

const BannerFrame = ({ children }) => (
  <div
    className="relative w-full overflow-hidden rounded-2xl"
    style={{ aspectRatio: "3 / 1" }}
  >
    {children}
  </div>
);

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [kategori, setKategori] = useState(null);
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [popularServices, setPopularServices] = useState([]);
  const [activePromo, setActivePromo] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const fetchedRef = useRef(false);

  const getServiceCacheKey = (kategoriId, pageNum) =>
    `services_${kategoriId}_${pageNum}`;

  const fetchBanners = async () => {
    try {
      setBannersLoading(true);

      const cached = cacheManager.get("banners");
      if (cached) {
        setBanners(cached);
        setBannersLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/banners`);
      const json = await res.json();
      const data = json?.data || [];
      cacheManager.set("banners", data);
      setBanners(data);
    } catch (err) {
      console.error("Failed to load banners:", err);
    } finally {
      setBannersLoading(false);
    }
  };

  const fetchPopularServices = async () => {
    try {
      const cached = cacheManager.get("popular_services");
      if (cached) {
        setPopularServices(cached);
        return;
      }
      const res = await fetch(`${API_URL}/api/services/popular`);
      const json = await res.json();
      const data = json?.data || [];
      cacheManager.set("popular_services", data);
      setPopularServices(data);
    } catch (err) {
      console.error("Error popular:", err);
    }
  };

  const fetchCategories = async () => {
    const cached = cacheManager.get("categories");
    if (cached) {
      setCategories(cached);
      if (cached.length > 0) setKategori(cached[0].id);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/categories`);
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

  const fetchServices = async (pageNum = 1, kategoriId = null, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const cacheKey = getServiceCacheKey(kategoriId, pageNum);
      const cached = cacheManager.get(cacheKey);

      if (cached) {
        setServices((prev) => (append ? [...prev, ...cached.data] : cached.data));
        setHasMore(pageNum < cached.meta.total_page);
        return;
      }

      const res = await fetch(
        `${API_URL}/api/services?page=${pageNum}&limit=12&category_id=${kategoriId}`
      );
      const json = await res.json();
      const newData = json?.data || [];
      const meta = json?.meta;

      cacheManager.set(cacheKey, { data: newData, meta });
      setServices((prev) => (append ? [...prev, ...newData] : newData));
      setHasMore(pageNum < meta?.total_page);
    } catch (err) {
      console.error(err);
      setError("Gagal load layanan");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (fetchedRef.current) return;
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

        fetchBanners();
        return;
      }
    }

    fetchCategories();
    fetchBanners();
    fetchPopularServices();
  }, []);

  useEffect(() => {
    if (!kategori) return;
    setPage(1);
    setServices([]);
    fetchServices(1, kategori, false);
    fetchPopularServices();
  }, [kategori]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(false);
      setBannersLoading(false);
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    setActivePromo(0);
    const interval = setInterval(() => {
      setActivePromo((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchServices(nextPage, kategori, true);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#37353E] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchServices(1, kategori);
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const selectedCategory = categories.find((c) => c.id === kategori);

  return (
    <>
      {/* HERO / BANNER */}
      <div className="bg-[#37353E] p-3 sm:p-4 md:p-6">
        <section>
          {bannersLoading ? (
            <BannerFrame>
              <div className="absolute inset-0 bg-gray-700 animate-pulse rounded-2xl" />
            </BannerFrame>
          ) : banners.length === 0 ? (
            <div className="text-center text-gray-500 py-10">No Banner</div>
          ) : (
            <BannerFrame>
              {banners.map((banner, idx) => (
                <div
                  key={banner.id}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    idx === activePromo ? "opacity-100 z-10" : "opacity-0 z-0"
                  }`}
                >
                  <img
                    src={`${banner.image}?f_auto,q_auto,w_1600,h_900,c_fill,g_auto&v=${banner.id}`}
                    alt={banner.title || "banner"}
                    width={1600}
                    height={900}
                    className="w-full h-full object-cover object-center"
                    loading={idx === 0 ? "eager" : "lazy"}
                    fetchPriority={idx === 0 ? "high" : "auto"}
                  />
                  {banner.title && (
                    <div className="absolute inset-0 bg-black/30 flex items-end p-4">
                      <h2 className="text-white text-lg md:text-2xl font-semibold drop-shadow">
                        {banner.title}
                      </h2>
                    </div>
                  )}
                </div>
              ))}

              {banners.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                  {banners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePromo(idx)}
                      aria-label={`Slide ${idx + 1}`}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx === activePromo ? "bg-white w-4" : "bg-white/50 w-2"
                      }`}
                    />
                  ))}
                </div>
              )}
            </BannerFrame>
          )}
        </section>
      </div>

      {/* POPULAR */}
      <PopularSection data={popularServices} />

      {/* MAIN */}
      <div className="container mx-auto px-4 pb-10 bg-[#37353E]">
        <div className="flex overflow-x-auto mb-6 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setKategori(cat.id)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap ${
                kategori === cat.id
                  ? "bg-white text-black"
                  : "bg-gray-700 text-white"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-white py-10">Loading...</div>
        ) : services.length > 0 ? (
          <>
            <Service
              games={services}
              title={selectedCategory?.name || "Layanan"}
              layout="grid"
              columns={4}
            />
            {hasMore && (
              <div className="text-center mt-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl disabled:opacity-50"
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