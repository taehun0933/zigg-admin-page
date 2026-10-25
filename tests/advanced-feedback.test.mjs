import assert from "node:assert/strict";
import { test } from "node:test";
import { feedbackSecondsToMs, storedVideoDurationMs, validateFeedbackPins } from "../src/utils/advancedFeedback.ts";

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
