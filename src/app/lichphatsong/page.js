"use client";

import { useState, useEffect, useRef } from "react";
import { CHANNELS, getMockEPG } from "../channels";
import Link from "next/link";

export default function LịchPhatSong() {
  const [selectedChannel, setSelectedChannel] = useState(CHANNELS[0] || null);
  const [epgList, setEpgList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [epgSource, setEpgSource] = useState("lichphatsong"); // "lichphatsong" or "vnepg"
  const [isLoading, setIsLoading] = useState(false);

  const activeEpgRef = useRef(null);

  // Function to manually scroll to the active EPG item inside the container instantly
  const scrollToActiveEpg = () => {
    if (activeEpgRef.current) {
      const container = activeEpgRef.current.parentElement;
      if (container) {
        const containerHeight = container.clientHeight;
        const elementOffset = activeEpgRef.current.offsetTop;
        const elementHeight = activeEpgRef.current.clientHeight;
        container.scrollTo({
          top: elementOffset - (containerHeight / 2) + (elementHeight / 2),
          behavior: "auto", // Instant jump
        });
      }
    }
  };

  // Auto-scroll to the active EPG item instantly when channel/epg list changes
  useEffect(() => {
    scrollToActiveEpg();
  }, [epgList]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchEPG = async () => {
      if (!selectedChannel) return;
      setEpgList([]);
      setIsLoading(true);
      try {
        const res = await fetch(`/api/epg?source=${epgSource}&channel=${selectedChannel.id}`);
        if (!res.ok) {
          throw new Error("Không thể tải lịch phát sóng");
        }
        const data = await res.json();

        const now = new Date();
        // Get start and end of today in local timezone
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const updatedData = data
          .map((prog) => {
            const start = new Date(prog.start);
            const end = new Date(prog.end);
            let status = "upcoming";
            if (now >= start && now < end) {
              status = "live";
            } else if (now >= end) {
              status = "past";
            }
            const startTimeStr = start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
            const endTimeStr = end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
            return {
              ...prog,
              time: `${startTimeStr} - ${endTimeStr}`,
              status,
              startObj: start,
              endObj: end
            };
          })
          .filter((prog) => {
            // Filter programs that overlap with today
            return prog.startObj < endOfDay && prog.endObj > startOfDay;
          });

        setEpgList(updatedData);
      } catch (err) {
        console.error(err);
        setEpgList([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEPG();
  }, [selectedChannel, epgSource]);

  const filteredChannels = CHANNELS.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );



  return (
    <div className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
      {/* Sidebar - Channels selection list */}
      <aside className="w-full lg:w-80 bg-[#121216] border border-[#22222b] rounded-2xl flex flex-col h-[600px] overflow-hidden">
        <div className="p-4 border-b border-[#22222b]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-200 mb-2.5">Nguồn epg</h3>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#1a1a22] border border-[#2b2b36] rounded-xl mb-4">
            <button
              onClick={() => setEpgSource("lichphatsong")}
              disabled={epgSource === "lichphatsong"}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-center ${
                epgSource === "lichphatsong"
                  ? "bg-[#00d4ff] text-black shadow-md shadow-[#00d4ff]/10 cursor-not-allowed"
                  : "text-gray-400 hover:text-white cursor-pointer"
              }`}
            >
              lichphatsong.site
            </button>
            <button
              onClick={() => setEpgSource("vnepg")}
              disabled={epgSource === "vnepg"}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-center ${
                epgSource === "vnepg"
                  ? "bg-[#00d4ff] text-black shadow-md shadow-[#00d4ff]/10 cursor-not-allowed"
                  : "text-gray-400 hover:text-white cursor-pointer"
              }`}
            >
              vnepg.site
            </button>
          </div>

          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-200 mb-2.5">Danh sách kênh</h3>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Tìm kênh..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1a1a22] border border-[#2b2b36] rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:border-[#3e3e4f] w-full transition-all text-white"
            />
            <svg className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {filteredChannels.map((channel) => {
            const isSelected = selectedChannel.id === channel.id;
            return (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                disabled={isSelected}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                  isSelected 
                    ? "bg-[#21212a] border border-[#3e3e4f] cursor-not-allowed opacity-90" 
                    : "hover:bg-[#1b1b22] border border-transparent cursor-pointer active:scale-[0.97] active:bg-[#252530]"
                }`}
              >
                <img 
                  src={channel.altLogo} 
                  alt={channel.name} 
                  onError={(e) => {
                    if (!e.target.dataset.triedFallback && channel.logo !== channel.altLogo) {
                      e.target.dataset.triedFallback = "true";
                      e.target.src = channel.logo;
                    } else {
                      e.target.onerror = null;
                      e.target.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                    }
                  }}
                  className="h-10 w-16 flex-shrink-0 object-cover bg-[#16161c] rounded-md border border-[#22222b]"
                />
                <div>
                  <div className="text-sm font-bold text-white">{channel.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{channel.id}</div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main EPG list detail */}
      <main className="flex-1 bg-[#121216] border border-[#22222b] rounded-2xl p-6 flex flex-col h-[600px] overflow-hidden">
        {/* Header detailing active selected channel */}
        {selectedChannel ? (
          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-[#22222b] pb-5 mb-5 gap-4">
            <div className="flex items-center gap-4">
              <img 
                src={selectedChannel.altLogo} 
                alt={selectedChannel.name}
                onError={(e) => {
                  if (!e.target.dataset.triedFallback && selectedChannel.logo !== selectedChannel.altLogo) {
                    e.target.dataset.triedFallback = "true";
                    e.target.src = selectedChannel.logo;
                  } else {
                    e.target.onerror = null;
                    e.target.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                  }
                }}
                className="h-10 w-14 object-contain bg-[#16161c] p-1.5 rounded-lg border border-[#22222b]"
              />
              <div>
                <h2 className="text-lg font-extrabold text-white">{selectedChannel.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Lịch phát sóng chi tiết ngày hôm nay</p>
              </div>
            </div>

            <Link 
              href={`/truyenhinh?channel=${selectedChannel.id}`} 
              className="self-start sm:self-auto bg-transparent border border-[#00d4ff]/40 hover:border-[#00d4ff] text-[#00d4ff] font-semibold px-5 py-2.5 rounded-xl text-xs transition-all active:scale-95 text-center flex items-center justify-center gap-1.5 hover:bg-[#00d4ff]/5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Xem kênh trực tiếp
            </Link>
          </div>
        ) : (
          <div className="text-gray-400 text-sm text-center py-6">Chưa chọn kênh hoặc danh sách kênh trống</div>
        )}

        {/* EPG timeline stream list */}
        <div className="epg-list-container relative flex-1 overflow-y-auto pr-2">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#121216]/60 backdrop-blur-sm z-30">
              <div className="w-8 h-8 border-3 border-t-[#00d4ff] border-gray-700 rounded-full animate-spin" />
              <span className="text-[10px] text-gray-400 mt-2 font-medium">Đang tải lịch phát sóng...</span>
            </div>
          )}
          {epgList.length === 0 && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-xs py-10 px-4 text-center">
              Không có dữ liệu lịch phát sóng cho kênh này
            </div>
          )}
          {epgList.map((prog) => {
            const isLive = prog.status === "live";
            let startStr = "";
            let endStr = "";
            let progressPercent = 0;
            
            if (isLive) {
              // Parse time (e.g. "14:15 - 15:45")
              const parts = prog.time.split(" - ");
              if (parts.length === 2) {
                startStr = parts[0];
                endStr = parts[1];
              }
              
              // Calculate progress percent
              const startTime = new Date(prog.start).getTime();
              const endTime = new Date(prog.end).getTime();
              const nowTime = new Date().getTime();
              if (nowTime > startTime && nowTime < endTime) {
                const total = endTime - startTime;
                const passed = nowTime - startTime;
                progressPercent = Math.round((passed / total) * 100);
              } else if (nowTime >= endTime) {
                progressPercent = 100;
              }
            } else {
              // Non-live: start time is the first part of prog.time
              startStr = prog.time.split(" - ")[0];
            }

            // Format EPG title and filter out duration descriptions
            let finalTitle = prog.title;
            if (epgSource === "lichphatsong") {
              // Convert all-caps title to Capitalize Each Word (Title Case)
              finalTitle = prog.title.toLowerCase().replace(/(?<=^|[\s:.\-])[a-zàáâãèéêìíòóôõùúýăđĩũơưạ-ỹ]/g, (letter) => letter.toUpperCase());
            }

            const hasAnnoyingDesc = prog.desc && (prog.desc.includes("thời lượng") || prog.desc.includes("Chương trình này"));
            const cleanDesc = (prog.desc && !hasAnnoyingDesc) ? prog.desc : "";
            const displayTitle = cleanDesc ? `${finalTitle}: ${cleanDesc}` : finalTitle;

            return (
              <div 
                key={prog.id} 
                ref={isLive ? activeEpgRef : null}
                className={`epg-item ${isLive ? "active" : ""}`}
              >
                {isLive ? (
                  // Live EPG Item Layout
                  <>
                    <div className="epg-item-live-badge select-none">
                      <span className="epg-item-live-dot"></span>
                      <span>LIVE</span>
                    </div>
                    <div className="epg-item-content">
                      <div className="epg-item-title-row">
                        <span className="epg-item-title flex-1">{displayTitle}</span>
                        <div className="orange-eq-icon flex-shrink-0">
                          <span className="orange-eq-bar" />
                          <span className="orange-eq-bar" />
                          <span className="orange-eq-bar" />
                        </div>
                      </div>
                      
                      <div className="epg-progress-bar-container">
                        <div 
                          className="epg-progress-bar-fill" 
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      
                      <div className="epg-progress-time-row">
                        <span>{startStr}</span>
                        <span>{endStr}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  // Upcoming/Past EPG Item Layout
                  <>
                    <div className="epg-item-time-col">
                      {startStr}
                    </div>
                    <div className="epg-item-content">
                      <div className="epg-item-title-row">
                        <span className="epg-item-title">{displayTitle}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
