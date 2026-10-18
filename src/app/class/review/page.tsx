import LectureReviewClient from "./LectureReviewClient";

interface LectureReviewPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// 관리자 — 클래스 신청서 최종 편집 (?id=)
export default async function LectureReviewPage({ searchParams }: LectureReviewPageProps) {
  const params = await searchParams;
  return <LectureReviewClient lectureId={Number(params.id)} />;
}
