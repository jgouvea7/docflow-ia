import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex min-h-dvh flex-col bg-surface-900">
      <header class="glass sticky top-0 z-50 border-b border-border-subtle">
        <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a routerLink="/upload" class="group flex items-center gap-3 outline-none">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-lg transition-transform duration-200 group-hover:scale-105"
              style="box-shadow: 0 0 16px rgba(99,102,241,0.4)"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3h7a4 4 0 0 1 0 8H3V3Z" fill="white" opacity="0.9"/>
                <path d="M3 11h5v4H3v-4Z" fill="white" opacity="0.5"/>
                <path d="M11 11h4v2h-4v-2Z" fill="white" opacity="0.7"/>
              </svg>
            </div>
            <div class="leading-tight">
              <p class="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500">DocFlow</p>
              <p class="font-display text-sm font-bold text-slate-100">AI Console</p>
            </div>
          </a>

          <nav class="flex items-center gap-1">
            <a
              routerLink="/upload"
              routerLinkActive="bg-surface-600 text-slate-100"
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-all duration-150 hover:bg-surface-700 hover:text-slate-200"
            >
              Upload
            </a>
            <a
              routerLink="/arquivos"
              routerLinkActive="bg-surface-600 text-slate-100"
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-all duration-150 hover:bg-surface-700 hover:text-slate-200"
            >
              Meus Arquivos
            </a>
          </nav>

          <div class="flex items-center gap-3">
            <div class="hidden flex-col items-end sm:flex">
              <p class="text-sm font-medium text-slate-200">{{ authService.user()?.username }}</p>
              <p class="text-xs text-slate-500">{{ authService.user()?.email }}</p>
            </div>
            <button
              type="button"
              class="rounded-lg border border-border-subtle px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-surface-700 hover:text-slate-100"
              (click)="logout()"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <router-outlet />
      </main>

      <footer class="border-t border-border-subtle py-4">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <p class="text-center text-xs text-slate-600">
            DocFlow AI - Extração inteligente de documentos
          </p>
        </div>
      </footer>
    </div>
  `
})
export class ShellComponent {
  readonly authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }
}
