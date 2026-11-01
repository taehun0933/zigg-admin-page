import assert from "node:assert/strict";
import { test } from "node:test";
import { advancedFeedbackContentMatches, completeAdvancedFeedback, FeedbackSaveOutcomeUnknownError, FeedbackSubmittedContentChangedError } from "../src/utils/completeAdvancedFeedback.ts";

test("one completion saves then submits with returned identity and version", async () => {
  const events = [];
  const saved = { id: 41, version: 3 };
  const submitted = { ...saved, version: 4, submittedAt: "submitted" };
  const result = await completeAdvancedFeedback({
    existing: { id: 41, version: 2 },
    save: async current => { events.push(["save", current.id, current.version]); return saved; },
    onSaved: current => events.push(["retained", current.id, current.version]),
    submit: async current => { events.push(["submit", current.id, current.version]); return submitted; },
    recover: async () => { assert.fail("success must not need recovery"); },
  });
  assert.equal(result, submitted);
  assert.deepEqual(events, [["save", 41, 2], ["retained", 41, 3], ["submit", 41, 3]]);
});

test("save failure does not submit or claim a saved identity", async () => {
  await assert.rejects(completeAdvancedFeedback({
    save: async () => { throw Object.assign(new Error("save failed"), { status: 400 }); },
    onSaved: () => assert.fail("nothing was saved"),
    submit: async () => assert.fail("must not submit"),
    recover: async () => assert.fail("no saved identity to recover"),
  }), /save failed/);
});

test("submission failure keeps saved id and retry updates that feedback with latest version", async () => {
  let retained;
  let existing;
  let firstSubmit = true;
  let savedVersion = 7;
  const calls = [];
  const run = () => completeAdvancedFeedback({
    existing,
    pendingSubmission: !!existing,
    save: async current => { calls.push(["save", current?.id, current?.version]); return { id: 77, version: savedVersion++ }; },
    onSaved: current => { retained = current; },
    submit: async current => {
      calls.push(["submit", current.id, current.version]);
      if (firstSubmit) { firstSubmit = false; throw new Error("submit failed"); }
      return { ...current, submittedAt: "submitted" };
    },
    recover: async id => { calls.push(["recover", id]); return retained; },
  });
  await assert.rejects(run(), /내용은 저장됐지만/);
  assert.deepEqual(retained, { id: 77, version: 7 });
  existing = retained;
  assert.equal((await run()).submittedAt, "submitted");
  assert.deepEqual(calls.filter(call => call[0] === "save"), [["save", undefined, undefined], ["save", 77, 7]]);
  assert.deepEqual(calls.filter(call => call[0] === "submit"), [["submit", 77, 7], ["submit", 77, 8]]);
});

test("lost submit response reconciles a published result without duplicate save or submit", async () => {
  const published = { id: 81, version: 5, submittedAt: "submitted", publishedAt: "published" };
  const result = await completeAdvancedFeedback({
    save: async () => ({ id: 81, version: 4 }),
    onSaved: () => {},
    submit: async () => { throw new Error("response lost"); },
    recover: async id => { assert.equal(id, 81); return published; },
  });
  assert.equal(result, published);
  const retried = await completeAdvancedFeedback({
    existing: { id: 81, version: 4 }, pendingSubmission: true,
    save: async () => assert.fail("must not save a feedback already submitted"),
    onSaved: () => {},
    submit: async () => assert.fail("must not submit twice"),
    recover: async () => published,
  });
  assert.equal(retried, published);
});

test("uncertain pending submission blocks writes until its current server state is known", async () => {
  await assert.rejects(completeAdvancedFeedback({
    existing: { id: 91, version: 2 }, pendingSubmission: true,
    save: async () => assert.fail("must not write before reconciliation"),
    onSaved: () => {},
    submit: async () => assert.fail("must not submit before reconciliation"),
    recover: async () => { throw new Error("offline"); },
  }), /offline/);
});

test("lost create response blocks another create until the UI explicitly resolves it", async () => {
  let creates = 0;
  const options = {
    save: async () => { creates++; throw new Error("response lost after commit"); },
    onSaved: () => assert.fail("unknown saved identity"),
    submit: async () => assert.fail("must not submit unknown feedback"),
    recover: async () => assert.fail("must not guess which saved feedback is ours"),
  };
  await assert.rejects(completeAdvancedFeedback(options), FeedbackSaveOutcomeUnknownError);
  await assert.rejects(completeAdvancedFeedback({ ...options, createBlocked: true }), FeedbackSaveOutcomeUnknownError);
  assert.equal(creates, 1);
});

test("completed pending request does not discard later local edits", async () => {
  let saves = 0;
  let retained = { id: 101, version: 3, textReview: "saved" };
  await assert.rejects(completeAdvancedFeedback({
    existing: retained, pendingSubmission: true,
    hasUnsavedChanges: latest => latest.textReview !== "local changes",
    save: async () => { saves++; return retained; },
    submit: async () => assert.fail("already submitted"),
    recover: async () => ({ ...retained, submittedAt: "submitted", publishedAt: "published" }),
    onSaved: value => { retained = value; },
  }), FeedbackSubmittedContentChangedError);
  assert.equal(saves, 0);
  assert.deepEqual(retained, { id: 101, version: 3, textReview: "saved" });
});

test("content comparison ignores server IDs/order but detects changed text, scores and pins", () => {
  const saved = { textReview: "review", itemScores: [{ feedbackItemId: 2, score: 4 }, { feedbackItemId: 1, score: 5 }], pins: [{ id: 9, videoId: 41, positionMs: 3000, message: "first" }, { id: 10, videoId: 42, positionMs: 1000, message: "second" }] };
  const local = { ...saved, textReview: " review ", itemScores: [...saved.itemScores].reverse(), pins: [...saved.pins].reverse().map(({ id, ...pin }) => pin) };
  assert.equal(advancedFeedbackContentMatches(local, saved), true);
  assert.equal(advancedFeedbackContentMatches({ ...local, textReview: "changed" }, saved), false);
  assert.equal(advancedFeedbackContentMatches({ ...local, pins: local.pins.map((pin, index) => index === 0 ? { ...pin, message: "changed" } : pin) }, saved), false);
  assert.equal(advancedFeedbackContentMatches({ ...local, itemScores: [{ feedbackItemId: 1, score: 1 }] }, saved), false);
});
