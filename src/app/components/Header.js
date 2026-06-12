"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/truyenhinh?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { name: "Trang chủ", path: "/trangchu" },
    { name: "Truyền hình", path: "/truyenhinh" },
    { name: "Lịch phát sóng", path: "/lichphatsong" },
    { name: "Thêm IPTV", path: "/them-iptv" },
  ];

  return (
    <header className="app-header h-18 px-6 flex items-center justify-between">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link 
          href="/trangchu"
          className="flex items-center gap-3 select-none hover:opacity-90 active:scale-95 transition-all"
        >
          <Image
            src="/logo.png"
            alt="Truyền Hình Logo"
            width={44}
            height={44}
            className="rounded-xl"
            priority
          />
          <span className="text-white font-extrabold text-xl tracking-tight hidden sm:inline">
            Truyền Hình
            <span className="text-cyan-400 ml-1 font-black">Số</span>
          </span>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                href={link.path}
                className={`nav-link px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive ? "active" : ""
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-4">
        <button className="gradient-btn text-xs tracking-wider font-bold">MUA GÓI</button>
        
        {/* Search bar mini */}
        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block">
          <input 
            type="text" 
            placeholder="Tìm kênh..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#121216] border border-[#22222b] rounded-full py-1.5 pl-9 pr-4 text-sm outline-none focus:border-[#3e3e4f] w-48 transition-all"
          />
          <button type="submit" className="absolute left-3.5 top-2.5 text-gray-400 hover:text-white transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </form>

        <button className="p-2 text-gray-400 hover:text-white transition-colors">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm text-white select-none">
          TV
        </div>
      </div>
    </header>
  );
}
