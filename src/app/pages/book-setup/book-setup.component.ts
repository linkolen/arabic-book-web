import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';

import { BookApiService } from '../../core/services/book-api.service';
import { apiErrorMessage } from '../../core/services/api-error';

@Component({
  selector: 'app-book-setup',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './book-setup.component.html',
  styleUrl: './book-setup.component.css',
})
export class BookSetupComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly bookApi = inject(BookApiService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    theme: ['', Validators.required],
    ageBand: ['4-6', Validators.required],
    mainCharacter: ['', Validators.required],
    pageCount: [24, [Validators.required, Validators.min(1), Validators.max(828)]],
    artStyle: ['watercolor, soft pastel colors', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.bookApi.createBook(this.form.getRawValue()).subscribe({
      next: (book) => this.router.navigate(['/books', book.id]),
      error: (err) => {
        this.submitting.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }
}
