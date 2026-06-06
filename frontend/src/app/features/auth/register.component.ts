import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/errors/api-error';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="mx-auto grid min-h-[calc(100dvh-2rem)] max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[0.95fr_1.05fr]">
      <section class="space-y-6 order-2 lg:order-1">
        <div class="card-elevated rounded-[1.75rem] p-6 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-brand-400">Registro</p>
          <h1 class="mt-2 font-display text-3xl font-bold text-slate-100">Crie sua conta</h1>
          <p class="mt-2 text-sm text-slate-400">
            Crie um acesso para acompanhar seus uploads, acessar o histórico e voltar aos arquivos quando quiser.
          </p>

          <form class="mt-6 space-y-4" [formGroup]="form" (ngSubmit)="onSubmit()">
            <label class="block space-y-2">
              <span class="text-sm font-medium text-slate-300">Email</span>
              <input
                type="email"
                formControlName="email"
                class="w-full rounded-xl border border-border-default bg-surface-800 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-brand-500"
                placeholder="seu@email.com"
              />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <span class="text-xs text-rose-400">Informe um email válido.</span>
              }
            </label>

            <label class="block space-y-2">
              <span class="text-sm font-medium text-slate-300">Usuário</span>
              <input
                type="text"
                formControlName="username"
                class="w-full rounded-xl border border-border-default bg-surface-800 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-brand-500"
                placeholder="Seu usuário"
              />
              @if (form.controls.username.touched && form.controls.username.invalid) {
                <span class="text-xs text-rose-400">O usuário deve ter entre 3 e 40 caracteres.</span>
              }
            </label>

            <label class="block space-y-2">
              <span class="text-sm font-medium text-slate-300">Senha</span>
              <input
                type="password"
                formControlName="password"
                class="w-full rounded-xl border border-border-default bg-surface-800 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-brand-500"
                placeholder="Mínimo 8 caracteres"
              />
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <span class="text-xs text-rose-400">A senha deve ter pelo menos 8 caracteres.</span>
              }
            </label>

            <label class="block space-y-2">
              <span class="text-sm font-medium text-slate-300">Confirmar senha</span>
              <input
                type="password"
                formControlName="confirmPassword"
                class="w-full rounded-xl border border-border-default bg-surface-800 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-brand-500"
                placeholder="Repita a senha"
              />
              @if (form.errors?.['passwordMismatch'] && form.controls.confirmPassword.touched) {
                <span class="text-xs text-rose-400">As senhas não coincidem.</span>
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
                Criando conta...
              } @else {
                Criar conta
              }
            </button>
          </form>

          <p class="mt-6 text-sm text-slate-400">
            Já tem conta?
            <a routerLink="/login" class="font-medium text-brand-300 hover:text-brand-200">Entrar</a>
          </p>
        </div>
      </section>

      <section class="order-1 space-y-6 lg:order-2">
        <div class="space-y-4">
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-accent-400">Acesso unificado</p>
          <h2 class="font-display text-4xl font-bold text-slate-100 sm:text-5xl">
            Uploads, jobs e histórico em um só fluxo
          </h2>
          <p class="max-w-xl text-sm leading-6 text-slate-400">
            Registre-se para manter tudo persistido por usuário, com segurança baseada em JWT e acesso controlado.
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          @for (item of highlights; track item.title) {
            <div class="card rounded-2xl p-4">
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ item.title }}</p>
              <p class="mt-2 text-sm text-slate-300">{{ item.description }}</p>
            </div>
          }
        </div>
      </section>
    </div>
  `
})
export class RegisterComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly highlights = [
    { title: 'Cadastro seguro', description: 'Email e usuário validados na API.' },
    { title: 'Sessão', description: 'Token salvo na sessão do navegador.' },
    { title: 'Barreiras', description: 'Guard e interceptor automáticos.' },
    { title: 'Histórico', description: 'Upload e jobs persistidos.' }
  ];

  readonly form = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(40)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    },
    {
      validators: (group) => {
        const password = group.get('password')?.value;
        const confirmPassword = group.get('confirmPassword')?.value;
        return password === confirmPassword ? null : { passwordMismatch: true };
      }
    }
  );

  onSubmit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService
      .register(this.form.getRawValue())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => void this.router.navigate(['/upload']),
        error: (error: ApiError) => {
          this.errorMessage.set(error.message);
        }
      });
  }
}
