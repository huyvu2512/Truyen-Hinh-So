"use client";

import Link from "next/link";
import { CHANNELS } from "../channels";

export default function TrangChu() {
  // Select some featured channels for the home showcase
  const featuredChannels = CHANNELS.slice(0, 4);

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-6 sm:px-12 text-center bg-gradient-to-b from-[#0e0e13] to-[#08080a] border-b border-[#1b1b22]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.07)_0,transparent_60%)] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="inline-flex items-center gap-1.5 text-xs bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-6">
            Mới cập nhật
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
            Truyền Hình <span className="text-cyan-400 italic">Số</span> Trực Tuyến <br />
            Chất Lượng Cao Mọi Lúc
          </h1>
          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Xem trọn vẹn các kênh truyền hình độ nét cao hoàn toàn miễn phí. Hỗ trợ EPG lịch phát sóng và tùy chỉnh thêm nguồn IPTV yêu thích của riêng bạn.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/truyenhinh" 
              className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold px-8 py-4 rounded-full text-base transition-all transform hover:scale-[1.03] active:scale-95 shadow-lg shadow-cyan-500/10"
            >
              Bắt đầu xem ngay
            </Link>
            <Link 
              href="/them-iptv" 
              className="w-full sm:w-auto bg-[#121216] border border-[#22222b] hover:bg-[#1b1b22] text-gray-200 hover:text-white font-bold px-8 py-4 rounded-full text-base transition-all active:scale-95"
            >
              Thêm nguồn IPTV
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 max-w-[1400px] mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Tính Năng Nổi Bật</h2>
          <p className="text-gray-500 mt-3">Trải nghiệm xem truyền hình số hiện đại và tối ưu hóa tối đa</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-[#121216] border border-[#22222b] hover:border-[#3e3e4f] p-8 rounded-2xl transition-all duration-300 hover:transform hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Tốc Độ Cực Cao</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Tích hợp công nghệ luồng HLS tiên tiến cùng Proxy Cache thông minh tối ưu băng thông và giảm giật lag hiệu quả.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-[#121216] border border-[#22222b] hover:border-[#3e3e4f] p-8 rounded-2xl transition-all duration-300 hover:transform hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Lịch Phát Sóng (EPG)</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Theo dõi lịch chiếu trực tiếp để không bỏ lỡ các trận bóng đá kịch tính, bản tin thời sự nóng hổi hay những bộ phim đặc sắc.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-[#121216] border border-[#22222b] hover:border-[#3e3e4f] p-8 rounded-2xl transition-all duration-300 hover:transform hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Tùy Chọn Playlist</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Dễ dàng nhập danh sách kênh M3U cá nhân từ các nhà cung cấp mạng của riêng bạn trực tiếp vào ứng dụng để thưởng thức.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Channels List */}
      <section className="py-16 bg-[#0c0c0f] border-t border-[#1b1b22] w-full">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Kênh Truyền Hình Số Phổ Biến</h2>
              <p className="text-gray-500 text-xs mt-1">Các kênh nổi bật xem trực tuyến nhanh chóng</p>
            </div>
            <Link href="/truyenhinh" className="text-cyan-400 hover:text-cyan-300 font-bold text-sm flex items-center gap-1">
              Xem tất cả
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {featuredChannels.map((channel) => (
              <Link
                key={channel.id}
                href={`/truyenhinh?channel=${channel.id}`}
                className="bg-[#121216] border border-[#22222b] hover:border-[#3e3e4f] p-6 rounded-2xl flex flex-col items-center gap-4 transition-all duration-300 hover:transform hover:-translate-y-1"
              >
                <img 
                  src={channel.altLogo} 
                  alt={channel.name} 
                  onError={(e) => {
                    if (e.target.src !== channel.logo) {
                      e.target.src = channel.logo;
                    } else {
                      e.target.onerror = null;
                      e.target.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                    }
                  }}
                  className="h-12 w-auto object-contain"
                />
                <span className="text-sm font-semibold text-gray-200">{channel.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
