import React from "react";

interface Audition {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  totalApplicants: number;
  selectedApplicants: number;
}

interface AuditionCardProps {
  audition: Audition;
}

const AuditionCard: React.FC<AuditionCardProps> = ({ audition }) => {
  return (
    <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
      <h3 className="text-xl font-bold mb-2">{audition.title}</h3>
      <p className="text-gray-700 mb-2">
        {audition.startDate} ~ {audition.endDate}
      </p>
      <p className="text-gray-600 mb-2">
        전체 지원자: {audition.totalApplicants}명
      </p>
      <p className="text-gray-600">
        선정 인원: {audition.selectedApplicants}명
      </p>
    </div>
  );
};

export default AuditionCard;
