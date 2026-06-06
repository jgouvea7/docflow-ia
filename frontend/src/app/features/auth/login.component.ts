import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/errors/api-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="mx-auto grid min-h-[calc(100dvh-2rem)] max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section class="space-y-6">
        <div class="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-800/70 px-4 py-2 text-xs uppercase tracking-[0.35em] text-brand-300">
          DocFlow AI
        </div>
        <div class="space-y-4">
          <h1 class="font-display text-4xl font-bold text-slate-100 sm:text-5xl">
            Acesse seus documentos com segurança
          </h1>
          <p class="max-w-xl text-sm leading-6 text-slate-400">
            Entre para acompanhar uploads, histórico de jobs e o processamento automático de cada arquivo enviado.
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          @for (item of highlights; track item.title) {
            <div class="card-elevated rounded-2xl p-4">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ item.title }}</p>
              <p class="mt-2 text-sm text-slate-300">{{ item.description }}</p>
            </div>
          }
        </div>
      </section>

      <section class="card-elevated rounded-[1.75rem] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-brand-400">Login</p>
          <h2 class="font-display text-2xl font-bold text-slate-100">Entre na sua conta</h2>
        </div>

        <form class="mt-6 space-y-4" [formGroup]="form" (ngSubmit)="onSubmit()">
          <label class="block space-y-2">
            <span class="text-sm font-medium text-slate-300">Email ou usuário</span>
            <input
              type="text"
              formControlName="identifier"
              class="w-full rounded-xl border border-border-default bg-surface-800 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-brand-500"
              placeholder="seu@email.com ou seu usuário"
            />
            @if (form.controls.identifier.touched && form.controls.identifier.invalid) {
              <span class="text-xs text-rose-400">Informe seu email ou usuário.</span>
            }
          </label>

          <label class="block space-y-2">
            <span class="text-sm font-medium text-slate-300">Senha</span>
            <input
              type="password"
              formControlName="password"
              class="w-full rounded-xl border border-border-default bg-surface-800 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-brand-500"
              placeholder="Sua senha"
            />
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <span class="text-xs text-rose-400">A senha deve ter pelo menos 8 caracteres.</span>
            }
          </label>

          @if (errorMessage()) {
            <div class="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {{ errorMessage() }}
            </div>
          }

          <button
            type="submit"
            class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-3 font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="loading()"
          >
            @if (loading()) {
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
              Entrando...
            } @else {
              Entrar
            }
          </button>
        </form>

        <p class="mt-6 text-sm text-slate-400">
          Não tem conta?
          <a routerLink="/register" class="font-medium text-brand-300 hover:text-brand-200">Criar cadastro</a>
        </p>
      </section>
    </div>
  `
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly highlights = [
    { title: 'Segurança', description: 'Autenticação JWT e rotas protegidas.' },
    { title: 'Histórico', description: 'Uploads e jobs persistidos por usuário.' },
    { title: 'Automação', description: 'Status atualizado em tempo real.' }
  ];

  readonly form = this.fb.group({
    identifier: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  onSubmit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService
      .login(this.form.getRawValue())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/upload';
          void this.router.navigateByUrl(returnUrl);
        },
        error: (error: ApiError) => {
          this.errorMessage.set(error.message);
        }
      });
  }
}
