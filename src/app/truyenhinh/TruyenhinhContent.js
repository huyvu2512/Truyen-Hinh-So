"use client";

import { useState, useEffect, useRef } from "react";
import { CHANNELS, getMockEPG } from "../channels";
import Hls from "hls.js";
import { useSearchParams, useRouter } from "next/navigation";

const loadShakaPlayer = () => {
  return new Promise((resolve) => {
    if (window.shaka) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.3.5/shaka-player.compiled.js";
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

function parseClearKey(drmString) {
  if (!drmString) return null;
  if (typeof drmString === 'object') return drmString;

  try {
    let keyString = drmString;
    if (drmString.startsWith('http')) {
      const urlObj = new URL(drmString);
      keyString = urlObj.searchParams.get('id') || '';
    }

    const parts = keyString.split(':');
    if (parts.length === 2) {
      return {
        [parts[0].trim()]: parts[1].trim()
      };
    }
  } catch (e) {
    console.error("Lỗi parse ClearKey:", e);
  }
  return null;
}
export default function TruyenhinhContent({ initialChannelId } = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchParamQuery = searchParams.get("search") || "";

  const getInitialChannel = () => {
    if (initialChannelId) {
      const match = CHANNELS.find((ch) => ch.id === initialChannelId);
      if (match) return match;
    }
    return CHANNELS[0] || null;
  };

  const [channels, setChannels] = useState(CHANNELS);
  const [activeChannel, setActiveChannel] = useState(getInitialChannel);
  const [epgList, setEpgList] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState(searchParamQuery);
  const [activeCategory, setActiveCategory] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("truyenhinh_active_category");
      if (saved) return saved;
    }
    const initChan = getInitialChannel();
    return initChan ? (initChan.group || "Tất cả") : "Tất cả";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("truyenhinh_active_category", activeCategory);
    }
  }, [activeCategory]);

  const [activeTab, setActiveTab] = useState("Truyền hình");
  const [isEpgLoading, setIsEpgLoading] = useState(false);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const shakaPlayerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const activeEpgRef = useRef(null);
  const tabsContainerRef = useRef(null);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  const [isBuffering, setIsBuffering] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const clockRef = useRef(null);
  const [playPauseTrigger, setPlayPauseTrigger] = useState(null);
  const triggerTimeoutRef = useRef(null);
  const [todayStr, setTodayStr] = useState("Hôm nay");
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const loadTimeoutRef = useRef(null);
  const bufferingTimeoutRef = useRef(null);

  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("truyenhinh_code_unlocked") === "true";
    }
    return false;
  });
  const [codeDigits, setCodeDigits] = useState(["", "", "", ""]);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDigitChange = (index, val) => {
    if (val && !/^[0-9]$/.test(val)) return;
    const newDigits = [...codeDigits];
    newDigits[index] = val;
    setCodeDigits(newDigits);
    setErrorMsg("");

    if (val && index < 3) {
      const nextInput = document.getElementById(`code-digit-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      const prevInput = document.getElementById(`code-digit-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        const newDigits = [...codeDigits];
        newDigits[index - 1] = "";
        setCodeDigits(newDigits);
      }
    }
  };

  const handleVerifyCode = () => {
    const inputCode = codeDigits.join("");
    if (inputCode.length < 4) {
      setErrorMsg("Vui lòng nhập đầy đủ 4 chữ số.");
      return;
    }
    if (inputCode === (process.env.NEXT_PUBLIC_ACCESS_CODE || "2512")) {
      localStorage.setItem("truyenhinh_code_unlocked", "true");
      setIsUnlocked(true);
      setErrorMsg("");
    } else {
      setErrorMsg("Mã kích hoạt không chính xác. Vui lòng thử lại.");
      setCodeDigits(["", "", "", ""]);
      const firstInput = document.getElementById("code-digit-0");
      if (firstInput) firstInput.focus();
    }
  };

  // Sync play, pause and volume state from HTML5 native events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const resetPlaybackError = () => {
      setHasPlaybackError(false);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };

    const triggerLoadingTimeout = () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = setTimeout(() => {
        if (video.paused || video.readyState < 3) {
          setHasPlaybackError(true);
          if (bufferingTimeoutRef.current) clearTimeout(bufferingTimeoutRef.current);
          setIsBuffering(false);
        }
      }, 7000); // 7 seconds timeout to load/buffer
    };

    const showBuffering = () => {
      if (bufferingTimeoutRef.current) clearTimeout(bufferingTimeoutRef.current);
      bufferingTimeoutRef.current = setTimeout(() => {
        setIsBuffering(true);
      }, 500); // Only show spinner if buffering lasts more than 500ms
    };

    const hideBuffering = () => {
      if (bufferingTimeoutRef.current) clearTimeout(bufferingTimeoutRef.current);
      setIsBuffering(false);
    };

    const onPlay = () => {
      setIsPlaying(true);
      setPlayPauseTrigger("play");
      if (triggerTimeoutRef.current) clearTimeout(triggerTimeoutRef.current);
      triggerTimeoutRef.current = setTimeout(() => setPlayPauseTrigger(null), 800);
      if (video.readyState < 3) {
        triggerLoadingTimeout();
      }
    };
    const onPause = () => {
      setIsPlaying(false);
      setPlayPauseTrigger("pause");
      if (triggerTimeoutRef.current) clearTimeout(triggerTimeoutRef.current);
      triggerTimeoutRef.current = setTimeout(() => setPlayPauseTrigger(null), 800);
    };
    const onVolumeChange = () => {
      setIsMuted(video.muted);
      setVolume(video.volume);
    };

    const onWaiting = () => {
      showBuffering();
      triggerLoadingTimeout();
    };
    const onSeeking = () => {
      showBuffering();
      triggerLoadingTimeout();
    };
    const onLoadStart = () => {
      // Show buffering immediately on new stream load
      if (bufferingTimeoutRef.current) clearTimeout(bufferingTimeoutRef.current);
      setIsBuffering(true);
      resetPlaybackError();
      triggerLoadingTimeout();
    };

    const onPlaying = () => {
      hideBuffering();
      resetPlaybackError();
    };
    const onSeeked = () => {
      hideBuffering();
      resetPlaybackError();
    };
    const onCanPlay = () => {
      hideBuffering();
      resetPlaybackError();
    };
    const onLoadedData = () => {
      hideBuffering();
      resetPlaybackError();
    };
    const onError = () => {
      hideBuffering();
      setHasPlaybackError(true);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("loadstart", onLoadStart);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("loadstart", onLoadStart);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("error", onError);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      if (bufferingTimeoutRef.current) clearTimeout(bufferingTimeoutRef.current);
    };
  }, []);

  // Autohide controls on inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (triggerTimeoutRef.current) {
        clearTimeout(triggerTimeoutRef.current);
      }
    };
  }, []);

  // Controls Event handlers
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      // For live streams: seek to live edge before resuming so user sees current broadcast
      if (hlsRef.current) {
        hlsRef.current.startLoad();
        const livePos = hlsRef.current.liveSyncPosition;
        if (livePos !== null && livePos !== undefined && isFinite(livePos) && livePos > 0) {
          video.currentTime = livePos;
        } else if (video.seekable && video.seekable.length > 0) {
          video.currentTime = Math.max(0, video.seekable.end(video.seekable.length - 1) - 2);
        }
      } else if (video.seekable && video.seekable.length > 0) {
        // Native HLS (Safari) or Shaka
        video.currentTime = Math.max(0, video.seekable.end(video.seekable.length - 1) - 2);
      }
      video.play().catch(() => { });
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = v;
    video.muted = v === 0;
  };

  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Error going fullscreen:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Sync searchQuery local state if the query parameter changes
  useEffect(() => {
    setSearchQuery(searchParamQuery);
  }, [searchParamQuery]);

  // Set date string
  useEffect(() => {
    // Set date string
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    setTodayStr(`Hôm nay (${day}/${month})`);

    // Clock updater — writes directly to DOM ref to avoid React re-renders every second
    const updateTime = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const timeStr = `${hh}:${mm}`;
      if (clockRef.current) {
        clockRef.current.textContent = timeStr;
      } else {
        setCurrentTime(timeStr);
      }
    };
    updateTime();
    const timeTimer = setInterval(updateTime, 1000);

    // Load favorites
    const savedFavs = localStorage.getItem("truyenhinh_favs");
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {
        console.error(e);
      }
    }

    // Load custom IPTV channels
    const savedCustom = localStorage.getItem("truyenhinh_custom_channels");
    if (savedCustom) {
      try {
        const parsedCustom = JSON.parse(savedCustom);
        if (Array.isArray(parsedCustom) && parsedCustom.length > 0) {
          setChannels([...CHANNELS, ...parsedCustom]);
        }
      } catch (e) {
        console.error(e);
      }
    }

    return () => {
      clearInterval(timeTimer);
    };
  }, []);

  // Update browser tab title when active channel changes
  useEffect(() => {
    if (activeChannel) {
      document.title = `${activeChannel.name} - Truyền Hình Số`;
    }
    return () => {
      document.title = "Truyền Hình Số - Xem IPTV Trực Tuyến";
    };
  }, [activeChannel]);

  // Sync active channel from URL query parameter (?channel=id) for backward compatibility
  useEffect(() => {
    const channelId = searchParams.get("channel");
    if (channelId) {
      const match = channels.find((ch) => ch.id === channelId);
      if (match) {
        setActiveChannel(match);
      }
    }
  }, [searchParams, channels]);

  // Redirect to first channel if no channel ID is in the URL path
  useEffect(() => {
    if (isUnlocked && !initialChannelId && CHANNELS[0]) {
      router.replace(`/truyenhinh/${CHANNELS[0].id}`);
    }
  }, [initialChannelId, router, isUnlocked]);


  // Sync EPG list when active channel changes
  useEffect(() => {
    if (!activeChannel) return;
    setEpgList([]);
    if (!isUnlocked) return;

    const fetchEPG = async () => {
      setIsEpgLoading(true);
      try {
        const res = await fetch(`/api/epg?source=lichphatsong&channel=${activeChannel.id}`);
        if (!res.ok) {
          throw new Error("Không thể tải EPG");
        }
        const data = await res.json();

        if (data.length === 0) {
          setIsEpgLoading(false);
          return;
        }

        const now = new Date();
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

            let formattedTitle = prog.title;
            if (formattedTitle) {
              formattedTitle = formattedTitle.toLowerCase().replace(/(?<=^|[\s:.\-])[a-zàáâãèéêìíòóôõùúýăđĩũơưạ-ỹ]/g, (letter) => letter.toUpperCase());
            }

            return {
              ...prog,
              title: formattedTitle,
              time: `${startTimeStr} - ${endTimeStr}`,
              status,
              startObj: start,
              endObj: end
            };
          })
          .filter((prog) => {
            return prog.startObj < endOfDay && prog.endObj > startOfDay;
          });

        if (updatedData.length > 0) {
          setEpgList(updatedData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsEpgLoading(false);
      }
    };

    fetchEPG();
    // Interval to refresh EPG state every 60 seconds (reduced from 30s to minimize re-renders)
    const interval = setInterval(fetchEPG, 60000);
    return () => clearInterval(interval);
  }, [activeChannel]);

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
  }, [epgList, activeChannel]);


  // Update sliding underline position when active category changes
  useEffect(() => {
    if (!tabsContainerRef.current) return;
    const updateUnderline = () => {
      const activeBtn = tabsContainerRef.current.querySelector(".active-tab-btn");
      if (activeBtn) {
        setUnderlineStyle({
          left: activeBtn.offsetLeft,
          width: activeBtn.offsetWidth,
        });
      }
    };
    // Run immediately
    updateUnderline();

    // Also run on window resize to keep it aligned
    window.addEventListener("resize", updateUnderline);
    return () => window.removeEventListener("resize", updateUnderline);
  }, [activeCategory]);

  // Handle HLS or DASH stream playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeChannel) return;
    if (!isUnlocked) return;

    setHasPlaybackError(false);
    setIsBuffering(true);
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      if (video.paused || video.readyState < 3) {
        setHasPlaybackError(true);
        setIsBuffering(false);
      }
    }, 7000);

    const isDash = activeChannel.url.includes(".mpd") || !!activeChannel.drm;

    let hlsInstance = null;
    let shakaPlayerInstance = null;
    let isCleanedUp = false;

    // NOTE: We no longer stopLoad on pause because for live streams it causes buffer gaps
    // that result in periodic 3s lag/stutter when playback resumes.
    const handlePlay = () => {
      if (hlsInstance) hlsInstance.startLoad();
    };
    const handlePause = () => {
      // Intentionally do nothing — keep loading segments to maintain buffer
    };

    if (isDash) {
      loadShakaPlayer().then(() => {
        if (isCleanedUp) return;

        const shaka = window.shaka;
        if (!shaka) {
          console.error("Shaka Player library failed to load");
          return;
        }

        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) {
          console.error("Browser not supported for Shaka Player");
          return;
        }

        shakaPlayerInstance = new shaka.Player(video);
        shakaPlayerRef.current = shakaPlayerInstance;

        // Configure ClearKey DRM if available
        const clearKeys = parseClearKey(activeChannel.drm);
        if (clearKeys) {
          shakaPlayerInstance.configure({
            drm: {
              clearKeys: clearKeys
            }
          });
        }

        // Add request filter to set required headers for CDN streaming
        shakaPlayerInstance.getNetworkingEngine().registerRequestFilter((type, request) => {
          request.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
          request.headers['Referer'] = new URL(activeChannel.url).origin + '/';
          request.allowCrossSiteCredentials = false;
        });

        const loadShaka = (url) => {
          shakaPlayerInstance.load(url).then(() => {
            video.play().catch((err) => console.log("Shaka play failed:", err));
          }).catch((err) => {
            console.error("Shaka load error:", err);
            // 4001 = VIDEO_ERROR (stale decode session) — destroy and retry once with fresh player
            if ((err.code === 4001 || err.code === 3016) && !isCleanedUp) {
              console.log("Shaka: retrying with fresh player instance...");
              shakaPlayerInstance.destroy().catch(() => { }).finally(() => {
                if (!isCleanedUp) {
                  shakaPlayerInstance = new shaka.Player(video);
                  shakaPlayerRef.current = shakaPlayerInstance;
                  // Re-apply DRM and request filter
                  const ck = parseClearKey(activeChannel.drm);
                  if (ck) shakaPlayerInstance.configure({ drm: { clearKeys: ck } });
                  shakaPlayerInstance.getNetworkingEngine().registerRequestFilter((type, request) => {
                    request.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
                  });
                  shakaPlayerInstance.load(url).then(() => {
                    video.play().catch(() => { });
                  }).catch((e2) => console.error("Shaka retry failed:", e2));
                }
              });
            }
          });
        };
        loadShaka(activeChannel.url);
      });
    } else {
      // Route stream through our server-side API proxy to bypass CORS/UA restrictions
      const proxyUrl = `/api/stream?url=${encodeURIComponent(activeChannel.url)}`;

      if (Hls.isSupported()) {
        hlsInstance = new Hls({
          // Buffer: keep 30s loaded ahead, allow up to 120s max, keep 30s behind
          maxBufferLength: 30,
          maxMaxBufferLength: 120,
          backBufferLength: 30,
          enableWorker: true,
          lowLatencyMode: false,
          // Stay 3 segments behind live edge for stability
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 8,
          // Smooth ABR: use conservative bandwidth estimate to avoid quality switches causing stutter
          abrEwmaDefaultEstimate: 5000000, // 5 Mbps default estimate
          abrBandWidthUpFactor: 0.7,
          abrBandWidthFactor: 0.9,
          // Timeout settings
          manifestLoadingTimeOut: 15000,
          levelLoadingTimeOut: 15000,
          fragLoadingTimeOut: 20000,
        });
        hlsInstance.loadSource(proxyUrl);
        hlsInstance.attachMedia(video);

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch((err) => console.log("Auto-play blocked or failed:", err));
        });

        // Optimize: Stop loading data when video is paused to save requests/bandwidth
        video.addEventListener("play", handlePlay);
        video.addEventListener("pause", handlePause);

        hlsInstance.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("HLS network error, attempting recovery...");
                hlsInstance.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("HLS media error, attempting recovery...");
                hlsInstance.recoverMediaError();
                break;
              default:
                console.log("HLS fatal error, destroying player.");
                hlsInstance.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native fallback (Safari / iOS)
        video.src = proxyUrl;
        video.addEventListener("loadedmetadata", () => {
          video.play().catch((err) => console.log("Native auto-play failed:", err));
        });
      }

      hlsRef.current = hlsInstance;
    }

    // No visibilitychange handler needed — let video keep playing smoothly in background

    // Single unified cleanup function
    return () => {
      isCleanedUp = true;
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      if (shakaPlayerInstance) {
        shakaPlayerInstance.destroy().catch(console.error);
      }
      hlsRef.current = null;
      shakaPlayerRef.current = null;
    };
  }, [activeChannel]);

  // Toggle favorite channel
  const toggleFavorite = (channelId) => {
    const updated = favorites.includes(channelId)
      ? favorites.filter((id) => id !== channelId)
      : [...favorites, channelId];
    setFavorites(updated);
    localStorage.setItem("truyenhinh_favs", JSON.stringify(updated));
  };

  // Filter channels based on search query, category, and tab
  const filteredChannels = channels.filter((ch) => {
    const matchesSearch = ch.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeCategory === "Yêu thích") {
      return matchesSearch && favorites.includes(ch.id);
    }
    if (activeCategory !== "Tất cả") {
      return matchesSearch && ch.group === activeCategory;
    }
    return matchesSearch;
  });

  // Seek to live edge
  const seekToLive = () => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      // Force start loading segments since we might be paused/stopped
      hlsRef.current.startLoad();

      // Try liveSyncPosition first as it is the safest live point calculated by Hls.js
      const livePos = hlsRef.current.liveSyncPosition;
      if (livePos !== null && livePos !== undefined && isFinite(livePos) && livePos > 0) {
        video.currentTime = livePos;
      } else if (video.seekable && video.seekable.length > 0) {
        // Fallback to end of seekable range minus 2 seconds to avoid freeze/buffering
        const target = Math.max(0, video.seekable.end(video.seekable.length - 1) - 2);
        video.currentTime = target;
      } else {
        video.currentTime = video.duration || 0;
      }
    } else {
      // Native HLS (Safari/iOS)
      if (video.seekable && video.seekable.length > 0) {
        const target = Math.max(0, video.seekable.end(video.seekable.length - 1) - 2);
        video.currentTime = target;
      } else {
        video.currentTime = video.duration || 0;
      }
    }

    // Ensure it's playing
    if (video.paused) {
      video.play().catch((err) => console.log("Play failed on seekToLive:", err));
    }
  };

  const activeProgram = epgList.find((prog) => prog.status === "live") || {
    title: isEpgLoading ? "Đang tải lịch phát sóng..." : "Không có lịch phát sóng cho kênh này",
    time: "--:-- - --:--"
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Main split-screen Dashboard */}
      <main className="main-layout flex-1">
        {/* Left Column: Player & Meta */}
        <section className="video-section">
          <div
            ref={playerContainerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            className="video-container group"
          >
            {isUnlocked ? (
              <>
                <video
                  ref={videoRef}
                  onClick={togglePlay}
                  className="video-element"
                  playsInline
                  crossOrigin="anonymous"
                  muted={isMuted}
                />

                {/* Custom Buffer/Loading overlay */}
                {isBuffering && !hasPlaybackError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                    <div className="w-12 h-12 rounded-full border-[4px] border-t-white border-white/20 animate-spin" />
                  </div>
                )}

                {/* Playback Error overlay (monochrome website logo FPT Play style) */}
                {hasPlaybackError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d12] z-30 select-none">
                    <div className="flex flex-col items-center gap-5 animate-fade-in">
                      <div className="flex items-center gap-4 opacity-[0.16] grayscale contrast-125 brightness-90 select-none pointer-events-none">
                        <img
                          src="/logo.png"
                          alt="Truyền Hình Số Logo"
                          className="w-16 h-16 rounded-2xl"
                        />
                        <span className="text-white font-extrabold text-3xl sm:text-4xl tracking-tight">
                          Truyền Hình
                          <span className="ml-1.5 font-black">Số</span>
                        </span>
                      </div>
                      <span className="text-gray-500 font-bold text-xs sm:text-sm tracking-[0.2em] uppercase select-none mt-2 opacity-90">
                        Kênh hiện tại không khả dụng
                      </span>
                    </div>
                  </div>
                )}

                {/* Big play/pause indicator in the center */}
                {playPauseTrigger && (
                  <div key={playPauseTrigger + Math.random()} className="play-pause-indicator-overlay">
                    {playPauseTrigger === "play" ? (
                      <svg className="w-16 h-16 fill-white stroke-white drop-shadow-xl opacity-95" strokeWidth="2.5" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M8 5.5v13l10-6.5z" />
                      </svg>
                    ) : (
                      <svg className="w-16 h-16 fill-white stroke-white drop-shadow-xl opacity-95" strokeWidth="2.5" strokeLinejoin="round" viewBox="0 0 24 24">
                        <rect x="5" y="4" width="4" height="16" rx="2" />
                        <rect x="15" y="4" width="4" height="16" rx="2" />
                      </svg>
                    )}
                  </div>
                )}

                {/* Custom Control Overlay */}
                <div className={`custom-controls-overlay ${showControls ? "visible" : ""}`}>
                  <div className="controls-row">
                    <div className="controls-left">
                      {/* Play/Pause Button */}
                      <button onClick={togglePlay} className="player-btn text-white" title={isPlaying ? "Tạm dừng" : "Phát"}>
                        {isPlaying ? (
                          <svg className="w-5 h-5 fill-current stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <rect x="5" y="4" width="4" height="16" rx="1.5" />
                            <rect x="15" y="4" width="4" height="16" rx="1.5" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 fill-current stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M8 5.5v13l10-6.5z" />
                          </svg>
                        )}
                      </button>

                      {/* Mute/Volume controls (Horizontal Capsule Pill) */}
                      <div className="volume-container">
                        <button
                          onClick={toggleMute}
                          className="volume-btn-inner"
                          title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                        >
                          {isMuted || volume === 0 ? (
                            <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M11 5L6 9H2v6h4l5 4V5z" />
                              <line x1="22" y1="9" x2="16" y2="15" />
                              <line x1="16" y1="9" x2="22" y2="15" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M11 5L6 9H2v6h4l5 4V5z" />
                              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            </svg>
                          )}
                        </button>

                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="horizontal-slider"
                          style={{
                            background: `linear-gradient(to right, #ffffff ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.3) ${(isMuted ? 0 : volume) * 100}%)`
                          }}
                        />
                      </div>

                      {/* Red dot and LIVE text */}
                      <button
                        onClick={seekToLive}
                        className="live-indicator select-none"
                        title="Chuyển đến phát trực tiếp"
                      >
                        <span className="live-dot"></span>
                        <span>LIVE</span>
                      </button>
                    </div>

                    <div className="controls-right">
                      {/* PiP Button */}
                      <button
                        onClick={() => {
                          if (document.pictureInPictureElement) {
                            document.exitPictureInPicture().catch(console.error);
                          } else if (videoRef.current) {
                            videoRef.current.requestPictureInPicture().catch(console.error);
                          }
                        }}
                        className="player-btn text-white"
                        title="Hình trong hình"
                      >
                        <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <rect x="2" y="3" width="20" height="18" rx="4" />
                          <rect x="13" y="12" width="7" height="7" rx="2" />
                        </svg>
                      </button>

                      {/* Aspect Ratio Button */}
                      <button
                        onClick={() => {
                          const video = videoRef.current;
                          if (!video) return;
                          // Toggle object-fit between contain and cover
                          if (video.style.objectFit === "cover") {
                            video.style.objectFit = "contain";
                          } else {
                            video.style.objectFit = "cover";
                          }
                        }}
                        className="player-btn text-white"
                        title="Tỷ lệ màn hình"
                      >
                        <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <rect x="3" y="4" width="18" height="16" rx="3.5" />
                          <line x1="15" y1="4" x2="15" y2="20" />
                        </svg>
                      </button>

                      {/* Fullscreen Button */}
                      <button onClick={toggleFullscreen} className="player-btn text-white" title="Toàn màn hình">
                        {isFullscreen ? (
                          <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M8 4v4H4M16 4v4h4M8 20v-4H4M16 20v-4h4" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d12] px-6 text-center select-none z-10 border border-[#22222b] rounded-2xl overflow-hidden">
                {/* Netflix-like Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#00d4ff] opacity-[0.03] blur-[80px] rounded-full pointer-events-none" />
                
                <div className="max-w-md w-full z-10 flex flex-col items-center">
                  {/* Lock Icon with cyan pulse */}
                  <div className="w-16 h-16 rounded-full bg-[#16161f] border border-[#22222b] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(0,212,255,0.05)]">
                    <svg className="w-8 h-8 text-[#00d4ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2 tracking-tight">
                    Nhập mã để kích hoạt dịch vụ
                  </h3>
                  <p className="text-gray-400 text-sm mb-8 leading-relaxed max-w-sm">
                    Vui lòng nhập CODE để kích hoạt dịch vụ truyền hình số.
                  </p>

                  {/* Netflix-style Pin Input Blocks */}
                  <div className="flex gap-3 justify-center mb-8">
                    {[0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        id={`code-digit-${index}`}
                        type="text"
                        maxLength="1"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        value={codeDigits[index] || ""}
                        onChange={(e) => handleDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(index, e)}
                        className="w-14 h-18 text-center text-3xl font-black bg-[#121216] border-2 border-[#2b2b36] rounded-xl text-white outline-none focus:border-[#00d4ff] focus:bg-[#16161f] transition-all"
                        placeholder="-"
                      />
                    ))}
                  </div>

                  {errorMsg && (
                    <div className="text-red-500 text-sm font-semibold mb-6 animate-pulse">
                      {errorMsg}
                    </div>
                  )}

                  <button
                    onClick={handleVerifyCode}
                    className="w-full py-3.5 bg-gradient-to-r from-[#00b4d8] to-[#00d4ff] hover:brightness-110 active:scale-[0.98] text-black font-extrabold text-sm rounded-xl transition-all shadow-[0_4px_20px_rgba(0,212,255,0.25)]"
                  >
                    Kích hoạt dịch vụ
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Under-player channel details */}
          {isUnlocked && (
            <div className="bg-[#121216] border border-[#22222b] rounded-2xl p-5 flex items-center justify-between">
              {activeChannel ? (
                <>
                  <div className="flex items-center gap-4">
                    <img
                      src={activeChannel.altLogo}
                      alt={activeChannel.name}
                      onError={(e) => {
                        if (!e.target.dataset.triedFallback && activeChannel.logo !== activeChannel.altLogo) {
                          e.target.dataset.triedFallback = "true";
                          e.target.src = activeChannel.logo;
                        } else {
                          e.target.onerror = null;
                          e.target.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                        }
                      }}
                      className="h-12 w-16 object-cover rounded-lg border border-[#22222b]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-400 font-medium tracking-wide">
                        {activeProgram.time}
                      </div>
                      <h2 className="text-sm sm:text-base font-bold text-white mt-0.5 truncate pr-4">
                        {activeProgram.title && activeProgram.title.toUpperCase() === activeProgram.title
                          ? activeProgram.title.toLowerCase().replace(/(?<=^|[\s:.\-])[a-zàáâãèéêìíòóôõùúýăđĩũơưạ-ỹ]/g, (letter) => letter.toUpperCase())
                          : activeProgram.title}
                      </h2>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleFavorite(activeChannel.id)}
                    className="flex-shrink-0 flex items-center gap-2 bg-[#1b1b22] border border-[#2b2b36] hover:bg-[#252530] text-gray-200 hover:text-white px-4 py-2 rounded-xl transition-all whitespace-nowrap"
                  >
                    <svg
                      className={`h-5 w-5 ${favorites.includes(activeChannel.id) ? "text-red-500 fill-current" : "text-gray-400"}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="text-sm font-semibold hidden sm:inline">
                      {favorites.includes(activeChannel.id) ? "Đã yêu thích" : "Thêm vào yêu thích"}
                    </span>
                  </button>
                </>
              ) : (
                <div className="text-gray-400 text-sm">Chưa có kênh nào được chọn</div>
              )}
            </div>
          )}
        </section>

        {/* Right Column: EPG Sidebar */}
        <section className="epg-sidebar">
          <div className="epg-header flex items-center justify-between">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Lịch phát sóng
            </h3>

            <select className="epg-date-select">
              <option>{todayStr}</option>
            </select>
          </div>

          <div className="epg-list-container relative">
            {isEpgLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#121216]/60 backdrop-blur-sm z-30">
                <div className="w-8 h-8 border-3 border-t-[#00d4ff] border-gray-700 rounded-full animate-spin" />
                <span className="text-[10px] text-gray-400 mt-2 font-medium">Đang tải lịch...</span>
              </div>
            )}
            {(epgList.length === 0 || !isUnlocked) && !isEpgLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-xs py-10 px-4 text-center">
                Không có dữ liệu lịch phát sóng
              </div>
            )}
            {isUnlocked && epgList.map((prog) => {
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

              let finalTitle = prog.title;
              if (finalTitle) {
                finalTitle = finalTitle.toLowerCase().replace(/(?<=^|[\s:.\-])[a-zàáâãèéêìíòóôõùúýăđĩũơưạ-ỹ]/g, (letter) => letter.toUpperCase());
              }

              const hasAnnoyingDesc = prog.desc && (prog.desc.includes("thời lượng") || prog.desc.includes("Chương trình này"));
              let cleanDesc = (prog.desc && !hasAnnoyingDesc) ? prog.desc : "";
              if (cleanDesc) {
                cleanDesc = cleanDesc.toLowerCase().replace(/(?<=^|[\s:.\-])[a-zàáâãèéêìíòóôõùúýăđĩũơưạ-ỹ]/g, (letter) => letter.toUpperCase());
              }
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
        </section>
      </main>

      {/* Category / Filter Menu */}
      <div style={{ width: '100%', padding: '40px 24px 8px 24px' }}>
        <div ref={tabsContainerRef} className="relative flex justify-start gap-8 overflow-x-auto pb-1.5 scrollbar-none">
          {(isUnlocked 
            ? ["Tất cả các kênh", "Kênh yêu thích", ...Array.from(new Set(channels.map((ch) => ch.group).filter(Boolean)))]
            : ["Tất cả các kênh", "Kênh yêu thích"]
          ).map((cat) => {
            const isSelected = (cat === "Tất cả các kênh" && activeCategory === "Tất cả") ||
              (cat === "Kênh yêu thích" && activeCategory === "Yêu thích") ||
              (activeCategory === cat);
            return (
              <button
                key={cat}
                onClick={() => {
                  if (cat === "Tất cả các kênh") setActiveCategory("Tất cả");
                  else if (cat === "Kênh yêu thích") setActiveCategory("Yêu thích");
                  else setActiveCategory(cat);
                }}
                className={`relative pb-1.5 text-base font-semibold transition-all whitespace-nowrap cursor-pointer ${isSelected ? "text-white active-tab-btn" : "text-gray-400 hover:text-white"
                  }`}
              >
                {cat}
              </button>
            );
          })}
          {/* Dynamic Sliding Underline */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${underlineStyle.left}px`,
              width: `${underlineStyle.width}px`,
              height: '2.5px',
              backgroundColor: '#00d4ff',
              borderRadius: '9999px',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </div>
      </div>

      {/* Channels Grid */}
      <section className="channels-grid px-6 pb-12">
        {isUnlocked ? (
          filteredChannels.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center min-h-[450px] text-gray-400">
              <div className="relative mb-4 flex items-center justify-center">
                {/* Glowing gradient background blur */}
                <div className="absolute bg-[#00d4ff] opacity-10 blur-2xl rounded-full w-24 h-24" />

                {/* Modern TV Screen with no signal/empty indicator */}
                <svg className="w-16 h-16 text-gray-500 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10M12 17v4m-8-4h16a2 2 0 002-2V5a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3" d="M8 8h8M8 12h5" />
                </svg>
              </div>
              <span className="text-base font-medium">Không có kênh nào trong mục này</span>
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const isActive = activeChannel.id === channel.id;
              return (
                <div
                  key={channel.id}
                  onClick={() => {
                    if (isActive) return;
                    setActiveChannel(channel);
                    router.push(`/truyenhinh/${channel.id}`, { scroll: false });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`flex flex-col gap-3 group/card ${isActive ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {/* Card container with background graphic */}
                  <div className={`relative aspect-[16/9] bg-[#16161c] rounded-xl border-2 flex items-center justify-center overflow-hidden transition-all duration-300 ${isActive
                    ? "border-[#00d4ff]"
                    : "border-transparent hover:border-[#3a3a47]"
                    }`}>
                    {/* Background graphic (diagonal waves/lines typical of premium cards) */}
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.03)_50%,rgba(255,255,255,0.03)_75%,transparent_75%,transparent)] bg-[size:40px_40px] opacity-40 pointer-events-none" />

                    {/* Channel Logo (using altLogo as primary for faster loading) */}
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
                      className={`w-full h-full object-cover z-10 transition-all duration-300 group-hover/card:scale-105 ${isActive ? "brightness-50" : ""}`}
                    />

                    {/* Active overlay with equalizer icon */}
                    {isActive && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center">
                        <div className="flex items-end gap-[3px] h-6">
                          <span className="w-[4px] rounded-full bg-[#00d4ff]" style={{ animation: 'eq-bar 0.8s ease-in-out infinite', height: '60%' }} />
                          <span className="w-[4px] rounded-full bg-[#00d4ff]" style={{ animation: 'eq-bar 0.8s ease-in-out infinite 0.2s', height: '100%' }} />
                          <span className="w-[4px] rounded-full bg-[#00d4ff]" style={{ animation: 'eq-bar 0.8s ease-in-out infinite 0.4s', height: '40%' }} />
                          <span className="w-[4px] rounded-full bg-[#00d4ff]" style={{ animation: 'eq-bar 0.8s ease-in-out infinite 0.1s', height: '80%' }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Channel Name */}
                  <span className={`text-sm font-semibold transition-all duration-300 pl-1 ${isActive ? "text-[#00d4ff]" : "text-gray-200 group-hover/card:text-white"
                    }`}>
                    {channel.name}
                  </span>
                </div>
              );
            })
          )
        ) : (
          /* Skeleton Loading Cards */
          Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-3">
              <div className="relative aspect-[16/9] bg-[#121216] border border-[#22222b] rounded-xl overflow-hidden flex items-center justify-center">
                {/* pulsing shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full animate-[pulse_1.5s_infinite]" />

              </div>
              {/* skeleton text name */}
              <div className="h-4 bg-[#121216] rounded-md w-1/2 animate-pulse pl-1 border border-[#22222b]/30" />
            </div>
          ))
        )}
      </section>


    </div>
  );
}
