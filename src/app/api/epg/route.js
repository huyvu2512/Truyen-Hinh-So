import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

// Simple global cache in memory to avoid parsing 6MB XML on every single request
const cache = {
  vnepg: {
    data: null, // Holds the parsed EPG grouped by XML channel ID
    channelNames: {}, // Maps XML channel ID -> array of display names
    lastFetched: 0
  },
  lichphatsong: {
    data: null,
    channelNames: {},
    lastFetched: 0
  }
};

const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

function parseXMLTVDate(dateStr) {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim();
  const year = parseInt(cleanStr.substring(0, 4));
  const month = parseInt(cleanStr.substring(4, 6)) - 1;
  const day = parseInt(cleanStr.substring(6, 8));
  const hour = parseInt(cleanStr.substring(8, 10));
  const minute = parseInt(cleanStr.substring(10, 12));
  const second = parseInt(cleanStr.substring(12, 14)) || 0;

  const tzPart = cleanStr.substring(15).trim();
  let tzOffsetMinutes = 0;
  if (tzPart && tzPart.length >= 5) {
    const sign = tzPart.startsWith("-") ? -1 : 1;
    const tzHours = parseInt(tzPart.substring(1, 3));
    const tzMins = parseInt(tzPart.substring(3, 5));
    tzOffsetMinutes = sign * (tzHours * 60 + tzMins);
  }

  const utcDate = new Date(Date.UTC(year, month, day, hour, minute, second));
  if (tzOffsetMinutes) {
    utcDate.setMinutes(utcDate.getMinutes() - tzOffsetMinutes);
  } else {
    utcDate.setMinutes(utcDate.getMinutes() - 420); // Default to ICT +07:00
  }
  return utcDate;
}

function normalizeChannelName(name) {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .replace(/hd/g, "")
    .replace(/50fps/g, "")
    .replace(/[\s\-_.]/g, ""); // Remove spaces, dots, dashes, underscores
}

function findBestXMLChannelId(requestedId, channelNamesMap) {
  const reqNorm = normalizeChannelName(requestedId);
  if (!reqNorm) return null;
  
  // 1. Exact normalized match on XML Channel ID or display names
  for (const xmlId of Object.keys(channelNamesMap)) {
    const xmlIdNorm = normalizeChannelName(xmlId);
    if (xmlIdNorm === reqNorm) return xmlId;
    
    const displayNames = channelNamesMap[xmlId] || [];
    for (const name of displayNames) {
      if (normalizeChannelName(name) === reqNorm) {
        return xmlId;
      }
    }
  }

  // 2. Substring match (e.g. "vtv5hdtnb" -> norm "vtv5tnb" matches "vtv5 tnb" or "vtv5 tay nam bo")
  for (const xmlId of Object.keys(channelNamesMap)) {
    const xmlIdNorm = normalizeChannelName(xmlId);
    if (xmlIdNorm.includes(reqNorm) || reqNorm.includes(xmlIdNorm)) return xmlId;

    const displayNames = channelNamesMap[xmlId] || [];
    for (const name of displayNames) {
      const nameNorm = normalizeChannelName(name);
      if (nameNorm.includes(reqNorm) || reqNorm.includes(nameNorm)) {
        return xmlId;
      }
    }
  }

  return null;
}

export const dynamic = "force-dynamic";

async function fetchAndParse(source) {
  const url = source === "vnepg" 
    ? "https://vnepg.site/epg.xml" 
    : "https://lichphatsong.site/schedule/epg.xml";

  console.log(`Starting fetch from ${source}: ${url}`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`Fetch timeout triggered for ${source}`);
    controller.abort();
  }, 5000); // 5 seconds timeout

  try {
    // Disable cache on fetch for active testing
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,vi;q=0.8"
      }
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status} from ${source}`);
    }

    console.log(`Successfully downloaded XML from ${source}, parsing...`);
    const xmlText = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    const result = parser.parse(xmlText);

    const tv = result.tv;
    if (!tv) {
      throw new Error("Invalid XMLTV structure");
    }

    const xmlChannels = Array.isArray(tv.channel) ? tv.channel : tv.channel ? [tv.channel] : [];
    const xmlProgrammes = Array.isArray(tv.programme) ? tv.programme : tv.programme ? [tv.programme] : [];

    // Map xml channel ID to all its display names (lowercased)
    const channelNames = {};
    xmlChannels.forEach(ch => {
      const id = ch["@_id"];
      const names = [];
      if (Array.isArray(ch["display-name"])) {
        ch["display-name"].forEach(n => {
          const text = n["#text"] || n;
          if (text) names.push(String(text).trim());
        });
      } else if (ch["display-name"]) {
        const text = ch["display-name"]["#text"] || ch["display-name"];
        if (text) names.push(String(text).trim());
      }
      channelNames[id] = names;
    });

    const parsedEPG = {};

    xmlProgrammes.forEach(prog => {
      const xmlChId = prog["@_channel"];
      if (!parsedEPG[xmlChId]) {
        parsedEPG[xmlChId] = [];
      }

      let title = "";
      if (Array.isArray(prog.title)) {
        title = prog.title[0]["#text"] || prog.title[0];
      } else if (prog.title) {
        title = prog.title["#text"] || prog.title;
      }

      let desc = "";
      if (Array.isArray(prog.desc)) {
        desc = prog.desc[0]["#text"] || prog.desc[0];
      } else if (prog.desc) {
        desc = prog.desc["#text"] || prog.desc;
      }

      const start = parseXMLTVDate(prog["@_start"]);
      const end = parseXMLTVDate(prog["@_stop"]);

      if (title && start && end) {
        parsedEPG[xmlChId].push({
          id: `${xmlChId}-prog-${start.getTime()}`,
          title: String(title).trim(),
          desc: String(desc || "").trim(),
          start: start.toISOString(),
          end: end.toISOString()
        });
      }
    });

    // Sort program lists chronologically
    Object.keys(parsedEPG).forEach(chId => {
      parsedEPG[chId].sort((a, b) => new Date(a.start) - new Date(b.start));
    });

    return {
      data: parsedEPG,
      channelNames
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") || "vnepg";
  const channelId = searchParams.get("channel");

  if (source !== "vnepg" && source !== "lichphatsong") {
    return NextResponse.json({ error: "Invalid source parameter" }, { status: 400 });
  }

  if (!channelId) {
    return NextResponse.json({ error: "Missing channel parameter" }, { status: 400 });
  }

  try {
    const now = Date.now();
    let cached = cache[source];
    
    if (!cached.data || (now - cached.lastFetched > CACHE_DURATION)) {
      console.log(`Cache miss for ${source}, fetching and parsing fresh XML...`);
      const parsed = await fetchAndParse(source);
      cached.data = parsed.data;
      cached.channelNames = parsed.channelNames;
      cached.lastFetched = now;
    } else {
      console.log(`Cache hit for ${source} (Fetched ${Math.round((now - cached.lastFetched) / 1000 / 60)}m ago)`);
    }

    const { data, channelNames } = cached;

    // Dynamically match the requested channelId with XMLTV channels
    const matchedXmlId = findBestXMLChannelId(channelId, channelNames);
    
    if (!matchedXmlId) {
      console.log(`No matching channel found in XMLTV for: ${channelId} in source ${source}`);
      return NextResponse.json([]);
    }

    console.log(`Matched request '${channelId}' to XMLTV Channel: '${matchedXmlId}' using source ${source}`);
    const channelEPG = data[matchedXmlId] || [];
    return NextResponse.json(channelEPG);
  } catch (error) {
    console.error(`Error loading EPG from source ${source}:`, error.message);
    return NextResponse.json({ 
      error: `Failed to download or parse XML EPG from ${source}. Last error: ${error.message}` 
    }, { status: 500 });
  }
}
