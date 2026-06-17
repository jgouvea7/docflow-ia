import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'upload',
        loadComponent: () =>
          import('./features/upload/upload.component').then((m) => m.UploadComponent)
      },
      {
        path: 'documents/:id',
        loadComponent: () =>
          import('./features/document-detail/document-detail.component').then(
            (m) => m.DocumentDetailComponent
          )
      },
      {
        path: 'documents/:id/chat',
        loadComponent: () =>
          import('./features/document-chat/document-chat.component').then(
            (m) => m.DocumentChatComponent
          )
      },
      {
        path: 'arquivos',
        loadComponent: () =>
          import('./features/my-files/my-files.component').then((m) => m.MyFilesComponent)
      },
      {
        path: '',
        redirectTo: 'upload',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent)
  }
];
