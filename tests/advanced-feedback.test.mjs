import assert from "node:assert/strict";
import { test } from "node:test";
import { chronologicalFeedbackPins, newestFeedbackPins, feedbackSecondsToMs, feedbackTimestampToMs, formatFeedbackTimestamp, storedVideoDurationMs, validateFeedbackPins } from "../src/utils/advancedFeedback.ts";

test("upload duration follows legacy MM:SS:centiseconds and decimal seconds", () => {
  assert.equal(storedVideoDurationMs("01:02:50"), 62500);
  assert.equal(storedVideoDurationMs("00:59:100"), 60000);
  assert.equal(storedVideoDurationMs("1.001"), 1001);
  for (const invalid of ["0", "-1", "00:60:00", "00:59:101", "1.0001", "NaN"]) assert.equal(storedVideoDurationMs(invalid), null);
});

test("manual timestamps preserve milliseconds without floating point rejection", () => {
  assert.equal(feedbackSecondsToMs("1.001"), 1001);
  assert.equal(feedbackSecondsToMs("0"), 0);
  for (const invalid of ["", "-1", "1.0001", "Infinity"]) assert.equal(feedbackSecondsToMs(invalid), null);
});

test("pins bind video IDs and strictly exclude duration endpoint", () => {
  const videos = [{ videoId: 41, videoUrl: "video", videoDuration: "2" }, { videoId: 42, videoUrl: "video2", videoDuration: "3" }];
  const pin = { videoId: 41, positionMs: 1999, message: "좋아요" };
  assert.equal(validateFeedbackPins([pin, { ...pin, videoId: 42, positionMs: 2999 }], videos), null);
  assert.ok(validateFeedbackPins([{ ...pin, positionMs: 2000 }], videos));
  assert.ok(validateFeedbackPins([{ ...pin, videoId: 999 }], videos));
  assert.ok(validateFeedbackPins([{ ...pin, positionMs: 0.1 }], videos));
  assert.ok(validateFeedbackPins([{ ...pin, message: "  " }], videos));
  assert.ok(validateFeedbackPins([{ ...pin, message: "가".repeat(2001) }], videos));
  assert.equal(validateFeedbackPins(Array(100).fill(pin), videos), null);
  assert.ok(validateFeedbackPins(Array(101).fill(pin), videos));
});

test("composer timestamps use minutes:seconds and keep millisecond API values", () => {
  assert.equal(feedbackTimestampToMs("0:00"), 0);
  assert.equal(feedbackTimestampToMs("1:05"), 65000);
  assert.equal(feedbackTimestampToMs("120:59"), 7259000);
  assert.equal(feedbackTimestampToMs(" 01:09 "), 69000);
  for (const invalid of ["", "0", "1:5", "1:60", "-1:00", "1:05.5", "1:01:00", "999999999999999:00"]) assert.equal(feedbackTimestampToMs(invalid), null);
  assert.equal(formatFeedbackTimestamp(0), "0:00");
  assert.equal(formatFeedbackTimestamp(65999), "1:05");
  assert.equal(formatFeedbackTimestamp(7259000), "120:59");
  assert.equal(feedbackTimestampToMs(formatFeedbackTimestamp(65000)), 65000);
});

test("timeline sorts selected video chronologically without changing source indexes", () => {
  const pins = Object.freeze([
    Object.freeze({ videoId: 41, positionMs: 9000, message: "late" }),
    Object.freeze({ videoId: 42, positionMs: 1000, message: "other video" }),
    Object.freeze({ videoId: 41, positionMs: 3000, message: "first at 3s" }),
    Object.freeze({ videoId: 41, positionMs: 3000, message: "second at 3s" }),
  ]);
  const timeline = chronologicalFeedbackPins(pins, 41);
  assert.deepEqual(timeline.map(row => row.index), [2, 3, 0]);
  assert.deepEqual(timeline.map(row => row.pin.message), ["first at 3s", "second at 3s", "late"]);
  assert.equal(timeline[0].pin, pins[2]);
  assert.deepEqual(chronologicalFeedbackPins(pins).map(row => row.index), [1, 2, 3, 0]);
  assert.deepEqual(chronologicalFeedbackPins(pins, 999), []);
  assert.equal(pins[0].message, "late");
});

test("draft timeline puts newest registration first even when video times are out of order", () => {
  const pins = Object.freeze([
    Object.freeze({ videoId: 41, positionMs: 9000, message: "oldest" }),
    Object.freeze({ videoId: 42, positionMs: 1000, message: "other video" }),
    Object.freeze({ videoId: 41, positionMs: 3000, message: "middle" }),
    Object.freeze({ videoId: 41, positionMs: 1000, message: "newest" }),
  ]);
  const timeline = newestFeedbackPins(pins, 41);
  assert.deepEqual(timeline.map(row => row.index), [3, 2, 0]);
  assert.deepEqual(timeline.map(row => row.pin.message), ["newest", "middle", "oldest"]);
  assert.equal(timeline[0].pin, pins[3]);
  assert.deepEqual(newestFeedbackPins(pins, 999), []);
  assert.equal(pins[0].message, "oldest");
});

test("new draft pins precede persisted pins sorted by generated ID rather than API video time", () => {
  const pins = Object.freeze([
    Object.freeze({ id: 103, videoId: 41, positionMs: 1000, message: "newest saved" }),
    Object.freeze({ id: 100, videoId: 41, positionMs: 3000, message: "oldest saved" }),
    Object.freeze({ id: 102, videoId: 41, positionMs: 9000, message: "middle saved" }),
    Object.freeze({ videoId: 41, positionMs: 8000, message: "first unsaved" }),
    Object.freeze({ videoId: 42, positionMs: 1000, message: "other video" }),
    Object.freeze({ videoId: 41, positionMs: 2000, message: "newest unsaved" }),
  ]);
  const timeline = newestFeedbackPins(pins, 41);
  assert.deepEqual(timeline.map(row => row.index), [5, 3, 0, 2, 1]);
  assert.deepEqual(timeline.map(row => row.pin.message), ["newest unsaved", "first unsaved", "newest saved", "middle saved", "oldest saved"]);
  assert.equal(timeline[0].pin, pins[5]);
  assert.equal(pins[0].message, "newest saved");
});

test("saving all-video pins oldest-first preserves registration order through backend ID reassignment", () => {
  const pins = Object.freeze([
    Object.freeze({ id: 103, videoId: 41, positionMs: 1000, message: "third saved" }),
    Object.freeze({ id: 100, videoId: 42, positionMs: 9000, message: "first saved" }),
    Object.freeze({ id: 102, videoId: 41, positionMs: 3000, message: "second saved" }),
    Object.freeze({ videoId: 42, positionMs: 2000, message: "first new" }),
    Object.freeze({ videoId: 41, positionMs: 1000, message: "second new" }),
  ]);
  assert.deepEqual(newestFeedbackPins(pins).map(row => row.index), [4, 3, 0, 2, 1]);
  const payload = newestFeedbackPins(pins).reverse().map(({ pin: { videoId, positionMs, message } }) => ({ videoId, positionMs, message: message.trim() }));
  assert.deepEqual(payload.map(pin => pin.message), ["first saved", "second saved", "third saved", "first new", "second new"]);
  const reloaded = payload.map((pin, index) => ({ ...pin, id: 200 + index })).sort((a, b) => a.videoId - b.videoId || a.positionMs - b.positionMs);
  assert.deepEqual(newestFeedbackPins(reloaded).map(row => row.pin.message), ["second new", "first new", "third saved", "second saved", "first saved"]);
  assert.deepEqual(pins.map(pin => pin.id), [103, 100, 102, undefined, undefined]);
});
