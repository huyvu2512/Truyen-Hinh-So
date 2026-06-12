// In-memory cache: Stores the last fetched playlist for each URL
// This prevents repeated identical requests within the same 2-second window
const playlistCache = new Map(); // { url -> { body, timestamp } }
const CACHE_TTL_MS = 2000; // 2 seconds — matches HLS segment duration

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing 'url' parameter", { status: 400 });
  }

  const isPlaylistUrl = targetUrl.includes(".m3u8");

  // --- OPTIMIZATION 1: In-memory cache for playlist files ---
  // If we already fetched this playlist within the last 2 seconds, return cached version
  if (isPlaylistUrl) {
    const cached = playlistCache.get(targetUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return new Response(cached.body, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "X-Cache": "HIT", // Useful for debugging
        },
      });
    }
  }

  try {
    // Dynamically derive Origin/Referer from the target URL
    // This ensures the proxy works with ANY streaming source, not just FPT Play
    const targetOrigin = new URL(targetUrl).origin;
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Origin": targetOrigin,
      "Referer": `${targetOrigin}/`,
    };

    const response = await fetch(targetUrl, {
      headers,
      redirect: "follow",
    });

    if (!response.ok) {
      // --- OPTIMIZATION 2: Serve stale cache on error (avoids blank screen on network blip) ---
      const stale = playlistCache.get(targetUrl);
      if (stale) {
        return new Response(stale.body, {
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "X-Cache": "STALE",
          },
        });
      }
      return new Response(`Failed to fetch stream: ${response.status} ${response.statusText}`, {
        status: response.status,
      });
    }

    const contentType = response.headers.get("content-type") || "";
    const actualUrl = response.url || targetUrl;
    const isMpd = contentType.includes("dash+xml") || contentType.includes("xml") || actualUrl.includes(".mpd");
    const isPlaylist =
      contentType.includes("mpegurl") ||
      contentType.includes("mpegURL") ||
      actualUrl.includes(".m3u8") ||
      isPlaylistUrl;

    if (isMpd) {
      const text = await response.text();
      const resolvedUrl = response.url || targetUrl;
      const baseUrl = resolvedUrl.substring(0, resolvedUrl.lastIndexOf("/") + 1);

      // Rewrite relative URLs in media/initialization attributes to absolute CDN paths
      // This ensures Shaka Player fetches segments directly from the CDN (not through our proxy)
      let modifiedText = text
        // initialization="relative/path" -> initialization="https://cdn/absolute/path"
        .replace(/\binitialization="(?!https?:\/\/)([^"]+)"/g, (match, p1) => {
          return `initialization="${baseUrl}${p1}"`;
        })
        // media="relative/path" -> media="https://cdn/absolute/path"
        .replace(/\bmedia="(?!https?:\/\/)([^"]+)"/g, (match, p1) => {
          return `media="${baseUrl}${p1}"`;
        });

      return new Response(modifiedText, {
        headers: {
          "Content-Type": "application/dash+xml",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Cache-Control": "no-store, no-cache, max-age=0",
        },
      });
    }

    if (isPlaylist) {
      const text = await response.text();
      const actualUrl = response.url || targetUrl;
      const originUrl = new URL(actualUrl);
      
      // Base URL for resolving relative links
      const baseUrl = actualUrl.substring(0, actualUrl.lastIndexOf("/") + 1);

      // Rewrite the playlist lines
      const lines = text.split("\n");
      const requestOrigin = new URL(request.url).origin;

      const rewrittenLines = lines.map((line) => {
        const trimmed = line.trim();
        if (trimmed.length === 0) return line;

        // Keep comment tags, but rewrite any embedded URIs (e.g. EXT-X-KEY)
        if (trimmed.startsWith("#")) {
          return trimmed.replace(/URI="([^"]+)"/g, (match, p1) => {
            const absoluteUri = resolveUrl(p1, baseUrl, originUrl.origin);
            const proxyUri = `${requestOrigin}/api/stream?url=${encodeURIComponent(absoluteUri)}`;
            return `URI="${proxyUri}"`;
          });
        }

        // Sub-playlists (.m3u8) go through the proxy for User-Agent rewriting
        if (trimmed.includes(".m3u8")) {
          const absoluteUrl = resolveUrl(trimmed, baseUrl, originUrl.origin);
          return `${requestOrigin}/api/stream?url=${encodeURIComponent(absoluteUrl)}`;
        }

        // Video segments (.ts) are served directly from CDN — zero Vercel bandwidth!
        const absoluteUrl = resolveUrl(trimmed, baseUrl, originUrl.origin);
        return absoluteUrl;
      });

      const body = rewrittenLines.join("\n");

      // --- OPTIMIZATION 4: Increase EXT-X-TARGETDURATION to slow down HLS polling ---
      // HLS.js reloads the playlist every EXT-X-TARGETDURATION seconds.
      // We bump it from 2s → 6s, reducing API calls by ~3x with no visible quality loss.
      const optimizedBody = body
        .replace(/#EXT-X-TARGETDURATION:\d+/g, "#EXT-X-TARGETDURATION:6")
        .replace(/#EXT-X-MEDIA-SEQUENCE:(\d+)/g, (match, seq) => {
          // Keep sequence numbers accurate (just pass through)
          return match;
        });

      // Store in in-memory cache
      playlistCache.set(targetUrl, { body: optimizedBody, timestamp: Date.now() });

      return new Response(optimizedBody, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=1",
          "X-Cache": "MISS",
        },
      });
    }

    // For TS segments or other binary stream parts (should rarely reach here)
    const data = await response.arrayBuffer();
    return new Response(data, {
      headers: {
        "Content-Type": contentType || "video/MP2T",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    // Serve stale cache if available on exception too
    if (isPlaylistUrl) {
      const stale = playlistCache.get(targetUrl);
      if (stale) {
        return new Response(stale.body, {
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "X-Cache": "STALE-ERROR",
          },
        });
      }
    }
    return new Response(`Internal server error: ${error.message}`, { status: 500 });
  }
}

// Helper to resolve relative paths to absolute URLs
function resolveUrl(urlPath, baseUrl, origin) {
  if (urlPath.startsWith("http://") || urlPath.startsWith("https://")) {
    return urlPath;
  }
  if (urlPath.startsWith("/")) {
    return `${origin}${urlPath}`;
  }
  return `${baseUrl}${urlPath}`;
}
