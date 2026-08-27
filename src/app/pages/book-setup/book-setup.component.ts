import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { BookApiService } from '../../core/services/book-api.service';
import { apiErrorMessage } from '../../core/services/api-error';
import { BookLanguage, BookType, LANGUAGES, PUZZLE_TYPES, TRIM_SIZES } from '../../core/models/book.models';

@Component({
  selector: 'app-book-setup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './book-setup.component.html',
  styleUrl: './book-setup.component.css',
})
export class BookSetupComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly bookApi = inject(BookApiService);
  private readonly router = inject(Router);

  readonly trimSizes = TRIM_SIZES;
  readonly puzzleTypes = PUZZLE_TYPES;
  readonly languages = LANGUAGES;

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    bookType: this.fb.control<BookType>('story', Validators.required),
    language: this.fb.control<BookLanguage>('ar', Validators.required),
    theme: ['', Validators.required],
    ageBand: ['4-6'],
    mainCharacter: [''],
    pageCount: [24, [Validators.required, Validators.min(1), Validators.max(828)]],
    artStyle: ['watercolor, soft pastel colors'],
    includeCaption: [true],
    // Coloring/activity books only; "index" keys into trimSizes.
    trimSize: ['0'],
    // Activity books only.
    puzzleType: ['WORD_SEARCH'],
    colorAccents: [false],
  });

  readonly bookType = toSignal(this.form.controls.bookType.valueChanges, {
    initialValue: this.form.controls.bookType.value,
  });

  constructor() {
    this.form.controls.bookType.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((bookType) => this.applyStoryFieldValidators(bookType));
    this.applyStoryFieldValidators(this.form.controls.bookType.value);
  }

  /** ageBand/mainCharacter/artStyle only apply to "story" books -- coloring
   * books have no continuous narrative or single main character. */
  private applyStoryFieldValidators(bookType: BookType): void {
    const storyControls = [
      this.form.controls.ageBand,
      this.form.controls.mainCharacter,
      this.form.controls.artStyle,
    ];
    for (const control of storyControls) {
      if (bookType === 'story') {
        control.setValidators(Validators.required);
      } else {
        control.clearValidators();
      }
      control.updateValueAndValidity();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    // Page size is a coloring/activity-book choice; story books stay on the
    // locked 8.5x8.5 default and send no trim fields at all.
    const trim = this.trimSizes[Number(raw.trimSize)] ?? this.trimSizes[0];
    const needsTrim = raw.bookType === 'coloring' || raw.bookType === 'activity';
    const request = {
      ...raw,
      language: raw.language as BookLanguage,
      ...(needsTrim ? { trimWidthIn: trim.widthIn, trimHeightIn: trim.heightIn } : {}),
      ...(raw.bookType === 'activity' ? { puzzleType: raw.puzzleType } : {}),
      ...(raw.bookType === 'activity' ? { colorAccents: raw.colorAccents } : {}),
    };
    delete (request as { trimSize?: string }).trimSize;
    // puzzleType is a real API field for activity books -- only strip it for
    // the other book types (it was only ever a form-control default there).
    if (raw.bookType !== 'activity') {
      delete (request as { puzzleType?: string }).puzzleType;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.bookApi.createBook(request).subscribe({
      next: (book) => this.router.navigate(['/books', book.id]),
      error: (err) => {
        this.submitting.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }
}
