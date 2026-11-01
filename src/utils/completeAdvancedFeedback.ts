interface SubmissionSnapshot {
  id: number;
  version?: number;
  submittedAt?: string | null;
  publishedAt?: string | null;
}

export class FeedbackSaveOutcomeUnknownError extends Error {
  constructor() {
    super("신규 저장 결과를 확인하지 못했어요. 중복 생성을 막기 위해 다시 저장하지 않습니다. 입력 내용은 유지됩니다. 아래 목록에서 저장된 피드백을 확인하고 해당 카드의 수정을 눌러 주세요.");
    this.name = "FeedbackSaveOutcomeUnknownError";
  }
}

export class FeedbackSubmittedContentChangedError extends Error {
  constructor() {
    super("앞선 요청은 이미 작성 완료됐어요. 이후 변경한 내용은 제출되지 않았으며 입력란에 유지됩니다. 필요한 내용을 복사한 뒤 아래 카드에서 완료된 내용을 확인해 주세요.");
    this.name = "FeedbackSubmittedContentChangedError";
  }
}

interface FeedbackContent {
  textReview: string;
  itemScores?: { feedbackItemId: number; score: number }[];
  pins?: { videoId: number; positionMs: number; message: string }[];
}

/** IDs and API ordering do not change authored content. */
export function advancedFeedbackContentMatches(a: FeedbackContent, b: FeedbackContent): boolean {
  const normalize = (content: FeedbackContent) => ({
    textReview: content.textReview.trim(),
    itemScores: (content.itemScores ?? []).map(({ feedbackItemId, score }) => ({ feedbackItemId, score })).sort((x, y) => x.feedbackItemId - y.feedbackItemId),
    pins: (content.pins ?? []).map(({ videoId, positionMs, message }) => ({ videoId, positionMs, message: message.trim() })).sort((x, y) => x.videoId - y.videoId || x.positionMs - y.positionMs || x.message.localeCompare(y.message)),
  });
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

/** Keep the saved identity before submit, so retry cannot create a second feedback. */
export async function completeAdvancedFeedback<T extends SubmissionSnapshot>({ existing, pendingSubmission, createBlocked, hasUnsavedChanges, save, submit, recover, onSaved }: {
  existing?: T;
  pendingSubmission?: boolean;
  createBlocked?: boolean;
  hasUnsavedChanges?: (saved: T) => boolean;
  save: (existing?: T) => Promise<T>;
  submit: (saved: T) => Promise<T>;
  recover: (id: number) => Promise<T | undefined>;
  onSaved: (saved: T) => void;
}): Promise<T> {
  if (createBlocked && !existing) throw new FeedbackSaveOutcomeUnknownError();
  const confirmedSubmission = (latest: T): T => {
    if (hasUnsavedChanges?.(latest)) throw new FeedbackSubmittedContentChangedError();
    return latest;
  };
  if (pendingSubmission && existing) {
    const latest = await recover(existing.id);
    if (!latest) throw new Error("저장된 피드백을 확인하지 못했어요. 잠시 후 작성 완료를 다시 눌러 주세요.");
    if (latest.submittedAt || latest.publishedAt) return confirmedSubmission(latest);
    existing = latest;
    onSaved(latest);
  }
  let saved: T;
  try {
    saved = await save(existing);
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : undefined;
    if (!existing && ![400, 401, 403, 404, 409, 422].includes(status ?? 0)) throw new FeedbackSaveOutcomeUnknownError();
    throw error;
  }
  onSaved(saved);
  try {
    return await submit(saved);
  } catch {
    let latest: T | undefined;
    try { latest = await recover(saved.id); } catch { /* Retain the last confirmed saved identity. */ }
    if (latest?.submittedAt || latest?.publishedAt) return confirmedSubmission(latest);
    if (latest) onSaved(latest);
    throw new Error("내용은 저장됐지만 작성 완료를 확인하지 못했어요. 작성 중인 내용은 유지됩니다. ‘작성 완료’를 다시 눌러 주세요.");
  }
}
