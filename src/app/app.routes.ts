import { Routes } from '@angular/router';

import { BookListComponent } from './pages/book-list/book-list.component';
import { BookSetupComponent } from './pages/book-setup/book-setup.component';
import { BookWorkspaceComponent } from './pages/book-workspace/book-workspace.component';

export const routes: Routes = [
  { path: '', component: BookListComponent },
  { path: 'books/new', component: BookSetupComponent },
  { path: 'books/:id', component: BookWorkspaceComponent },
  { path: '**', redirectTo: '' },
];
