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
  images: MediaImageType[];
  videos: MediaVideoType[];
  instagramId: string;
  contactInfo: string;
  isLiked: boolean;
  isScrap: boolean;
  userId: number;
  auditionId: number;
  createdAt: string; // ISO string
}
