export type ComposeStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'FAILED';

export type BookType = 'story' | 'coloring' | 'activity';

export type PuzzleType = 'WORD_SEARCH' | 'MAZE' | 'DOT_TO_DOT' | 'CROSSWORD' | 'NONOGRAM' | 'MIXED';

/** Must mirror the validation in BookService.validateCreateRequest. */
export const PUZZLE_TYPES: ReadonlyArray<{ value: PuzzleType; label: string }> = [
  { value: 'MIXED', label: 'Mixed book (all activities)' },
  { value: 'WORD_SEARCH', label: 'Word search (Arabic)' },
  { value: 'MAZE', label: 'Mazes' },
  { value: 'DOT_TO_DOT', label: 'Dot-to-dot' },
  { value: 'CROSSWORD', label: 'Crossword (criss-cross)' },
  { value: 'NONOGRAM', label: 'Nonogram (color by numbers)' },
];

export type BookLanguage = 'ar' | 'en';

export const LANGUAGES: ReadonlyArray<{ value: BookLanguage; label: string }> = [
  { value: 'ar', label: 'Arabic (RTL)' },
  { value: 'en', label: 'English (LTR)' },
];

export type PublishStatus = 'DRAFT' | 'UPLOADED' | 'LIVE';

export const PUBLISH_STATUSES: ReadonlyArray<{ value: PublishStatus; label: string }> = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'UPLOADED', label: 'Uploaded to KDP' },
  { value: 'LIVE', label: 'Live on Amazon' },
];

export interface PageResponse {
  pageNumber: number;
  textAr: string;
  imagePrompt: string;
  negativePrompt: string;
  imageReady: boolean;
  currentVersion: number;
}

export interface ImageVersion {
  version: number;
  key: string;
  createdAt: string;
  prompt: string | null;
}

export interface BulkPageImageResult {
  filename: string | null;
  pageNumber: number | null;
  success: boolean;
  error: string | null;
}

export type RedesignStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'FAILED';

export interface BookResponse {
  id: number;
  bookType: BookType;
  theme: string;
  ageBand: string | null;
  mainCharacter: string | null;
  pageCount: number;
  artStyle: string | null;
  includeCaption: boolean;
  trimWidthIn: number;
  trimHeightIn: number;
  paperType: string;
  puzzleType: string | null;
  titleAr: string | null;
  styleGuide: string | null;
  interiorPdfKey: string | null;
  interiorEpubKey: string | null;
  interiorComposeStatus: ComposeStatus;
  interiorComposeError: string | null;
  coverImagePrompt: string | null;
  coverNegativePrompt: string | null;
  coverImageReady: boolean;
  coverPdfKey: string | null;
  coverJpegKey: string | null;
  coverComposeStatus: ComposeStatus;
  coverComposeError: string | null;
  publishStatus: PublishStatus;
  language: BookLanguage;
  colorAccents: boolean;
  coverTitleText: string | null;
  coverAuthorText: string | null;
  fullBleedImages: boolean;
  redesignedPdfKey: string | null;
  redesignStatus: RedesignStatus;
  redesignError: string | null;
  redesignJobId: string | null;
  listing: ListingMetadata;
  pages: PageResponse[];
}

export interface ListingMetadata {
  title: string | null;
  subtitle: string | null;
  description: string | null;
  keywords: string[];
  categories: string[];
}

export interface RevenueEntry {
  id: number;
  period: string;
  units: number;
  royaltyUsd: number;
  marketplace: string;
  notes: string | null;
}

export interface CreateBookRequest {
  bookType: BookType;
  language?: BookLanguage;
  theme: string;
  ageBand: string;
  mainCharacter: string;
  pageCount: number;
  artStyle: string;
  includeCaption: boolean;
  trimWidthIn?: number;
  trimHeightIn?: number;
  puzzleType?: string;
}

/** Must mirror KdpTrimSizes.SUPPORTED on the API side. */
export const TRIM_SIZES: ReadonlyArray<{ label: string; widthIn: number; heightIn: number }> = [
  { label: '8.5 x 8.5 in (square)', widthIn: 8.5, heightIn: 8.5 },
  { label: '8.5 x 11 in (US letter)', widthIn: 8.5, heightIn: 11 },
  { label: '8 x 10 in', widthIn: 8, heightIn: 10 },
  { label: '7.5 x 9.25 in', widthIn: 7.5, heightIn: 9.25 },
];

export interface BookSummary {
  id: number;
  bookType: BookType;
  titleAr: string | null;
  theme: string;
  mainCharacter: string;
  pageCount: number;
  readyPageCount: number;
  coverImageReady: boolean;
  interiorComposed: boolean;
  coverComposed: boolean;
  publishStatus: PublishStatus;
  language: BookLanguage;
}
