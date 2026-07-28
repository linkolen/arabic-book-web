import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BookResponse, CreateBookRequest, PageResponse } from '../models/book.models';

@Injectable({ providedIn: 'root' })
export class BookApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/books`;

  constructor(private readonly http: HttpClient) {}

  createBook(request: CreateBookRequest): Observable<BookResponse> {
    return this.http.post<BookResponse>(this.baseUrl, request);
  }

  getBook(bookId: number): Observable<BookResponse> {
    return this.http.get<BookResponse>(`${this.baseUrl}/${bookId}`);
  }

  updatePageText(bookId: number, pageNumber: number, textAr: string): Observable<PageResponse> {
    return this.http.put<PageResponse>(`${this.baseUrl}/${bookId}/pages/${pageNumber}/text`, { textAr });
  }

  uploadPageImage(bookId: number, pageNumber: number, file: File): Observable<PageResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<PageResponse>(`${this.baseUrl}/${bookId}/pages/${pageNumber}/image`, formData);
  }

  composeInterior(bookId: number): Observable<BookResponse> {
    return this.http.post<BookResponse>(`${this.baseUrl}/${bookId}/compose`, {});
  }

  uploadCoverImage(bookId: number, file: File): Observable<BookResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<BookResponse>(`${this.baseUrl}/${bookId}/cover/image`, formData);
  }

  composeCover(bookId: number): Observable<BookResponse> {
    return this.http.post<BookResponse>(`${this.baseUrl}/${bookId}/compose/cover`, {});
  }

  downloadInteriorUrl(bookId: number): string {
    return `${this.baseUrl}/${bookId}/download/interior`;
  }

  downloadCoverUrl(bookId: number): string {
    return `${this.baseUrl}/${bookId}/download/cover`;
  }
}
