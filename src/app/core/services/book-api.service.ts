import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BookResponse,
  BookSummary,
  BulkPageImageResult,
  CreateBookRequest,
  ImageVersion,
  ListingMetadata,
  PageResponse,
  RevenueEntry,
} from '../models/book.models';

@Injectable({ providedIn: 'root' })
export class BookApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/books`;

  constructor(private readonly http: HttpClient) {}

  listBooks(): Observable<BookSummary[]> {
    return this.http.get<BookSummary[]>(this.baseUrl);
  }

  createBook(request: CreateBookRequest): Observable<BookResponse> {
    return this.http.post<BookResponse>(this.baseUrl, request);
  }

  getBook(bookId: number): Observable<BookResponse> {
    return this.http.get<BookResponse>(`${this.baseUrl}/${bookId}`);
  }

  deleteBook(bookId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${bookId}`);
  }

  updatePageText(bookId: number, pageNumber: number, textAr: string): Observable<PageResponse> {
    return this.http.put<PageResponse>(`${this.baseUrl}/${bookId}/pages/${pageNumber}/text`, { textAr });
  }

  uploadPageImage(bookId: number, pageNumber: number, file: File): Observable<PageResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<PageResponse>(`${this.baseUrl}/${bookId}/pages/${pageNumber}/image`, formData);
  }

  bulkUploadPageImages(bookId: number, files: File[]): Observable<BulkPageImageResult[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file, file.name);
    }
    return this.http.post<BulkPageImageResult[]>(`${this.baseUrl}/${bookId}/pages/bulk-image`, formData);
  }

  generatePageImage(bookId: number, pageNumber: number): Observable<PageResponse> {
    return this.http.post<PageResponse>(`${this.baseUrl}/${bookId}/pages/${pageNumber}/generate-image`, {});
  }

  composeInterior(bookId: number): Observable<BookResponse> {
    return this.http.post<BookResponse>(`${this.baseUrl}/${bookId}/compose`, {});
  }

  uploadCoverImage(bookId: number, file: File): Observable<BookResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<BookResponse>(`${this.baseUrl}/${bookId}/cover/image`, formData);
  }

  generateCoverImage(bookId: number): Observable<BookResponse> {
    return this.http.post<BookResponse>(`${this.baseUrl}/${bookId}/cover/generate-image`, {});
  }

  composeCover(bookId: number): Observable<BookResponse> {
    return this.http.post<BookResponse>(`${this.baseUrl}/${bookId}/compose/cover`, {});
  }

  downloadInteriorUrl(bookId: number): string {
    return `${this.baseUrl}/${bookId}/download/interior`;
  }

  downloadInteriorEpubUrl(bookId: number): string {
    return `${this.baseUrl}/${bookId}/download/interior-epub`;
  }

  downloadRedesignedUrl(bookId: number): string {
    return `${this.baseUrl}/${bookId}/download/redesigned`;
  }

  triggerRedesign(bookId: number): Observable<BookResponse> {
    return this.http.post<BookResponse>(`${this.baseUrl}/${bookId}/redesign`, {});
  }

  downloadCoverUrl(bookId: number): string {
    return `${this.baseUrl}/${bookId}/download/cover`;
  }

  downloadCoverJpegUrl(bookId: number): string {
    return `${this.baseUrl}/${bookId}/download/cover-jpeg`;
  }

  pageImageUrl(bookId: number, pageNumber: number): string {
    return `${this.baseUrl}/${bookId}/pages/${pageNumber}/image`;
  }

  pageVersionImageUrl(bookId: number, pageNumber: number, version: number): string {
    return `${this.baseUrl}/${bookId}/pages/${pageNumber}/versions/${version}/image`;
  }

  getPageVersions(bookId: number, pageNumber: number): Observable<ImageVersion[]> {
    return this.http.get<ImageVersion[]>(`${this.baseUrl}/${bookId}/pages/${pageNumber}/versions`);
  }

  restorePageVersion(bookId: number, pageNumber: number, version: number): Observable<PageResponse> {
    return this.http.post<PageResponse>(
      `${this.baseUrl}/${bookId}/pages/${pageNumber}/versions/${version}/restore`,
      {},
    );
  }

  // --- Listing metadata ---

  generateListing(bookId: number): Observable<ListingMetadata> {
    return this.http.post<ListingMetadata>(`${this.baseUrl}/${bookId}/listing/generate`, {});
  }

  updateListing(bookId: number, listing: Partial<ListingMetadata>): Observable<ListingMetadata> {
    return this.http.put<ListingMetadata>(`${this.baseUrl}/${bookId}/listing`, listing);
  }

  // --- Publishing workflow ---

  updatePublishStatus(bookId: number, status: string): Observable<BookResponse> {
    return this.http.put<BookResponse>(`${this.baseUrl}/${bookId}/publish-status`, { status });
  }

  // --- Revenue tracking ---

  listRevenue(bookId: number): Observable<RevenueEntry[]> {
    return this.http.get<RevenueEntry[]>(`${this.baseUrl}/${bookId}/revenue`);
  }

  addRevenueEntry(
    bookId: number,
    entry: { period: string; units: number; royaltyUsd: number; marketplace?: string; notes?: string },
  ): Observable<RevenueEntry> {
    return this.http.post<RevenueEntry>(`${this.baseUrl}/${bookId}/revenue`, entry);
  }

  deleteRevenueEntry(bookId: number, entryId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${bookId}/revenue/${entryId}`);
  }

  // --- Prompt editing ---

  updatePagePrompt(
    bookId: number,
    pageNumber: number,
    imagePrompt: string,
    negativePrompt: string,
  ): Observable<PageResponse> {
    return this.http.put<PageResponse>(`${this.baseUrl}/${bookId}/pages/${pageNumber}/prompt`, {
      imagePrompt,
      negativePrompt,
    });
  }

  updateCoverPrompt(bookId: number, coverImagePrompt: string, coverNegativePrompt: string): Observable<BookResponse> {
    return this.http.put<BookResponse>(`${this.baseUrl}/${bookId}/cover/prompt`, {
      coverImagePrompt,
      coverNegativePrompt,
    });
  }

  updateCoverOptions(
    bookId: number,
    options: { coverTitleText?: string; coverAuthorText?: string; fullBleedImages?: boolean },
  ): Observable<BookResponse> {
    return this.http.put<BookResponse>(`${this.baseUrl}/${bookId}/cover-options`, options);
  }

  coverImageUrl(bookId: number): string {
    return `${this.baseUrl}/${bookId}/cover/image`;
  }
}
