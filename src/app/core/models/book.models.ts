export type ComposeStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'FAILED';

export interface PageResponse {
  pageNumber: number;
  textAr: string;
  imagePrompt: string;
  negativePrompt: string;
  imageReady: boolean;
}

export interface BookResponse {
  id: number;
  theme: string;
  ageBand: string;
  mainCharacter: string;
  pageCount: number;
  artStyle: string;
  trimWidthIn: number;
  trimHeightIn: number;
  paperType: string;
  titleAr: string | null;
  styleGuide: string | null;
  interiorPdfKey: string | null;
  interiorEpubKey: string | null;
  interiorComposeStatus: ComposeStatus;
  interiorComposeError: string | null;
  coverImagePrompt: string | null;
  coverImageReady: boolean;
  coverPdfKey: string | null;
  coverJpegKey: string | null;
  coverComposeStatus: ComposeStatus;
  coverComposeError: string | null;
  pages: PageResponse[];
}

export interface CreateBookRequest {
  theme: string;
  ageBand: string;
  mainCharacter: string;
  pageCount: number;
  artStyle: string;
}

export interface BookSummary {
  id: number;
  titleAr: string | null;
  theme: string;
  mainCharacter: string;
  pageCount: number;
  readyPageCount: number;
  coverImageReady: boolean;
  interiorComposed: boolean;
  coverComposed: boolean;
}
