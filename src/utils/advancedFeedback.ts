import type { FeedbackPin } from "@/types/audition";
import type { MediaVideoType } from "@/types/media";

export function storedVideoDurationMs(raw: string): number | null {
  const value = raw.trim();
  let seconds: number;
  if (/^[0-9]+(?:\.[0-9]+)?$/.test(value)) seconds = Number(value);
  else if (/^[0-9]+:[0-5][0-9](?::[0-9]{2,3})?$/.test(value)) {
    const [minutes, secs, fraction = 0] = value.split(":").map(Number);
    if (fraction > 100) return null;
    seconds = minutes * 60 + secs + fraction / 100;
  } else return null;
  const ms = seconds * 1000;
  const rounded = Math.round(ms);
  return Number.isSafeInteger(rounded) && rounded > 0 && Math.abs(ms - rounded) < 0.000001 ? rounded : null;
}

export function validateFeedbackPins(pins: FeedbackPin[], videos: MediaVideoType[]): string | null {
  if (pins.length > 100) return "영상 피드백은 최대 100개까지 작성할 수 있어요.";
  for (const pin of pins) {
    const video = videos.find(v => v.videoId === pin.videoId);
    const duration = video && storedVideoDurationMs(video.videoDuration);
    if (!duration) return "영상의 저장된 길이를 확인할 수 없어요. 다른 영상을 선택해 주세요.";
    if (!Number.isSafeInteger(pin.positionMs) || pin.positionMs < 0 || pin.positionMs >= duration) return "피드백 시점은 0초 이상, 영상 길이 미만이어야 해요.";
    if (!pin.message.trim() || pin.message.trim().length > 2000) return "영상 피드백 내용을 1~2000자로 입력해 주세요.";
  }
  return null;
}

export function feedbackSecondsToMs(value: string): number | null {
  if (!/^[0-9]+(?:\.[0-9]{1,3})?$/.test(value.trim())) return null;
  const ms = Math.round(Number(value) * 1000);
  return Number.isSafeInteger(ms) ? ms : null;
}

/** Composer time uses minutes:seconds; API payloads remain integer milliseconds. */
export function feedbackTimestampToMs(value: string): number | null {
  const match = /^([0-9]+):([0-5][0-9])$/.exec(value.trim());
  if (!match) return null;
  const ms = (Number(match[1]) * 60 + Number(match[2])) * 1000;
  return Number.isSafeInteger(ms) ? ms : null;
}

export function formatFeedbackTimestamp(ms: number): string {
  return `${Math.floor(ms / 60000)}:${String(Math.floor(ms % 60000 / 1000)).padStart(2, "0")}`;
}

/** Preserve source indexes so editing sorted/filtered timeline rows updates the right pin. */
export function chronologicalFeedbackPins(pins: FeedbackPin[], videoId?: number): { pin: FeedbackPin; index: number }[] {
  return pins.map((pin, index) => ({ pin, index }))
    .filter(({ pin }) => videoId === undefined || pin.videoId === videoId)
    .sort((a, b) => a.pin.positionMs - b.pin.positionMs || a.index - b.index);
}

/** New pins use insertion order; persisted pins use their generated IDs, regardless of API time sorting. */
export function newestFeedbackPins(pins: FeedbackPin[], videoId?: number): { pin: FeedbackPin; index: number }[] {
  return pins.map((pin, index) => ({ pin, index }))
    .filter(({ pin }) => videoId === undefined || pin.videoId === videoId)
    .sort((a, b) => {
      if (a.pin.id == null && b.pin.id == null) return b.index - a.index;
      if (a.pin.id == null) return -1;
      if (b.pin.id == null) return 1;
      return b.pin.id - a.pin.id || b.index - a.index;
    });
}
