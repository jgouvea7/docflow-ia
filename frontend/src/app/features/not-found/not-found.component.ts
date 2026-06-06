import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="animate-fade-up flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <!-- Glowing 404 -->
      <div class="relative">
        <p
          class="font-display select-none text-[8rem] font-black leading-none tracking-tighter text-surface-700 sm:text-[12rem]"
          style="text-shadow: 0 0 80px rgba(99,102,241,0.15)"
        >
          404
        </p>
        <div
          class="absolute inset-0 flex items-center justify-center"
          style="background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)"
        ></div>
      </div>

      <div class="space-y-2">
        <h1 class="font-display text-2xl font-bold text-slate-200">Página não encontrada</h1>
        <p class="max-w-sm text-sm text-slate-500">
          A rota que você tentou acessar não existe ou foi removida.
        </p>
      </div>

      <a
        routerLink="/upload"
        class="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
        style="background: linear-gradient(135deg,#6366f1,#4f46e5); box-shadow: 0 4px 14px rgba(99,102,241,0.35)"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
        </svg>
        Ir para o início
      </a>
    </div>
  `
})
export class NotFoundComponent {}
