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
  coverImageReady: boolean;
  coverPdfKey: string | null;
  pages: PageResponse[];
}

export interface CreateBookRequest {
  theme: string;
  ageBand: string;
  mainCharacter: string;
  pageCount: number;
  artStyle: string;
}
