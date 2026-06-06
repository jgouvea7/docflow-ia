export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface UploadResponse {
  documentId: string;
  jobId: string;
  status: DocumentStatus;
}

export interface DocumentSummary {
  id: string;
  fileName: string;
  fileSize: number;
  status: DocumentStatus;
  uploadedAt: string;
  completedAt?: string | null;
  progressPercentage?: number | null;
  errorMessage?: string | null;
  jobId?: string | null;
}

export interface DocumentDetail {
  id: string;
  fileName: string;
  createdAt: string;
  completedAt?: string | null;
  status: DocumentStatus;
  progressPercentage?: number | null;
  errorMessage?: string | null;
  content?: string | null;
  jobId?: string | null;
}

export interface DocumentStatusView {
  documentId: string;
  jobId?: string | null;
  status: DocumentStatus;
  progressPercentage?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  errorMessage?: string | null;
}

export interface JobSummary {
  jobId: string;
  documentId: string;
  fileName: string;
  status: DocumentStatus;
  attempts: number;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  progressPercentage?: number | null;
  errorMessage?: string | null;
  processingDurationSeconds?: number | null;
}

export type UploadState =
  | { phase: 'idle' }
  | { phase: 'progress'; progress: number }
  | { phase: 'complete'; response: UploadResponse }
  | { phase: 'error'; message: string };

export const STATUS_CONFIG: Record<DocumentStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}> = {
  PENDING: {
    label: 'Na fila',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    borderColor: 'border-amber-400/20',
    dotColor: 'bg-amber-400'
  },
  PROCESSING: {
    label: 'Processando',
    color: 'text-brand-400',
    bgColor: 'bg-brand-400/10',
    borderColor: 'border-brand-400/20',
    dotColor: 'bg-brand-400'
  },
  COMPLETED: {
    label: 'Concluído',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    borderColor: 'border-emerald-400/20',
    dotColor: 'bg-emerald-400'
  },
  FAILED: {
    label: 'Falhou',
    color: 'text-rose-400',
    bgColor: 'bg-rose-400/10',
    borderColor: 'border-rose-400/20',
    dotColor: 'bg-rose-400'
  }
};

export function isProcessing(status: DocumentStatus): boolean {
  return status === 'PENDING' || status === 'PROCESSING';
}
