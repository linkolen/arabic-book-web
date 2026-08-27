import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { interval, switchMap, takeWhile } from 'rxjs';

import { apiErrorMessage } from '../../core/services/api-error';
import { BookApiService } from '../../core/services/book-api.service';
import {
  BookResponse,
  BulkPageImageResult,
  ComposeStatus,
  ImageVersion,
  PUBLISH_STATUSES,
  PublishStatus,
  RevenueEntry,
  TRIM_SIZES,
} from '../../core/models/book.models';

const COMPOSE_POLL_INTERVAL_MS = 2000;

@Component({
  selector: 'app-book-workspace',
  standalone: true,
  imports: [FormsModule, DatePipe],
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
  readonly imageCacheBuster = signal(0);

  readonly savingPage = signal<number | null>(null);
  readonly uploadingPage = signal<number | null>(null);
  readonly generatingPage = signal<number | null>(null);
  readonly pageErrors = signal<Record<number, string>>({});

  readonly bulkUploading = signal(false);
  readonly bulkResults = signal<BulkPageImageResult[] | null>(null);
  readonly bulkError = signal<string | null>(null);
  readonly bulkSuccessCount = computed(() => this.bulkResults()?.filter((r) => r.success).length ?? 0);
  readonly bulkFailureCount = computed(() => this.bulkResults()?.filter((r) => !r.success).length ?? 0);

  // Activity books: sequential client-side loop over the per-page render
  // endpoint (puzzles render server-side in Java, no AI quota involved).
  readonly generatingAll = signal(false);
  readonly generatedAllCount = signal(0);
  readonly missingCount = computed(
    () => this.book()?.pages.filter((p) => !p.imageReady).length ?? 0,
  );
  readonly imageProviderLabel = 'Gemini';

  readonly composing = signal(false);
  readonly composeError = signal<string | null>(null);

  readonly redesigning = signal(false);
  readonly redesignError = signal<string | null>(null);

  readonly uploadingCover = signal(false);
  readonly generatingCover = signal(false);
  readonly coverError = signal<string | null>(null);
  readonly composingCover = signal(false);

  readonly copiedPage = signal<number | null>(null);
  readonly copiedCover = signal(false);

  // Version history
  readonly versionHistoryPage = signal<number | null>(null);
  readonly versionHistory = signal<ImageVersion[]>([]);
  readonly loadingVersions = signal(false);
  readonly restoringVersion = signal<{ page: number; version: number } | null>(null);

  // Prompt editing (per page + cover)
  readonly editingPromptPage = signal<number | null>(null);
  readonly promptDraft = signal<{ imagePrompt: string; negativePrompt: string }>({ imagePrompt: '', negativePrompt: '' });
  readonly savingPromptPage = signal<number | null>(null);
  readonly editingCoverPrompt = signal(false);
  readonly coverPromptDraft = signal<{ coverImagePrompt: string; coverNegativePrompt: string }>({
    coverImagePrompt: '',
    coverNegativePrompt: '',
  });
  readonly savingCoverPrompt = signal(false);

  // Listing metadata
  readonly generatingListing = signal(false);
  readonly savingListing = signal(false);
  readonly listingError = signal<string | null>(null);
  readonly copiedListingField = signal<string | null>(null);

  // Publishing workflow
  readonly updatingStatus = signal(false);
  readonly publishStatuses = PUBLISH_STATUSES;

  // Revenue tracking
  readonly revenueEntries = signal<RevenueEntry[]>([]);
  readonly revenueLoading = signal(false);
  readonly revenueError = signal<string | null>(null);
  readonly addingRevenue = signal(false);
  readonly newRevenuePeriod = signal(currentMonth());
  readonly newRevenueUnits = signal(0);
  readonly newRevenueRoyalty = signal(0);
  readonly newRevenueMarketplace = signal('amazon.com');
  readonly revenueTotals = computed(() => {
    const entries = this.revenueEntries();
    const units = entries.reduce((sum, e) => sum + (e.units || 0), 0);
    const royalty = entries.reduce((sum, e) => sum + (e.royaltyUsd || 0), 0);
    return { units, royalty: royalty.toFixed(2) };
  });

  // Cover options (title/author overlay + full-bleed coloring)
  readonly coverTitleDraft = signal('');
  readonly coverAuthorDraft = signal('');
  readonly savingCoverOptions = signal(false);

  // --- Validation checklist ---
  readonly validationChecks = computed(() => {
    const b = this.book();
    if (!b) return [];
    const trimSupported = TRIM_SIZES.some(
      (t) => t.widthIn === b.trimWidthIn && t.heightIn === b.trimHeightIn,
    );
    return [
      {
        label: 'All pages have illustrations',
        pass: this.allReady(),
        detail: `${this.readyCount()} of ${this.totalCount()} ready`,
      },
      {
        label: 'Page count ≥ 24 (KDP minimum)',
        pass: b.pageCount >= 24,
        detail: b.pageCount < 24 ? `${b.pageCount} pages — KDP requires 24+` : `${b.pageCount} pages`,
      },
      {
        label: 'Cover illustration uploaded',
        pass: b.coverImageReady,
        detail: b.coverImageReady ? 'Ready' : 'Upload or generate a cover',
      },
      {
        label: 'Interior PDF + EPUB composed',
        pass: !!b.interiorPdfKey && !!b.interiorEpubKey,
        detail: b.interiorPdfKey ? 'Composed' : 'Not yet composed',
      },
      {
        label: 'Kindle eBook cover JPEG',
        pass: !!b.coverJpegKey,
        detail: b.coverJpegKey ? 'Ready' : 'Compose cover to generate',
      },
      {
        label: 'Trim size is KDP-supported',
        pass: trimSupported,
        detail: `${b.trimWidthIn} × ${b.trimHeightIn} in`,
      },
    ];
  });
  readonly validationPassed = computed(() =>
    this.validationChecks().every((c) => c.pass),
  );
  readonly validationIssueCount = computed(() =>
    this.validationChecks().filter((c) => !c.pass).length,
  );

  // --- Listing SEO score ---
  // Mirrors how Amazon KDP indexes listings: title/subtitle words are indexed
  // automatically (so backend keywords repeating them waste slots), the
  // description drives conversion, and 7 keyword slots is the hard cap.
  readonly seoChecks = computed(() => {
    const b = this.book();
    if (!b) return [];
    const listing = b.listing;
    const title = (listing.title ?? '').trim();
    const subtitle = (listing.subtitle ?? '').trim();
    const description = (listing.description ?? '').trim();
    const keywords = (listing.keywords ?? []).map((k) => k.trim()).filter((k) => k.length > 0);

    const titleWords = new Set(significantWords(`${title} ${subtitle}`));
    const duplicates = findDuplicateKeywords(keywords);
    const redundant = keywords.filter((kw) => {
      const words = significantWords(kw);
      return words.length > 0 && words.every((w) => titleWords.has(w));
    });
    const hasBullets = /^[-•*]\s?\S/m.test(description);
    const hasCta = /(buy|order|scroll up|gift|grab|get your|add to cart)/i.test(description);

    return [
      {
        label: 'Title present',
        pass: title.length > 0,
        detail: title.length > 0 ? 'Set' : 'Generate or write a listing title',
      },
      {
        label: 'Title length 20–100 chars',
        pass: title.length >= 20 && title.length <= 100,
        detail: title.length === 0 ? 'No title' : `${title.length} chars`,
      },
      {
        label: 'Subtitle present (prime keyword space)',
        pass: subtitle.length >= 15,
        detail: subtitle.length === 0 ? 'Missing' : `${subtitle.length} chars`,
      },
      {
        label: 'Description ≥ 400 chars',
        pass: description.length >= 400,
        detail: description.length === 0 ? 'Missing' : `${description.length} chars`,
      },
      {
        label: 'Description uses bullet points',
        pass: hasBullets,
        detail: hasBullets ? 'Found' : 'Add "- " lines listing what is inside',
      },
      {
        label: 'Description has a call to action',
        pass: hasCta,
        detail: hasCta ? 'Found' : 'e.g. "Scroll up and buy today"',
      },
      {
        label: 'All 7 backend keyword slots used',
        pass: keywords.length === 7,
        detail: `${keywords.length}/7`,
      },
      {
        label: 'No duplicate keywords',
        pass: duplicates.length === 0,
        detail: duplicates.length === 0 ? 'All unique' : `Duplicate: ${duplicates[0]}`,
      },
      {
        label: 'Keywords do not repeat title words',
        pass: redundant.length === 0,
        detail:
          redundant.length === 0
            ? 'No wasted slots'
            : `Redundant: "${redundant[0]}"`,
      },
      {
        label: 'Cover ready (click-through driver)',
        pass: b.coverImageReady,
        detail: b.coverImageReady ? 'Ready' : 'Upload or generate the cover',
      },
    ];
  });
  readonly seoScore = computed(() => {
    const checks = this.seoChecks();
    if (checks.length === 0) return 0;
    return Math.round((checks.filter((c) => c.pass).length / checks.length) * 100);
  });
  readonly seoGrade = computed(() => {
    const score = this.seoScore();
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 40) return 'Needs work';
    return 'Not ready';
  });

  // --- Royalty calculator ---
  readonly listPrice = signal(4.99);

  readonly royaltyInfo = computed(() => {
    const b = this.book();
    if (!b) return null;
    const price = this.listPrice();
    if (price <= 0) return null;

    // KDP Kindle eBook royalty tiers (US marketplace)
    const royaltyRate = price >= 2.99 && price <= 9.99 ? 0.70 : 0.35;

    // Estimated file size: ~300 KB per page image + 100 KB overhead
    // (Activity/story images are ~100 KB each after JPEG encode)
    const estFileMb = Math.max(0.5, (b.pageCount * 0.3 + 0.1));
    const deliveryCostPerMb = 0.15; // US marketplace
    const deliveryCost = estFileMb * deliveryCostPerMb;

    const grossRoyalty = price * royaltyRate;
    const netRoyalty = grossRoyalty - deliveryCost;

    return {
      royaltyRate,
      estFileMb: estFileMb.toFixed(1),
      deliveryCost: deliveryCost.toFixed(2),
      grossRoyalty: grossRoyalty.toFixed(2),
      netRoyalty: Math.max(0, netRoyalty).toFixed(2),
      netRoyaltyPercent: ((Math.max(0, netRoyalty) / price) * 100).toFixed(0),
    };
  });

  readonly readyCount = computed(() => this.book()?.pages.filter((p) => p.imageReady).length ?? 0);
  readonly totalCount = computed(() => this.book()?.pages.length ?? 0);
  readonly allReady = computed(() => this.totalCount() > 0 && this.readyCount() === this.totalCount());

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.bookApi.getBook(this.bookId).subscribe({
      next: (book) => {
        this.book.set(book);
        this.coverTitleDraft.set(book.coverTitleText ?? '');
        this.coverAuthorDraft.set(book.coverAuthorText ?? '');
        this.imageCacheBuster.update((n) => n + 1);
        if (book.redesignStatus === 'IN_PROGRESS' && !this.redesigning()) {
          this.pollRedesign();
        }
      },
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

  onBulkFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (files.length === 0) {
      return;
    }

    this.bulkUploading.set(true);
    this.bulkError.set(null);
    this.bulkResults.set(null);
    this.bookApi.bulkUploadPageImages(this.bookId, files).subscribe({
      next: (results) => {
        this.bulkUploading.set(false);
        this.bulkResults.set(results);
        this.reload();
      },
      error: (err) => {
        this.bulkUploading.set(false);
        this.bulkError.set(apiErrorMessage(err));
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

  /** Activity books only: render every missing puzzle page, one by one. */
  generateAllMissing(): void {
    const missing = (this.book()?.pages ?? [])
      .filter((p) => !p.imageReady)
      .map((p) => p.pageNumber);
    if (missing.length === 0) {
      return;
    }

    this.generatingAll.set(true);
    this.generatedAllCount.set(0);

    const renderNext = (index: number): void => {
      if (index >= missing.length) {
        this.generatingAll.set(false);
        this.reload();
        return;
      }
      const pageNumber = missing[index];
      this.clearPageError(pageNumber);
      this.bookApi.generatePageImage(this.bookId, pageNumber).subscribe({
        next: () => {
          this.generatedAllCount.update((n) => n + 1);
          renderNext(index + 1);
        },
        error: (err) => {
          this.setPageError(pageNumber, apiErrorMessage(err));
          renderNext(index + 1); // keep going; failures surface per-page
        },
      });
    };
    renderNext(0);
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
          true,
        );
      },
      error: (err) => {
        this.composing.set(false);
        this.composeError.set(apiErrorMessage(err));
      },
    });
  }

  triggerRedesign(): void {
    this.redesigning.set(true);
    this.redesignError.set(null);
    this.bookApi.triggerRedesign(this.bookId).subscribe({
      next: (book) => {
        this.book.set(book);
        this.pollRedesign();
      },
      error: (err) => {
        this.redesigning.set(false);
        this.redesignError.set(apiErrorMessage(err));
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
    chainRedesign = false,
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
            return;
          }
          // Interior DONE: automatically poll redesigned.pdf (preserved original still available)
          if (chainRedesign && b.redesignStatus === 'IN_PROGRESS') {
            this.redesigning.set(true);
            this.pollRedesign();
          } else if (chainRedesign && b.redesignStatus === 'DONE') {
            this.redesigning.set(false);
          }
        },
        error: (err) => {
          busy.set(false);
          error.set(apiErrorMessage(err));
        },
      });
  }

  private pollRedesign(): void {
    this.redesigning.set(true);
    interval(COMPOSE_POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.bookApi.getBook(this.bookId)),
        takeWhile((b) => b.redesignStatus === 'IN_PROGRESS', true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (b) => {
          this.book.set(b);
          if (b.redesignStatus === 'IN_PROGRESS') return;
          this.redesigning.set(false);
          if (b.redesignStatus === 'FAILED') {
            this.redesignError.set(b.redesignError ?? 'Redesign failed');
          }
        },
        error: (err) => {
          this.redesigning.set(false);
          this.redesignError.set(apiErrorMessage(err));
        },
      });
  }

  downloadUrl(): string {
    return this.bookApi.downloadInteriorUrl(this.bookId);
  }

  downloadEpubUrl(): string {
    return this.bookApi.downloadInteriorEpubUrl(this.bookId);
  }

  downloadRedesignedUrl(): string {
    return this.bookApi.downloadRedesignedUrl(this.bookId);
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

  pageImageUrl(pageNumber: number): string {
    return `${this.bookApi.pageImageUrl(this.bookId, pageNumber)}?v=${this.imageCacheBuster()}`;
  }

  coverImageUrl(): string {
    return `${this.bookApi.coverImageUrl(this.bookId)}?v=${this.imageCacheBuster()}`;
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

  // --- Version history ---

  toggleVersionHistory(pageNumber: number): void {
    if (this.versionHistoryPage() === pageNumber) {
      this.versionHistoryPage.set(null);
      this.versionHistory.set([]);
      return;
    }
    this.versionHistoryPage.set(pageNumber);
    this.loadingVersions.set(true);
    this.bookApi.getPageVersions(this.bookId, pageNumber).subscribe({
      next: (versions) => {
        this.versionHistory.set(versions);
        this.loadingVersions.set(false);
      },
      error: () => {
        this.versionHistory.set([]);
        this.loadingVersions.set(false);
      },
    });
  }

  restoreVersion(pageNumber: number, version: number): void {
    this.restoringVersion.set({ page: pageNumber, version });
    this.clearPageError(pageNumber);
    this.bookApi.restorePageVersion(this.bookId, pageNumber, version).subscribe({
      next: () => {
        this.restoringVersion.set(null);
        this.reload();
        // Refresh version history for this page
        this.bookApi.getPageVersions(this.bookId, pageNumber).subscribe({
          next: (versions) => this.versionHistory.set(versions),
        });
      },
      error: (err) => {
        this.restoringVersion.set(null);
        this.setPageError(pageNumber, apiErrorMessage(err));
      },
    });
  }

  versionImageUrl(pageNumber: number, version: number): string {
    return `${this.bookApi.pageVersionImageUrl(this.bookId, pageNumber, version)}?v=${this.imageCacheBuster()}`;
  }

  // --- Prompt editing ---

  startEditPrompt(pageNumber: number, imagePrompt: string, negativePrompt: string | null): void {
    this.editingPromptPage.set(pageNumber);
    this.promptDraft.set({
      imagePrompt: imagePrompt ?? '',
      negativePrompt: negativePrompt ?? '',
    });
  }

  updatePromptDraft(field: 'imagePrompt' | 'negativePrompt', value: string): void {
    this.promptDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  updateCoverPromptDraft(field: 'coverImagePrompt' | 'coverNegativePrompt', value: string): void {
    this.coverPromptDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  cancelEditPrompt(): void {
    this.editingPromptPage.set(null);
  }

  savePrompt(pageNumber: number): void {
    const draft = this.promptDraft();
    this.savingPromptPage.set(pageNumber);
    this.clearPageError(pageNumber);
    this.bookApi.updatePagePrompt(this.bookId, pageNumber, draft.imagePrompt, draft.negativePrompt).subscribe({
      next: () => {
        this.savingPromptPage.set(null);
        this.editingPromptPage.set(null);
        this.reload();
      },
      error: (err) => {
        this.savingPromptPage.set(null);
        this.setPageError(pageNumber, apiErrorMessage(err));
      },
    });
  }

  startEditCoverPrompt(): void {
    const b = this.book();
    if (!b) return;
    this.coverPromptDraft.set({
      coverImagePrompt: b.coverImagePrompt ?? '',
      coverNegativePrompt: b.coverNegativePrompt ?? '',
    });
    this.editingCoverPrompt.set(true);
  }

  cancelEditCoverPrompt(): void {
    this.editingCoverPrompt.set(false);
  }

  saveCoverPrompt(): void {
    const draft = this.coverPromptDraft();
    this.savingCoverPrompt.set(true);
    this.coverError.set(null);
    this.bookApi.updateCoverPrompt(this.bookId, draft.coverImagePrompt, draft.coverNegativePrompt).subscribe({
      next: (book) => {
        this.savingCoverPrompt.set(false);
        this.editingCoverPrompt.set(false);
        this.book.set(book);
      },
      error: (err) => {
        this.savingCoverPrompt.set(false);
        this.coverError.set(apiErrorMessage(err));
      },
    });
  }

  // --- Listing metadata ---

  generateListing(): void {
    this.generatingListing.set(true);
    this.listingError.set(null);
    this.bookApi.generateListing(this.bookId).subscribe({
      next: () => {
        this.generatingListing.set(false);
        this.reload();
      },
      error: (err) => {
        this.generatingListing.set(false);
        this.listingError.set(apiErrorMessage(err));
      },
    });
  }

  saveListingField(field: 'title' | 'subtitle' | 'description', value: string): void {
    this.savingListing.set(true);
    this.listingError.set(null);
    this.bookApi.updateListing(this.bookId, { [field]: value }).subscribe({
      next: () => {
        this.savingListing.set(false);
        this.reload();
      },
      error: (err) => {
        this.savingListing.set(false);
        this.listingError.set(apiErrorMessage(err));
      },
    });
  }

  copyListingText(key: string, text: string): void {
    navigator.clipboard?.writeText(text).then(() => {
      this.copiedListingField.set(key);
      setTimeout(() => {
        if (this.copiedListingField() === key) {
          this.copiedListingField.set(null);
        }
      }, 1500);
    });
  }

  // --- Publishing workflow ---

  setPublishStatus(status: PublishStatus): void {
    this.updatingStatus.set(true);
    this.bookApi.updatePublishStatus(this.bookId, status).subscribe({
      next: (book) => {
        this.updatingStatus.set(false);
        this.book.set(book);
      },
      error: () => {
        this.updatingStatus.set(false);
      },
    });
  }

  // --- Revenue tracking ---

  loadRevenue(): void {
    this.revenueLoading.set(true);
    this.bookApi.listRevenue(this.bookId).subscribe({
      next: (entries) => {
        this.revenueEntries.set(entries);
        this.revenueLoading.set(false);
      },
      error: (err) => {
        this.revenueError.set(apiErrorMessage(err));
        this.revenueLoading.set(false);
      },
    });
  }

  toggleRevenue(): void {
    if (this.revenueEntries().length > 0) {
      this.revenueEntries.set([]);
      return;
    }
    this.loadRevenue();
  }

  addRevenueEntry(): void {
    const period = this.newRevenuePeriod().trim();
    if (!period) return;
    this.addingRevenue.set(true);
    this.revenueError.set(null);
    this.bookApi
      .addRevenueEntry(this.bookId, {
        period,
        units: this.newRevenueUnits(),
        royaltyUsd: this.newRevenueRoyalty(),
        marketplace: this.newRevenueMarketplace(),
      })
      .subscribe({
        next: () => {
          this.addingRevenue.set(false);
          this.loadRevenue();
        },
        error: (err) => {
          this.addingRevenue.set(false);
          this.revenueError.set(apiErrorMessage(err));
        },
      });
  }

  deleteRevenueEntry(entryId: number): void {
    this.bookApi.deleteRevenueEntry(this.bookId, entryId).subscribe({
      next: () => this.loadRevenue(),
      error: (err) => this.revenueError.set(apiErrorMessage(err)),
    });
  }

  // --- Cover options ---

  saveCoverOptions(): void {
    this.savingCoverOptions.set(true);
    this.coverError.set(null);
    this.bookApi
      .updateCoverOptions(this.bookId, {
        coverTitleText: this.coverTitleDraft(),
        coverAuthorText: this.coverAuthorDraft(),
      })
      .subscribe({
        next: (book) => {
          this.savingCoverOptions.set(false);
          this.book.set(book);
        },
        error: (err) => {
          this.savingCoverOptions.set(false);
          this.coverError.set(apiErrorMessage(err));
        },
      });
  }

  toggleFullBleed(checked: boolean): void {
    this.savingCoverOptions.set(true);
    this.bookApi.updateCoverOptions(this.bookId, { fullBleedImages: checked }).subscribe({
      next: (book) => {
        this.savingCoverOptions.set(false);
        this.book.set(book);
      },
      error: () => {
        this.savingCoverOptions.set(false);
      },
    });
  }
}

/** "2026-08" style current month, the default for a new revenue entry. */
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Lowercased words long enough to be meaningful for search indexing,
 * with common filler words removed. Used by the SEO checks to decide
 * whether a backend keyword is already covered by the title/subtitle.
 */
function significantWords(text: string): string[] {
  const STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'for', 'with', 'my', 'your', 'of', 'to',
    'in', 'on', 'is', 'it', 'its', 'this', 'that', 'book', 'kids', 'children',
  ]);
  return (text.toLowerCase().match(/[a-z\u0600-\u06FF]+/g) ?? [])
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Keywords that appear more than once (case-insensitive). */
function findDuplicateKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const kw of keywords) {
    const key = kw.toLowerCase();
    if (seen.has(key)) {
      dupes.add(kw);
    }
    seen.add(key);
  }
  return [...dupes];
}
