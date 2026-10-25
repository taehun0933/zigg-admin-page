import LectureWeeksClient from "./LectureWeeksClient";

interface LectureWeeksPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// 트레이너 — 운영 중 클래스의 주차별 레퍼런스 관리 (?id=)
export default async function LectureWeeksPage({ searchParams }: LectureWeeksPageProps) {
  const params = await searchParams;
  const id = Number(params.id);
  return <LectureWeeksClient lectureId={Number.isFinite(id) && id > 0 ? id : null} />;
}
