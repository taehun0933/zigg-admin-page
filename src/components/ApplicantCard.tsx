"use client";

import { likeApplicant, scrapApplicant } from "@/apis/audition";
import { AuditionProfileType } from "@/types/audition";
import React from "react";
import { IoBook, IoBookmark } from "react-icons/io5";
import { IoBookmarkOutline } from "react-icons/io5";
import { IoHeartOutline } from "react-icons/io5";
import { IoHeartSharp } from "react-icons/io5";

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
    isLiked,
    isScrap,
    userId,
    videos,
  } = auditionProfile;

  // todo: 추후 수정
  const profileImage = images || "/default-profile.png";

  return (
    <button
      className="relative w-full max-w-sm p-4 border border-gray-400 rounded-lg shadow-md bg-white flex flex-col items-center text-center cursor-pointer transition-all hover:shadow-lg"
      onClick={handleOnClick}
    >
      {/* todo: 백엔드쪽 데이터 추가한 후, 마저 로직 완성하기 */}
      <div
        className="absolute top-2 left-2 text-gray-400"
        onClick={async (e) => {
          e.stopPropagation();
          await scrapApplicant(id);
        }}
      >
        <IoBookmarkOutline size={20} />
      </div>
      <div
        className="absolute top-2 right-2 text-gray-400"
        onClick={async (e) => {
          e.stopPropagation();
          await likeApplicant(id);
        }}
      >
        <IoHeartOutline size={20} />
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

      {/* 국적 / 나이 */}
      <p className="text-sm text-gray-500 mt-1">
        {nation} | {gender}
      </p>

      {instagramId ? (
        <a
          className="text-sm text-blue-500 underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation(); // 부모 button 클릭 방지
            window.open(instagramId, "_blank");
          }}
        >
          Instagram Link
        </a>
      ) : (
        <span className="text-sm text-gray-400">인스타그램 정보 없음</span>
      )}

      {/* 하단 정보: 성별 / 키 / 몸무게 */}
      <p className="mt-4 text-lg font-bold">
        {height} | {weight} | {ageOrYear}세
      </p>
    </button>
  );
};

export default ApplicantCard;
