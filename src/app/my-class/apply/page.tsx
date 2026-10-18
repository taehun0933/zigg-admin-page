import LectureApplyClient from "./LectureApplyClient";

interface LectureApplyPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// ?id= 가 있으면 대기·반려 건 수정(재신청), 없으면 새 신청
export default async function LectureApplyPage({ searchParams }: LectureApplyPageProps) {
  const params = await searchParams;
  const id = Number(params.id);
  return <LectureApplyClient lectureId={Number.isFinite(id) && id > 0 ? id : null} />;
}
