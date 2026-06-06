import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { DocumentService } from '../../services/document.service';
import { ApiError } from '../../core/errors/api-error';
import { UploadResponse, UploadState } from '../../models/document.model';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { FileSizePipe } from '../../shared/pipes/file-size.pipe';

type UploadPhase = 'idle' | 'uploading' | 'success' | 'error';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [ProgressBarComponent, FileSizePipe],
  templateUrl: './upload.component.html'
})
export class UploadComponent {
  private readonly documentService = inject(DocumentService);
  private readonly destroyRef      = inject(DestroyRef);
  private readonly router          = inject(Router);

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  // ── State ────────────────────────────────────────────────────
  readonly phase    = signal<UploadPhase>('idle');
  readonly file     = signal<File | null>(null);
  readonly progress = signal(0);
  readonly response = signal<UploadResponse | null>(null);
  readonly errorMsg = signal<string | null>(null);
  readonly dragOver = signal(false);

  // ── Static Data ─────────────────────────────────────────────
  readonly pipelineSteps = [
    {
      icon: '📥',
      label: 'Recepção segura',
      desc: 'Arquivo registrado e armazenado com segurança.',
      iconClass: 'bg-brand-500/10'
    },
    {
      icon: '🔍',
      label: 'Extração por IA',
      desc: 'OCR e NLP extraem texto com alta precisão.',
      iconClass: 'bg-accent-400/10'
    },
    {
      icon: '✅',
      label: 'Entrega imediata',
      desc: 'Conteúdo pronto para consumo via API.',
      iconClass: 'bg-emerald-500/10'
    }
  ];

  readonly formats = ['PDF', 'PNG', 'JPG', 'JPEG', 'TIFF', 'WEBP', 'GIF'];

  // ── Computed ─────────────────────────────────────────────────
  readonly isUploading = computed(() => this.phase() === 'uploading');
  readonly isSuccess   = computed(() => this.phase() === 'success');
  readonly isError     = computed(() => this.phase() === 'error');

  readonly fileExtension = computed(() => {
    const name = this.file()?.name ?? '';
    return name.split('.').pop()?.toUpperCase() ?? '';
  });

  readonly fileIcon = computed(() => {
    const ext = this.fileExtension().toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'tiff'].includes(ext)) return 'image';
    return 'generic';
  });

  // ── Drag & Drop ──────────────────────────────────────────────
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) this.selectFile(f);
  }

  onFileInputChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (f) this.selectFile(f);
  }

  // ── File Selection ───────────────────────────────────────────
  private selectFile(f: File): void {
    this.file.set(f);
    this.phase.set('idle');
    this.errorMsg.set(null);
    this.progress.set(0);
  }

  clearFile(): void {
    this.file.set(null);
    this.phase.set('idle');
    this.progress.set(0);
    this.errorMsg.set(null);
    this.response.set(null);
    const input = this.fileInput();
    if (input) input.nativeElement.value = '';
  }

  // ── Upload ───────────────────────────────────────────────────
  onSubmit(e: Event): void {
    e.preventDefault();
    const f = this.file();
    if (!f || this.isUploading()) return;

    this.phase.set('uploading');
    this.progress.set(0);
    this.errorMsg.set(null);

    this.documentService
      .uploadDocument(f)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (this.phase() === 'uploading') this.phase.set('idle');
        })
      )
      .subscribe({
        next: (state: UploadState) => {
          if (state.phase === 'progress') {
            this.progress.set(state.progress);
          } else if (state.phase === 'complete') {
            this.progress.set(100);
            this.response.set(state.response);
            this.phase.set('success');
            this.file.set(null);
          }
        },
        error: (err: ApiError) => {
          this.errorMsg.set(err.message);
          this.phase.set('error');
        }
      });
  }

  goToDocument(): void {
    const id = this.response()?.documentId;
    if (id) this.router.navigate(['/documents', id]);
  }
}
