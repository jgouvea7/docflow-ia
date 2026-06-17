import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, interval, startWith, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DocumentService } from '../../services/document.service';
import { JobService } from '../../services/job.service';
import { ApiError } from '../../core/errors/api-error';
import { DocumentSummary, JobSummary } from '../../models/document.model';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { FileSizePipe } from '../../shared/pipes/file-size.pipe';

@Component({
  selector: 'app-my-files',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    StatusBadgeComponent,
    ProgressBarComponent,
    SkeletonComponent,
    FileSizePipe
  ],
  template: `
    <div class="space-y-8">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-[0.4em] text-brand-400">Meus Arquivos</p>
          <h1 class="font-display text-3xl font-bold text-slate-100 sm:text-4xl">
            Uploads persistidos e status em tempo real
          </h1>
          <p class="max-w-2xl text-sm text-slate-400">
            Acompanhe seus arquivos enviados, veja o progresso do processamento e remova itens quando precisar.
          </p>
        </div>

        <a
          routerLink="/upload"
          class="inline-flex items-center justify-center rounded-xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
        >
          Novo upload
        </a>
      </div>

      @if (errorMessage()) {
        <div class="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {{ errorMessage() }}
        </div>
      }

      <section class="card-elevated rounded-3xl p-6">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="font-display text-xl font-semibold text-slate-100">Uploads</h2>
            <p class="text-xs text-slate-500">Atualização automática a cada 5 segundos.</p>
          </div>
          <span class="text-xs text-slate-500">{{ documents().length }} itens</span>
        </div>

        <div class="mt-5 space-y-4">
          @if (loading()) {
            @for (i of [1, 2, 3]; track i) {
              <div class="rounded-2xl border border-border-subtle bg-surface-800/50 p-4">
                <app-skeleton height="1rem" width="45%" />
                <div class="mt-3 grid gap-3 md:grid-cols-3">
                  <app-skeleton height="0.8rem" width="100%" />
                  <app-skeleton height="0.8rem" width="100%" />
                  <app-skeleton height="0.8rem" width="100%" />
                </div>
              </div>
            }
          } @else if (documents().length === 0) {
            <div class="rounded-2xl border border-dashed border-border-subtle bg-surface-800/40 p-8 text-center">
              <p class="text-sm text-slate-400">Nenhum upload encontrado.</p>
              <a routerLink="/upload" class="mt-4 inline-flex rounded-xl bg-brand-gradient px-4 py-2 text-sm font-medium text-white">
                Fazer primeiro upload
              </a>
            </div>
          } @else {
            @for (doc of documents(); track doc.id) {
              <article class="rounded-2xl border border-border-subtle bg-surface-800/50 p-4">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-3">
                      <h3 class="truncate text-base font-semibold text-slate-100">{{ doc.fileName }}</h3>
                      <app-status-badge [status]="doc.status" [pulse]="doc.status === 'PROCESSING' || doc.status === 'PENDING'"></app-status-badge>
                    </div>

                    <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p class="text-[10px] uppercase tracking-[0.3em] text-slate-500">Enviado em</p>
                        <p class="mt-1 text-sm text-slate-300">{{ doc.uploadedAt | date:'dd/MM/yyyy HH:mm' }}</p>
                      </div>
                      <div>
                        <p class="text-[10px] uppercase tracking-[0.3em] text-slate-500">Tamanho</p>
                        <p class="mt-1 text-sm text-slate-300">{{ doc.fileSize | fileSize }}</p>
                      </div>
                      <div>
                        <p class="text-[10px] uppercase tracking-[0.3em] text-slate-500">Concluído</p>
                        <p class="mt-1 text-sm text-slate-300">{{ doc.completedAt ? (doc.completedAt | date:'dd/MM/yyyy HH:mm') : 'Aguardando' }}</p>
                      </div>
                      <div>
                        <p class="text-[10px] uppercase tracking-[0.3em] text-slate-500">Job</p>
                        <p class="mt-1 truncate text-sm font-mono text-slate-400">{{ doc.jobId ?? 'N/A' }}</p>
                      </div>
                    </div>

                    @if (doc.progressPercentage !== null && doc.progressPercentage !== undefined) {
                      <div class="mt-4 max-w-xl">
                        <app-progress-bar [progress]="doc.progressPercentage ?? 0" [label]="'Progresso'" />
                      </div>
                    }

                    @if (doc.errorMessage) {
                      <div class="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                        {{ doc.errorMessage }}
                      </div>
                    }
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <a
                      [routerLink]="['/documents', doc.id]"
                      class="rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-surface-700"
                    >
                      Detalhes
                    </a>
                    @if (doc.status === 'COMPLETED') {
                      <a
                        [routerLink]="['/documents', doc.id, 'chat']"
                        class="rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-400 transition hover:bg-brand-500/20"
                      >
                        Conversar
                      </a>
                    }
                    <button
                      type="button"
                      class="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
                      (click)="deleteDocument(doc)"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
            }
          }
        </div>
      </section>
    </div>
  `
})
export class MyFilesComponent {
  private readonly documentService = inject(DocumentService);
  private readonly jobService = inject(JobService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly documents = signal<DocumentSummary[]>([]);
  readonly jobs = signal<JobSummary[]>([]);

  constructor() {
    interval(5000)
      .pipe(startWith(0), switchMap(() => forkJoin({
        documents: this.documentService.listMyDocuments(),
        jobs: this.jobService.listMyJobs()
      })), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ documents, jobs }) => {
          this.documents.set(documents);
          this.jobs.set(jobs);
          this.loading.set(false);
          this.errorMessage.set(null);
        },
        error: (error: ApiError) => {
          this.errorMessage.set(error.message);
          this.loading.set(false);
        }
      });
  }

  deleteDocument(document: DocumentSummary): void {
    this.documentService.deleteDocument(document.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.refreshNow(),
        error: (error: ApiError) => this.errorMessage.set(error.message)
      });
  }

  deleteJob(job: JobSummary): void {
    this.jobService.deleteJob(job.jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.refreshNow(),
        error: (error: ApiError) => this.errorMessage.set(error.message)
      });
  }

  private refreshNow(): void {
    forkJoin({
      documents: this.documentService.listMyDocuments(),
      jobs: this.jobService.listMyJobs()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: ({ documents, jobs }) => {
        this.documents.set(documents);
        this.jobs.set(jobs);
      }
    });
  }
}
