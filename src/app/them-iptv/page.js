"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function ThemIPTV() {
  const [customChannels, setCustomChannels] = useState([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [logo, setLogo] = useState("");
  const [group, setGroup] = useState("Cá nhân");
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("truyenhinh_custom_channels");
    if (saved) {
      try {
        setCustomChannels(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Vui lòng nhập tên kênh.");
      return;
    }
    if (!url.trim() || (!url.startsWith("http://") && !url.startsWith("https://"))) {
      setError("Vui lòng nhập đường dẫn luồng hợp lệ (bắt đầu bằng http hoặc https).");
      return;
    }

    const newChannel = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      url: url.trim(),
      logo: logo.trim() || "/logo.png",
      altLogo: logo.trim() || "/logo.png",
      group: group.trim() || "Cá nhân",
      isCustom: true
    };

    const updated = [newChannel, ...customChannels];
    setCustomChannels(updated);
    localStorage.setItem("truyenhinh_custom_channels", JSON.stringify(updated));

    setName("");
    setUrl("");
    setLogo("");
    setGroup("Cá nhân");
    setSuccess("Đã thêm kênh tùy chỉnh thành công!");
  };

  const handleDelete = (id) => {
    const updated = customChannels.filter((ch) => ch.id !== id);
    setCustomChannels(updated);
    localStorage.setItem("truyenhinh_custom_channels", JSON.stringify(updated));
  };

  if (!isClient) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#08080a] text-white">
        <div className="text-lg font-semibold animate-pulse">Đang tải cấu hình...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-[1000px] w-full mx-auto px-6 py-8 flex flex-col gap-8">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Thêm Nguồn IPTV Tùy Chỉnh</h1>
        <p className="text-gray-500 mt-1 text-sm">Thêm các liên kết phát sóng hoặc kênh yêu thích cá nhân của bạn vào ứng dụng</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form add */}
        <section className="bg-[#121216] border border-[#22222b] rounded-2xl p-6 h-fit">
          <h2 className="text-md font-bold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Nhập thông tin kênh
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3.5 rounded-xl font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-3.5 rounded-xl font-medium">
                {success}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400">Tên Kênh *</label>
              <input 
                type="text" 
                placeholder="Ví dụ: Kênh Phim Hay, HBO HD..." 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#1a1a22] border border-[#2b2b36] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3e3e4f] text-white transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400">Đường dẫn luồng phát (HLS/M3U8) *</label>
              <input 
                type="text" 
                placeholder="https://example.com/live.m3u8" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-[#1a1a22] border border-[#2b2b36] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3e3e4f] text-white transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400">Đường dẫn logo ảnh (Không bắt buộc)</label>
              <input 
                type="text" 
                placeholder="https://example.com/logo.png" 
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                className="bg-[#1a1a22] border border-[#2b2b36] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3e3e4f] text-white transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400">Nhóm / Danh mục (Ví dụ: Thể thao, Giải trí...)</label>
              <input 
                type="text" 
                placeholder="Cá nhân" 
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="bg-[#1a1a22] border border-[#2b2b36] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3e3e4f] text-white transition-all"
              />
            </div>

            <button 
              type="submit" 
              className="mt-2 w-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all transform active:scale-95 shadow-md shadow-cyan-500/5"
            >
              Thêm vào danh sách
            </button>
          </form>
        </section>

        {/* Custom channels listing */}
        <section className="bg-[#121216] border border-[#22222b] rounded-2xl p-6 h-[480px] flex flex-col">
          <h2 className="text-md font-bold text-white mb-6 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Kênh đã thêm ({customChannels.length})
            </span>
            {customChannels.length > 0 && (
              <Link href="/truyenhinh" className="text-xs text-cyan-400 hover:text-cyan-300 font-bold">
                Mở Trình phát
              </Link>
            )}
          </h2>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
            {customChannels.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <svg className="w-12 h-12 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm">Chưa có kênh tự thêm nào.</p>
                <p className="text-[11px] text-gray-600 mt-1">Các kênh bạn nhập vào sẽ được lưu tại đây</p>
              </div>
            ) : (
              customChannels.map((channel) => (
                <div 
                  key={channel.id}
                  className="bg-[#16161c] border border-[#22222b] rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={channel.altLogo} 
                      alt={channel.name} 
                      onError={(e) => { e.target.src = "/logo.png"; }}
                      className="h-8 w-12 object-contain bg-[#121216] p-1 rounded border border-[#22222b]"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">{channel.name}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{channel.group}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Link 
                      href={`/truyenhinh?channel=${channel.id}`}
                      className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-[#21212a] rounded-lg transition-colors"
                      title="Phát kênh này"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </Link>
                    <button 
                      onClick={() => handleDelete(channel.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-[#21212a] rounded-lg transition-colors"
                      title="Xóa kênh"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
