import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  catchError,
  filter,
  map,
  Observable,
  switchMap,
  takeWhile,
  throwError,
  timeout,
  timer
} from 'rxjs';

import { environment } from '../../environments/environment';
import { toApiError } from '../core/errors/api-error';
import {
  DocumentDetail,
  DocumentStatusView,
  DocumentSummary,
  isProcessing,
  UploadResponse,
  UploadState
} from '../models/document.model';

const REQUEST_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 5_000;

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly http = inject(HttpClient);
  private readonly documentsUrl = `${environment.apiUrl}/documents`;

  uploadDocument(file: File): Observable<UploadState> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<UploadResponse>(`${this.documentsUrl}/upload`, formData, {
        observe: 'events',
        reportProgress: true
      })
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        map((event: HttpEvent<UploadResponse>): UploadState => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total ?? 0;
            const progress = total ? Math.round((event.loaded / total) * 100) : 0;
            return { phase: 'progress', progress };
          }

          if (event.type === HttpEventType.Response && event.body) {
            return { phase: 'complete', response: event.body };
          }

          return { phase: 'progress', progress: 0 };
        }),
        filter((state) => state.phase === 'progress' || state.phase === 'complete'),
        catchError((error) => throwError(() => toApiError(error)))
      );
  }

  listMyDocuments(): Observable<DocumentSummary[]> {
    return this.http.get<DocumentSummary[]>(this.documentsUrl).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((error) => throwError(() => toApiError(error)))
    );
  }

  getDocumentById(id: string): Observable<DocumentDetail> {
    return this.http.get<DocumentDetail>(`${this.documentsUrl}/${id}`).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((error) => throwError(() => toApiError(error)))
    );
  }

  getDocumentStatus(id: string): Observable<DocumentStatusView> {
    return this.http.get<DocumentStatusView>(`${this.documentsUrl}/${id}/status`).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((error) => throwError(() => toApiError(error)))
    );
  }

  deleteDocument(id: string): Observable<void> {
    return this.http.delete<void>(`${this.documentsUrl}/${id}`).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((error) => throwError(() => toApiError(error)))
    );
  }

  pollDocumentById(id: string, intervalMs = POLL_INTERVAL_MS): Observable<DocumentDetail> {
    return timer(0, intervalMs).pipe(
      switchMap(() => this.getDocumentById(id)),
      takeWhile((doc) => isProcessing(doc.status), true)
    );
  }
}
