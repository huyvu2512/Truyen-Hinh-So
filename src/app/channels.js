import vtv from "./channels/vtv.json";
import vtvcab from "./channels/vtvcab.json";
import sctv from "./channels/sctv.json";
import htv from "./channels/htv.json";
import thietyeu from "./channels/thietyeu.json";
import diaphuong from "./channels/diaphuong.json";

export const CHANNELS = [
  ...vtv,
  ...vtvcab,
  ...sctv,
  ...htv,
  ...thietyeu,
  ...diaphuong
];

// Generates dynamic generic schedule programs for a channel based on current local time
export function getMockEPG(channelId) {
  if (!channelId) return [];
  const now = new Date();
  
  // Set to start of today
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const programs = [];
  let currentStart = new Date(startOfDay);

  for (let i = 0; i < 24; i++) {
    const currentEnd = new Date(currentStart);
    currentEnd.setHours(currentEnd.getHours() + 1);

    const startTimeStr = currentStart.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
    const endTimeStr = currentEnd.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });

    // Determine status relative to current time
    let status = "upcoming";
    if (now >= currentStart && now < currentEnd) {
      status = "live";
    } else if (now >= currentEnd) {
      status = "past";
    }

    programs.push({
      id: `${channelId}-prog-${i}`,
      title: `Chương trình ${i + 1}`,
      time: `${startTimeStr} - ${endTimeStr}`,
      start: new Date(currentStart),
      end: new Date(currentEnd),
      status
    });

    currentStart = new Date(currentEnd);
  }

  return programs;
}
