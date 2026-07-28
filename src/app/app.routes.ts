import { Routes } from '@angular/router';

import { BookSetupComponent } from './pages/book-setup/book-setup.component';
import { BookWorkspaceComponent } from './pages/book-workspace/book-workspace.component';

export const routes: Routes = [
  { path: '', component: BookSetupComponent },
  { path: 'books/:id', component: BookWorkspaceComponent },
  { path: '**', redirectTo: '' },
];
