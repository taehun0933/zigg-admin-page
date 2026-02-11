/** Spring Page sort */
export interface PageSortType {
  sorted: boolean;
  empty: boolean;
  unsorted: boolean;
}

/** Spring Pageable */
export interface PageableType {
  pageNumber: number;
  pageSize: number;
  sort: PageSortType;
  offset: number;
  paged: boolean;
  unpaged: boolean;
}

/** Spring Page 응답 (content만 제네릭) */
export interface PageResponse<T> {
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
  pageable: PageableType;
  size: number;
  content: T[];
  number: number;
  sort: PageSortType;
  numberOfElements: number;
  empty: boolean;
}
