"use client";

import { 
  getAuditionFeedbacks, 
  sendApplicationFeedback,
  deleteAuditionFeedback,
  updateAuditionFeedback
} from "@/apis/feedback";
import { AuditionProfileType, AuditionFeedback } from "@/types/audition";
import React, { useMemo, useState, useEffect } from "react";

interface ApplicantDetailModalContentProps {
  applicantInfo: AuditionProfileType | null;
}

const ApplicantDetailModalContent: React.FC<ApplicantDetailModalContentProps> = ({
  applicantInfo
}) => {
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const [feedbacks, setFeedbacks] = useState<AuditionFeedback[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const canSend = useMemo(() => feedbackText.trim().length > 0 && !isSending, [feedbackText, isSending]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isMutating, setIsMutating] = useState(false); // 수정/삭제 진행중 잠금

  useEffect(() => {
  if (!applicantInfo) return;
  refreshFeedbacks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [applicantInfo?.id]);


  if (!applicantInfo) return null;
  const handleSendFeedback = async () => {
  if (!canSend) return;

  // ✅ 전송 확인(OK/Cancel)
  const ok = window.confirm(
    "유저에게 피드백을 보내시겠습니까?\n유저의 기기에 알림이 전송됩니다."
  );
  if (!ok) return;

  try {
    setIsSending(true);
    setSendError(null);
    setSendSuccess(null);

    const status = await sendApplicationFeedback({
      auditionId: applicantInfo.auditionId,
      applicationId: applicantInfo.id,
      textReview: feedbackText.trim(),
    });

    if (status >= 200 && status < 300) {
      setSendSuccess("피드백을 전송했어요.");
      setFeedbackText("");
      await refreshFeedbacks();
    } else {
      setSendError("피드백 전송에 실패했어요. 다시 시도해 주세요.");
    }
  } catch (e: any) {
    setSendError(e?.message ?? "피드백 전송 중 오류가 발생했어요.");
  } finally {
    setIsSending(false);
  }
};

  const refreshFeedbacks = async () => {
    if (!applicantInfo) return;

    try {
      setIsLoadingFeedbacks(true);
      setLoadError(null);

      const data = await getAuditionFeedbacks(applicantInfo.auditionId, applicantInfo.id);
      setFeedbacks(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setLoadError(e?.message ?? "피드백 목록을 불러오지 못했어요.");
    } finally {
      setIsLoadingFeedbacks(false);
    }
  };

  const onClickEdit = (fb: AuditionFeedback) => {
  // ✅ 편집 시작
  setEditingId((fb as any).id);                  // <- 타입에 맞게 fb.id로 바꿔도 됨
  setEditingText((fb as any).textReview ?? "");  // <- 타입에 맞게
};

const onCancelEdit = () => {
  setEditingId(null);
  setEditingText("");
};

const onSaveEdit = async (fb: AuditionFeedback) => {
  const ok = window.confirm("이 피드백을 수정하시겠습니까?");
  if (!ok || !applicantInfo) return;

  const feedbackId = (fb as any).id as number; // 가능하면 fb.id로 바꾸기
  const nextText = editingText.trim();
  if (!feedbackId || nextText.length === 0) return;

  try {
    setIsMutating(true);
    setSendError(null);
    setSendSuccess(null);

    const updated = await updateAuditionFeedback({
      auditionId: applicantInfo.auditionId,
      applicationId: applicantInfo.id,
      feedbackId,
      textReview: nextText,
    });

    // ✅ (옵션1) 서버 응답으로 로컬 state 즉시 반영
    setFeedbacks((prev) =>
      prev.map((x) => ((x as any).id === feedbackId ? updated : x))
    );

    // ✅ (옵션2) 그냥 항상 최신을 다시 땡기고 싶으면 이것만 쓰면 됨
    // await refreshFeedbacks();

    setEditingId(null);
    setEditingText("");
    setSendSuccess("피드백을 수정했어요.");
  } catch (e: any) {
    setSendError(e?.message ?? "피드백 수정 중 오류가 발생했어요.");
  } finally {
    setIsMutating(false);
  }
};
  const onDeleteFeedback = async (fb: AuditionFeedback) => {
  const ok = window.confirm("이 피드백을 삭제하시겠습니까?");
  if (!ok || !applicantInfo) return;

  try {
    setIsMutating(true);
    setSendError(null);

    const feedbackId = (fb as any).id as number; // 타입 맞으면 fb.id로 교체
    const status = await deleteAuditionFeedback(
      applicantInfo.auditionId,
      applicantInfo.id,
      feedbackId
    );

    if (status >= 200 && status < 300) {
      await refreshFeedbacks();
    } else {
      setSendError("피드백 삭제에 실패했어요. 다시 시도해 주세요.");
    }
  } catch (e: any) {
    setSendError(e?.message ?? "피드백 삭제 중 오류가 발생했어요.");
  } finally {
    setIsMutating(false);
  }
};


  return (
    <div className="p-6 space-y-8">
      {/* 전체화면 이미지 확대 */}
      {selectedImage && (
        <div
          className="fixed w-full h-full inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      {/* 상단 프로필 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 왼쪽 프로필 정보 */}
        <div className="bg-gray-100 p-6 rounded-lg space-y-3">
          {/* 프로필 썸네일 */}
          {applicantInfo.images[0] ? (
            <img
              src={applicantInfo.images[0].imageKey}
              alt="Profile Thumbnail"
              className="w-40 h-40 object-cover rounded-md mx-auto mb-4"
            />
          ) : (
            <div className="w-40 h-40 bg-gray-300 rounded-md mx-auto mb-4" />
          )}

          {/* 이름 | 포지션 */}
          <h2 className="text-lg font-bold text-center">
            {applicantInfo.name} | {applicantInfo.desiredPosition}
          </h2>

          {/* 국적 | 성별 */}
          <p className="text-sm text-gray-600 text-center">
            {applicantInfo.nation} | {applicantInfo.gender}
          </p>

          {/* 인스타그램 링크 */}
          {applicantInfo.instagramId ? (
            <p className="text-sm text-blue-500 underline text-center break-words">
              <a
                href={`https://www.instagram.com/${applicantInfo.instagramId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram Link
              </a>
            </p>
          ) : (
            <p className="text-sm text-gray-400 text-center">
              인스타그램 정보 없음
            </p>
          )}

          {/* 키 | 몸무게 | 출생연도 */}
          <p className="mt-4 text-lg font-bold text-center">
            {applicantInfo.height} | {applicantInfo.weight} |{" "}
            {applicantInfo.ageOrYear}년생
          </p>

          {/* 연락처 */}
          <div className="mt-4 text-center">
            <p className="font-semibold">연락처</p>
            <p className="text-sm text-gray-600">
              {applicantInfo.contactInfo || "정보 없음"}
            </p>
          </div>
        </div>

        {/* 오른쪽 자기소개 */}
        <div className="bg-gray-100 p-6 rounded-lg">
          <label className="block text-sm font-semibold mb-2">자기소개</label>
          <textarea
            readOnly
            defaultValue={applicantInfo.introduction}
            className="w-full h-40 p-2 border border-gray-300 rounded resize-none bg-white"
          />
        </div>
      </div>

      {/* 이미지 썸네일 리스트 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">사진</h3>
        {applicantInfo.images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {applicantInfo.images.map((img, i) => (
              <div
                key={i}
                className="aspect-square bg-gray-200 rounded overflow-hidden"
              >
                <img
                  src={img.imageKey}
                  alt={`지원자 이미지 ${i + 1}`}
                  className="object-cover w-full h-full cursor-pointer"
                  onClick={() => setSelectedImage(img.imageKey)}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">등록된 사진이 없습니다.</p>
        )}
      </div>

      {/* 비디오 썸네일 리스트 */}
      <div>
        <h3 className="text-lg font-semibold mb-4 mt-8">비디오</h3>
        {applicantInfo.videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {applicantInfo.videos.map((video, i) => (
              <div
                key={i}
                className="w-full aspect-video bg-gray-200 rounded overflow-hidden"
              >
                <video
                  controls
                  className="w-full h-full object-contain bg-black"
                >
                  <source src={video.videoUrl} />
                  동영상을 지원하지 않는 브라우저입니다.
                </video>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">등록된 비디오가 없습니다.</p>
        )}
        
          {/* ✅ 여기부터: 피드백 작성/전송 UI (비디오 아래) */}
          <div className="mt-8 bg-gray-100 p-6 rounded-lg">
          <h4 className="text-lg font-semibold mb-3">피드백 보내기</h4>

          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="지원자에게 전달할 피드백을 입력해 주세요."
            className="w-full h-32 p-3 border border-gray-300 rounded resize-y bg-white"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSendFeedback}
              disabled={!canSend}
              className={`px-4 py-2 rounded text-white ${
                canSend ? "bg-black hover:bg-black/90" : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {isSending ? "전송 중..." : "피드백 전송"}
            </button>
          </div>
          {!isLoadingFeedbacks && feedbacks.length === 0 && !loadError && (
            <p className="mt-4 text-sm text-gray-500">아직 피드백이 없어요.</p>
          )}

          
{feedbacks.length > 0 && (
  <ul className="mt-4 space-y-3">
    {feedbacks.map((fb, idx) => {
      const id = (fb as any).id as number;                 // <- fb.id로 바꾸면 더 좋음
      const text = ((fb as any).textReview ?? "") as string;

      const isEditing = editingId === id;

      return (
        <li key={id ?? idx} className="border border-gray-200 rounded-lg p-4 bg-white">
          <div className="flex items-start justify-between gap-3">
            {/* 본문 / 수정 textarea */}
            <div className="flex-1 min-w-0">
              {!isEditing ? (
                <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
              ) : (
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  className="w-full min-h-[96px] p-2 border border-gray-300 rounded resize-y bg-white text-sm"
                />
              )}
            </div>

            {/* 우측 버튼들 */}
              <div className="flex items-center gap-2 shrink-0">
                {!isEditing ? (
                  <>
                    {/* 수정(연필) */}
                    <button
                      type="button"
                      onClick={() => onClickEdit(fb)}
                      disabled={isMutating}
                      className="inline-flex items-center justify-center
                                    h-9 w-9 rounded-md
                                    bg-gray-100 text-gray-700
                                    hover:bg-gray-200
                                    disabled:opacity-50
                                    border border-gray-200"
                      aria-label="수정"
                      title="수정"
                    >
                      ✏️
                    </button>

                    {/* 삭제(휴지통) */}
                    <button
                      type="button"
                      onClick={() => onDeleteFeedback(fb)}
                      disabled={isMutating}
                      className="    inline-flex items-center justify-center
                                      h-9 w-9 rounded-md
                                      bg-gray-100 text-gray-600
                                      hover:bg-red-50 hover:text-red-600
                                      disabled:opacity-50
                                      border border-gray-200"
                      aria-label="삭제"
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </>
                ) : (
                  <>
                    {/* 저장 */}
                    <button
                      type="button"
                      onClick={() => onSaveEdit(fb)}
                      disabled={isMutating || editingText.trim().length === 0}
                      className="    inline-flex items-center justify-center
                                      h-9 w-9 rounded-md
                                      bg-gray-100 text-gray-700
                                      hover:bg-gray-200
                                      disabled:opacity-50
                                      border border-gray-200"
                      aria-label="저장"
                      title="저장"
                    >
                      ✅
                    </button>

                    {/* 취소 */}
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      disabled={isMutating}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-md
                                bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50"
                      aria-label="취소"
                      title="취소"
                    >
                      ✖️
                    </button>
                  </>
                )}
              </div>
          </div>
        </li>
      );
    })}
  </ul>
)}
          {sendError && <p className="mt-3 text-sm text-red-600">{sendError}</p>}
          {sendSuccess && <p className="mt-3 text-sm text-green-600">{sendSuccess}</p>}
        </div>   
      </div>
    </div>
  );
};

export default ApplicantDetailModalContent;
