export type ComposeStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'FAILED';

export type BookType = 'story' | 'coloring' | 'activity';

export type PuzzleType = 'WORD_SEARCH' | 'MAZE' | 'DOT_TO_DOT' | 'CROSSWORD' | 'NONOGRAM' | 'MIXED' | 'PATTERN' | 'DRAWING' | 'SPOT_THE_DIFFERENCE' | 'MATCHING' | 'COUNTING' | 'SIMPLE_MATH' | 'TRACING' | 'SORTING' | 'CLASSIFICATION' | 'LETTER_REC' | 'BEGIN_SOUNDS' | 'RHYMING' | 'WORD_PICTURE' | 'SIGHT_WORDS' | 'HIDDEN_PICTURE' | 'SHAPE_REC' | 'SHAPE_COMPLETE' | 'VISUAL_LOGIC' | 'NUMBER_REC' | 'MORE_LESS' | 'NUMBER_SEQ' | 'TIME' | 'MONEY' | 'ANIMALS' | 'PLANTS' | 'WEATHER' | 'SEASONS' | 'SENSES' | 'COMMUNITY' | 'COLORING_ACTIVITY' | 'COLOR_NUMBER' | 'COLOR_LETTER' | 'FINISH_PICTURE' | 'SYMMETRY' | 'ROBOT_PATH' | 'SYMBOL_CODE' | 'ALGORITHM' | 'SEQUENCING' | 'NUMBER_TRACE';

/** Must mirror the validation in BookService.validateCreateRequest. */
export const PUZZLE_TYPES: ReadonlyArray<{ value: PuzzleType; label: string }> = [
  { value: 'MIXED', label: 'Mixed book (all activities)' },
  { value: 'WORD_SEARCH', label: 'Word search (Arabic)' },
  { value: 'MAZE', label: 'Mazes' },
  { value: 'DOT_TO_DOT', label: 'Dot-to-dot' },
  { value: 'CROSSWORD', label: 'Crossword (criss-cross)' },
  { value: 'NONOGRAM', label: 'Nonogram (color by numbers)' },
  { value: 'PATTERN', label: 'Patterns' },
  { value: 'DRAWING', label: 'Drawing prompts' },
  { value: 'SPOT_THE_DIFFERENCE', label: 'Spot the difference' },
  { value: 'MATCHING', label: 'Matching pairs' },
  { value: 'COUNTING', label: 'Counting' },
  { value: 'SIMPLE_MATH', label: 'Simple math' },
  { value: 'TRACING', label: 'Tracing' },
  { value: 'SORTING', label: 'Sorting' },
  { value: 'CLASSIFICATION', label: 'Classification' },
  { value: 'LETTER_REC', label: 'Letter recognition' },
  { value: 'BEGIN_SOUNDS', label: 'Beginning sounds' },
  { value: 'RHYMING', label: 'Rhyming' },
  { value: 'WORD_PICTURE', label: 'Word-picture match' },
  { value: 'SIGHT_WORDS', label: 'Sight words' },
  { value: 'HIDDEN_PICTURE', label: 'Hidden pictures' },
  { value: 'SHAPE_REC', label: 'Shapes' },
  { value: 'SHAPE_COMPLETE', label: 'Complete shapes' },
  { value: 'VISUAL_LOGIC', label: 'Visual logic' },
  { value: 'NUMBER_REC', label: 'Numbers' },
  { value: 'MORE_LESS', label: 'More or less' },
  { value: 'NUMBER_SEQ', label: 'Number sequences' },
  { value: 'TIME', label: 'Time' },
  { value: 'MONEY', label: 'Money' },
  { value: 'ANIMALS', label: 'Animals' },
  { value: 'PLANTS', label: 'Plants' },
  { value: 'WEATHER', label: 'Weather' },
  { value: 'SEASONS', label: 'Seasons' },
  { value: 'SENSES', label: 'Five Senses' },
  { value: 'COMMUNITY', label: 'Community' },
  { value: 'COLORING_ACTIVITY', label: 'Coloring' },
  { value: 'COLOR_NUMBER', label: 'Color by Number' },
  { value: 'COLOR_LETTER', label: 'Color by Letter' },
  { value: 'FINISH_PICTURE', label: 'Finish the Picture' },
  { value: 'SYMMETRY', label: 'Symmetry' },
  { value: 'ROBOT_PATH', label: 'Robot Path' },
  { value: 'SYMBOL_CODE', label: 'Symbol Code' },
  { value: 'ALGORITHM', label: 'Simple Algorithms' },
  { value: 'SEQUENCING', label: 'Sequencing' },
  { value: 'NUMBER_TRACE', label: 'Number Tracing' },
];

export type BookLanguage = 'ar' | 'en';

export const LANGUAGES: ReadonlyArray<{ value: BookLanguage; label: string }> = [
  { value: 'ar', label: 'Arabic (RTL)' },
  { value: 'en', label: 'English (LTR)' },
];

/** Activity/coloring puzzle themes with full themed content (guides, counting
 * subjects, maze heroes). Must mirror the theme families in the redesign
 * service (themes.py THEME_CONTENT) and the Java mirrors (CountingTheme,
 * MathTheme, DotToDotPuzzle, PatternPuzzle). Free text stays allowed --
 * anything unmatched falls back to jungle. */
export const THEMES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'ocean', label: 'Ocean — fish, treasure, Splash' },
  { value: 'space', label: 'Space — stars, planets, Robo' },
  { value: 'jungle', label: 'Jungle — leaves, lions, Leo' },
  { value: 'food', label: 'Food — apples, cookies, Momo' },
  { value: 'farm', label: 'Farm — apples, eggs, Pip' },
  { value: 'magic', label: 'Magic — stars, bubbles, Hoot' },
  { value: 'dinosaur', label: 'Dinosaurs — eggs, Rex' },
  { value: 'winter', label: 'Winter — snowflakes, snowballs, Snowy' },
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
  currency?: 'USD' | 'EUR' | string;
  planning?: {
    seed?: number;
    distribution?: Record<string, number>;
    minimumByCategory?: Record<string, number>;
    maxSameTypeConsecutive?: number;
    maxSameCategoryConsecutive?: number;
    themes?: string[];
    minDifficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    maxDifficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  };
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
