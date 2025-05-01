import { Audition } from "@/app/audition/page";
import { useRouter } from "next/navigation";
import React from "react";

interface AuditionCardProps {
  audition: Audition;
}

const AuditionCard: React.FC<AuditionCardProps> = ({ audition }) => {
  const router = useRouter();

  console.log(audition);

  return (
    <button
      className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer text-left"
      onClick={() => {
        router.push(`/audition/${audition.id}`);
      }}
    >
      <h3 className="text-xl font-bold mb-4 break-words w-full">
        {audition.title}
      </h3>
      <img
        src={audition.thumbnail.imageKey}
        alt="오디션 썸네일"
        className="w-2/3 aspect-square object-cover rounded mb-8"
      />
      <p className="text-gray-700 mb-2 font-semibold">
        {audition.startDate} ~ {audition.endDate}
      </p>
      <p className="text-gray-500 font-medium">
        전체 지원자: {audition.applicationCount}명
      </p>
      <p className="text-gray-500 font-medium">
        선정 인원: {audition.likeCount}명
      </p>
    </button>
  );
};

export default AuditionCard;
