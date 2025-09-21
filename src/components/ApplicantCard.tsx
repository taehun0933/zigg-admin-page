"use client";

import {
  deleteLikeApplicant,
  deleteScrapApplicant,
  likeApplicant,
  scrapApplicant,
} from "@/apis/audition";
import { AuditionProfileType } from "@/types/audition";
import React, { useState } from "react";
import {
  IoBookmark,
  IoBookmarkOutline,
  IoHeart,
  IoHeartOutline,
  IoCloseCircle,
  IoCheckmarkCircle
} from "react-icons/io5";

interface ApplicantCardProps {
  auditionProfile: AuditionProfileType;
  handleOnClick: () => void;
}

const ApplicantCard: React.FC<ApplicantCardProps> = ({
  auditionProfile,
  handleOnClick,
}) => {
  const {
    name,
    ageOrYear,
    height,
    weight,
    gender,
    nation,
    desiredPosition,
    images,
    instagramId,
    auditionId,
    contactInfo,
    createdAt,
    id,
    userId,
    videos,
    acceptFeedback
  } = auditionProfile;

  const [isLiked, setIsLiked] = useState(auditionProfile.isLiked);
  const [isScrap, setIsScrap] = useState(auditionProfile.isScrap);

  const profileImage = images[0]?.imageKey || "/default-profile.png";

  const handleScrapClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      if (isScrap) {
        const status = await deleteScrapApplicant({
          applicationId: id,
          auditionId,
        });
        if (status === 200) {
          setIsScrap(false);
        }
      } else {
        const status = await scrapApplicant({ applicationId: id, auditionId });
        if (status === 200) {
          setIsScrap(true);
        }
      }
    } catch (error) {
      console.error("스크랩 요청 실패", error);
    }
  };

  const handleLikeClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      if (isLiked) {
        const status = await deleteLikeApplicant({
          applicationId: id,
          auditionId,
        });
        if (status === 200) {
          setIsLiked(false);
        }
      } else {
        const status = await likeApplicant({ applicationId: id, auditionId });
        if (status === 200) {
          setIsLiked(true);
        }
      }
    } catch (error) {
      console.error("좋아요 요청 실패", error);
    }
  };

  return (
    <button
      className="relative w-full max-w-sm p-4 border border-gray-400 rounded-lg shadow-md bg-white flex flex-col items-center text-center cursor-pointer transition-all hover:shadow-lg"
      onClick={handleOnClick}
    >
      <div
        className="absolute top-2 left-2 text-gray-400"
        onClick={handleScrapClick}
      >
        {isScrap ? <IoBookmark size={20} /> : <IoBookmarkOutline size={20} />}
      </div>

      <div
        className="absolute top-2 right-2 text-gray-400"
        onClick={handleLikeClick}
      >
        {isLiked ? <IoHeart size={20} /> : <IoHeartOutline size={20} />}
      </div>
      {/* ✅ 피드백 배지 (우상단 아이콘들과 겹치지 않도록 상단 중앙) */}
      <div
        className="absolute top-0.5 left-1/2 -translate-x-1/2"
        onClick={(e) => e.stopPropagation()}
        title={acceptFeedback ? "피드백 수락" : "피드백 미수락"}
      >
        {acceptFeedback ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-100 text-emerald-700">
            <IoCheckmarkCircle size={14} />
            피드백 OK
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-500">
            <IoCloseCircle size={14} />
            피드백 X
          </span>
        )}
      </div>
      {/* 프로필 이미지 */}
      <div className="w-40 h-40 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden mb-4">
        <img
          src={profileImage}
          alt="프로필 사진"
          className="object-cover w-full h-full"
        />
      </div>

      {/* 이름 / 포지션 */}
      <p className="font-semibold text-lg">
        {name} | {desiredPosition}
      </p>

      {/* 국적 / 성별 */}
      <p className="text-sm text-gray-500 mt-1">
        {nation} | {gender}
      </p>

      {/* 인스타그램 */}
      {instagramId ? (
        <a
          className="text-sm text-blue-500 underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://www.instagram.com/${instagramId}`, "_blank");
          }}
        >
          Instagram Link
        </a>
      ) : (
        <span className="text-sm text-gray-400">인스타그램 정보 없음</span>
      )}

      {/* 키 / 몸무게 / 출생년도 */}
      <p className="mt-4 text-lg font-bold">
        {height} | {weight} | {ageOrYear}년생
      </p>
    </button>
  );
};

export default ApplicantCard;
