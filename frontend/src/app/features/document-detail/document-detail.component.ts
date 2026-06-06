import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, finalize, map, switchMap, tap } from 'rxjs';

import { DocumentService } from '../../services/document.service';
import { ApiError } from '../../core/errors/api-error';
import {
  DocumentDetail,
  DocumentStatus,
  STATUS_CONFIG,
  isProcessing
} from '../../models/document.model';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

interface TimelineStep {
  status: DocumentStatus;
  label: string;
  desc: string;
}

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, StatusBadgeComponent, ProgressBarComponent, SkeletonComponent],
  templateUrl: './document-detail.component.html'
})
export class DocumentDetailComponent implements OnInit {
  private readonly route           = inject(ActivatedRoute);
  private readonly documentService = inject(DocumentService);
  private readonly destroyRef      = inject(DestroyRef);

  // ── State ────────────────────────────────────────────────────
  readonly document    = signal<DocumentDetail | null>(null);
  readonly loading     = signal(true);
  readonly polling     = signal(false);
  readonly errorMsg    = signal<string | null>(null);
  readonly lastUpdated = signal<Date | null>(null);

  // ── Timeline steps ───────────────────────────────────────────
  readonly timelineSteps: TimelineStep[] = [
    { status: 'PENDING',    label: 'Fila recebida',      desc: 'Documento registrado e aguardando recursos.' },
    { status: 'PROCESSING', label: 'Processamento ativo', desc: 'Worker AI aplicando OCR e extração de texto.' },
    { status: 'COMPLETED',  label: 'Entrega concluída',   desc: 'Conteúdo extraído e pronto para consumo.' }
  ];

  // ── Computed ─────────────────────────────────────────────────
  readonly doc          = computed(() => this.document());
  readonly docStatus    = computed(() => this.document()?.status ?? 'PENDING');
  readonly statusCfg    = computed(() => STATUS_CONFIG[this.docStatus()]);
  readonly isActive     = computed(() => isProcessing(this.docStatus() as DocumentStatus));

  // ── Init ─────────────────────────────────────────────────────
  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        tap((id) => {
          if (!id) {
            this.errorMsg.set('ID do documento inválido ou não fornecido.');
            this.loading.set(false);
          }
        }),
        filter((id): id is string => Boolean(id)),
        tap(() => {
          this.loading.set(true);
          this.polling.set(true);
          this.errorMsg.set(null);
          this.document.set(null);
        }),
        switchMap((id) =>
          this.documentService.pollDocumentById(id).pipe(
            finalize(() => this.polling.set(false))
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (doc) => {
          this.document.set(doc);
          this.loading.set(false);
          this.lastUpdated.set(new Date());
        },
        error: (err: ApiError) => {
          this.errorMsg.set(err.message);
          this.loading.set(false);
          this.polling.set(false);
        }
      });
  }

  // ── Timeline helpers ─────────────────────────────────────────
  getStepState(step: DocumentStatus): 'complete' | 'current' | 'pending' | 'failed' {
    const status = this.docStatus();
    if (!status) return 'pending';
    if (status === 'FAILED') return step === 'COMPLETED' ? 'failed' : 'complete';
    const order        = ['PENDING', 'PROCESSING', 'COMPLETED'];
    const currentIndex = order.indexOf(status);
    const stepIndex    = order.indexOf(step);
    if (stepIndex < currentIndex)  return 'complete';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  }
}
