import { MediaImageType, MediaVideoType } from "./media";

export interface AuditionProfileType {
  id: number;
  name: string;
  ageOrYear: string;
  height: string;
  weight: string;
  gender: string;
  nation: string;
  desiredPosition: string;
  introduction: string;
  images: MediaImageType[];
  videos: MediaVideoType[];
  instagramId: string;
  contactInfo: string;
  isLiked: boolean;
  isScrap: boolean;
  userId: number;
  auditionId: number;
  createdAt: string; // ISO string
  acceptFeedback: boolean;
}

export interface AuditionInfoType {
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
  pageable: {
    paged: boolean;
    pageNumber: number;
    pageSize: number;
    offset: number;
    sort: {
      sorted: boolean;
      empty: boolean;
      unsorted: boolean;
    };
    unpaged: boolean;
  };
  size: number;
  content: AuditionProfileType[];
  number: number;
  sort: {
    sorted: boolean;
    empty: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  empty: boolean;
}

export interface AuditionDetailType {
  id: number;
  title: string;
  company: string;
  qualification: string;
  startDate: string;   // "YYYY-MM-DD"
  endDate: string;     // "YYYY-MM-DD"
  thumbnail?: {
    imageKey: string;        // https://...png
    onClickUrl: string | null;
  };
  likeCount: number;
  scrapCount: number;
  applicationCount: number;
}