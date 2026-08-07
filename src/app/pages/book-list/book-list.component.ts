import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BookApiService } from '../../core/services/book-api.service';
import { apiErrorMessage } from '../../core/services/api-error';
import { BookSummary } from '../../core/models/book.models';

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './book-list.component.html',
  styleUrl: './book-list.component.css',
})
export class BookListComponent implements OnInit {
  private readonly bookApi = inject(BookApiService);

  readonly books = signal<BookSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<number | null>(null);

  ngOnInit(): void {
    this.bookApi.listBooks().subscribe({
      next: (books) => {
        this.books.set(books);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  deleteBook(book: BookSummary): void {
    const title = book.titleAr || book.theme;
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) {
      return;
    }

    this.error.set(null);
    this.deletingId.set(book.id);
    this.bookApi.deleteBook(book.id).subscribe({
      next: () => {
        this.books.update((books) => books.filter((b) => b.id !== book.id));
        this.deletingId.set(null);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err));
        this.deletingId.set(null);
      },
    });
  }
}
