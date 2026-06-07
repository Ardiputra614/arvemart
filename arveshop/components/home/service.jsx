"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Search, Zap, ShoppingBag } from "lucide-react";
import Image from "next/image";

// ✅ Komponen terpisah supaya useState boleh dipakai
const GameCard = ({ game }) => {
  console.log(game);
  const catName = game.category?.name ?? game.category ?? "";
  const [imgSrc, setImgSrc] = useState(game.logo || "/placeholder.png");

  // ✅ Perbaikan logic untuk menentukan href
  const getHref = () => {
    const categoryName = (
      game.category?.name ??
      game.category ??
      ""
    ).toLowerCase();
    const isPascabayar = categoryName === "pascabayar";

    if (isPascabayar) {
      return `/${game.slug}/pascabayar`;
    }
    return `/${game.slug}`;
  };

  return (
    <Link href={getHref()} className="group">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-800 shadow-lg hover:rotate-2 hover:scale-[1.06] transition-transform duration-200">
        <Image
          src={imgSrc}
          alt={game.name}
          fill
          unoptimized
          onError={() => setImgSrc("/placeholder.png")}
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <div className="absolute bottom-0 p-4 bg-black/60 w-full">
          <h3 className="text-white font-bold text-sm ">{game.name}</h3>
          {catName && <span className="text-xs text-gray-300">{catName}</span>}
        </div>
        {game.is_featured && (
          <div className="absolute top-3 right-3 bg-red-500 text-xs px-2 py-1 rounded-full text-white flex items-center gap-1">
            <Zap size={12} />
            HOT
          </div>
        )}
      </div>
    </Link>
  );
};

const Service = ({ games, title = "" }) => {
  console.log(games);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("popular");

  const filteredGames = games.filter((game) => {
    const catName = game.category?.name ?? game.category ?? "";
    return (
      searchQuery === "" ||
      game.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      catName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const sortedGames = [...filteredGames].sort((a, b) => {
    if (sortBy === "alphabetical") return a.name.localeCompare(b.name);
    if (sortBy === "newest")
      return new Date(b.created_at) - new Date(a.created_at);
    if (a.is_featured && !b.is_featured) return -1;
    if (!a.is_featured && b.is_featured) return 1;
    return a.name.localeCompare(b.name);
  });

  if (!games.length) {
    return (
      <div className="text-center py-12 bg-[#44444E] rounded-3xl">
        <ShoppingBag className="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">Belum ada layanan</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedGames.length === 0 ? (
        <div className="text-center py-12 bg-[#44444E] rounded-3xl">
          <ShoppingBag className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            Tidak ada layanan ditemukan
          </h3>
          <p className="text-gray-400">Coba kata kunci lain</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {sortedGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Service;
