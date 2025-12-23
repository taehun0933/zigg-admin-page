"use client";

import { getAuditionFeedbacks, sendApplicationFeedback } from "@/apis/feedback";
import { AuditionProfileType } from "@/types/audition";
import { AuditionFeedback } from "@/types/feedback";
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

  const [textReviews, setTextReviews] = useState<string[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const canSend = useMemo(() => feedbackText.trim().length > 0 && !isSending, [feedbackText, isSending]);

  useEffect(() => {
  if (!applicantInfo) return;
  refreshFeedbacks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [applicantInfo?.id]);


  if (!applicantInfo) return null;
  const handleSendFeedback = async () => {
    if (!canSend) return;

    try {
      setIsSending(true);
      setSendError(null);
      setSendSuccess(null);

      const status = await sendApplicationFeedback({
        auditionId: applicantInfo.auditionId,
        applicationId: applicantInfo.id,
        textReview: feedbackText.trim(),
      });

      // 보통 201/200
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
    // data: AuditionFeedback[] (배열)

    const list = (data ?? [])
      .map((fb) => fb?.textReview?.trim())
      .filter((v): v is string => !!v && v.length > 0);

    setTextReviews(list);
  } catch (e: any) {
    setLoadError(e?.message ?? "피드백 목록을 불러오지 못했어요.");
  } finally {
    setIsLoadingFeedbacks(false);
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
          {!isLoadingFeedbacks && textReviews.length === 0 && !loadError && (
            <p className="mt-4 text-sm text-gray-500">아직 피드백이 없어요.</p>
          )}

          {textReviews.length > 0 && (
            <ul className="mt-4 space-y-3">
              {textReviews.map((text, idx) => (
                <li key={idx} className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
                </li>
              ))}
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
