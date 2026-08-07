import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { interval, switchMap, takeWhile } from 'rxjs';

import { apiErrorMessage } from '../../core/services/api-error';
import { BookApiService } from '../../core/services/book-api.service';
import { BookResponse, ComposeStatus } from '../../core/models/book.models';

const COMPOSE_POLL_INTERVAL_MS = 2000;

@Component({
  selector: 'app-book-workspace',
  standalone: true,
  imports: [],
  templateUrl: './book-workspace.component.html',
  styleUrl: './book-workspace.component.css',
})
export class BookWorkspaceComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly bookApi = inject(BookApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly bookId = Number(this.route.snapshot.paramMap.get('id'));

  readonly book = signal<BookResponse | null>(null);
  readonly loadError = signal<string | null>(null);

  readonly savingPage = signal<number | null>(null);
  readonly uploadingPage = signal<number | null>(null);
  readonly generatingPage = signal<number | null>(null);
  readonly pageErrors = signal<Record<number, string>>({});

  readonly composing = signal(false);
  readonly composeError = signal<string | null>(null);

  readonly uploadingCover = signal(false);
  readonly generatingCover = signal(false);
  readonly coverError = signal<string | null>(null);
  readonly composingCover = signal(false);

  readonly copiedPage = signal<number | null>(null);
  readonly copiedCover = signal(false);

  readonly readyCount = computed(() => this.book()?.pages.filter((p) => p.imageReady).length ?? 0);
  readonly totalCount = computed(() => this.book()?.pages.length ?? 0);
  readonly allReady = computed(() => this.totalCount() > 0 && this.readyCount() === this.totalCount());

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.bookApi.getBook(this.bookId).subscribe({
      next: (book) => this.book.set(book),
      error: (err) => this.loadError.set(apiErrorMessage(err)),
    });
  }

  saveText(pageNumber: number, textAr: string): void {
    this.savingPage.set(pageNumber);
    this.clearPageError(pageNumber);
    this.bookApi.updatePageText(this.bookId, pageNumber, textAr).subscribe({
      next: () => {
        this.savingPage.set(null);
        this.reload();
      },
      error: (err) => {
        this.savingPage.set(null);
        this.setPageError(pageNumber, apiErrorMessage(err));
      },
    });
  }

  onFileSelected(pageNumber: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.uploadingPage.set(pageNumber);
    this.clearPageError(pageNumber);
    this.bookApi.uploadPageImage(this.bookId, pageNumber, file).subscribe({
      next: () => {
        this.uploadingPage.set(null);
        this.reload();
      },
      error: (err) => {
        this.uploadingPage.set(null);
        this.setPageError(pageNumber, apiErrorMessage(err));
      },
    });
  }

  generateImage(pageNumber: number): void {
    this.generatingPage.set(pageNumber);
    this.clearPageError(pageNumber);
    this.bookApi.generatePageImage(this.bookId, pageNumber).subscribe({
      next: () => {
        this.generatingPage.set(null);
        this.reload();
      },
      error: (err) => {
        this.generatingPage.set(null);
        this.setPageError(pageNumber, apiErrorMessage(err));
      },
    });
  }

  copyPrompt(pageNumber: number, prompt: string): void {
    navigator.clipboard?.writeText(prompt).then(() => {
      this.copiedPage.set(pageNumber);
      setTimeout(() => {
        if (this.copiedPage() === pageNumber) {
          this.copiedPage.set(null);
        }
      }, 1500);
    });
  }

  compose(): void {
    this.composing.set(true);
    this.composeError.set(null);
    this.bookApi.composeInterior(this.bookId).subscribe({
      next: (book) => {
        this.book.set(book);
        this.pollCompose(
          (b) => b.interiorComposeStatus,
          (b) => b.interiorComposeError,
          this.composing,
          this.composeError,
        );
      },
      error: (err) => {
        this.composing.set(false);
        this.composeError.set(apiErrorMessage(err));
      },
    });
  }

  /**
   * The compose endpoints return 202 immediately (the Python /compose call
   * can outlast nginx's proxy timeout, so it now runs in the background on
   * the API side) -- poll GET /books/{id} until the status leaves IN_PROGRESS.
   */
  private pollCompose(
    statusOf: (b: BookResponse) => ComposeStatus,
    errorOf: (b: BookResponse) => string | null,
    busy: typeof this.composing,
    error: typeof this.composeError,
  ): void {
    interval(COMPOSE_POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.bookApi.getBook(this.bookId)),
        takeWhile((b) => statusOf(b) === 'IN_PROGRESS', true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (b) => {
          this.book.set(b);
          if (statusOf(b) === 'IN_PROGRESS') {
            return;
          }
          busy.set(false);
          if (statusOf(b) === 'FAILED') {
            error.set(errorOf(b) ?? 'Compose failed');
          }
        },
        error: (err) => {
          busy.set(false);
          error.set(apiErrorMessage(err));
        },
      });
  }

  downloadUrl(): string {
    return this.bookApi.downloadInteriorUrl(this.bookId);
  }

  downloadEpubUrl(): string {
    return this.bookApi.downloadInteriorEpubUrl(this.bookId);
  }

  onCoverFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.uploadingCover.set(true);
    this.coverError.set(null);
    this.bookApi.uploadCoverImage(this.bookId, file).subscribe({
      next: (book) => {
        this.uploadingCover.set(false);
        this.book.set(book);
      },
      error: (err) => {
        this.uploadingCover.set(false);
        this.coverError.set(apiErrorMessage(err));
      },
    });
  }

  generateCoverImage(): void {
    this.generatingCover.set(true);
    this.coverError.set(null);
    this.bookApi.generateCoverImage(this.bookId).subscribe({
      next: (book) => {
        this.generatingCover.set(false);
        this.book.set(book);
      },
      error: (err) => {
        this.generatingCover.set(false);
        this.coverError.set(apiErrorMessage(err));
      },
    });
  }

  copyCoverPrompt(prompt: string): void {
    navigator.clipboard?.writeText(prompt).then(() => {
      this.copiedCover.set(true);
      setTimeout(() => this.copiedCover.set(false), 1500);
    });
  }

  composeCover(): void {
    this.composingCover.set(true);
    this.coverError.set(null);
    this.bookApi.composeCover(this.bookId).subscribe({
      next: (book) => {
        this.book.set(book);
        this.pollCompose(
          (b) => b.coverComposeStatus,
          (b) => b.coverComposeError,
          this.composingCover,
          this.coverError,
        );
      },
      error: (err) => {
        this.composingCover.set(false);
        this.coverError.set(apiErrorMessage(err));
      },
    });
  }

  downloadCoverUrl(): string {
    return this.bookApi.downloadCoverUrl(this.bookId);
  }

  downloadCoverJpegUrl(): string {
    return this.bookApi.downloadCoverJpegUrl(this.bookId);
  }

  private setPageError(pageNumber: number, message: string): void {
    this.pageErrors.update((errors) => ({ ...errors, [pageNumber]: message }));
  }

  private clearPageError(pageNumber: number): void {
    this.pageErrors.update((errors) => {
      const { [pageNumber]: _removed, ...rest } = errors;
      return rest;
    });
  }
}
