import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError, timeout } from 'rxjs';

import { environment } from '../../environments/environment';
import { toApiError } from '../core/errors/api-error';
import { AuthService } from '../core/auth/auth.service';
import { ChatRequest, ChatResponse, SseData } from '../models/chat.model';

const REQUEST_TIMEOUT_MS = 120_000;

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly documentsUrl = `${environment.apiUrl}/documents`;

  askDocument(documentId: string, request: ChatRequest): Observable<ChatResponse> {
    return this.http
      .post<ChatResponse>(`${this.documentsUrl}/${documentId}/chat`, request)
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        catchError((error) => throwError(() => toApiError(error)))
      );
  }

  streamChat(
    documentId: string,
    request: ChatRequest
  ): { stream: Observable<SseData> } {
    const token = this.authService.getToken();
    const controller = new AbortController();

    const stream = new Observable<SseData>((observer) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      fetch(`${this.documentsUrl}/${documentId}/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal
      })
        .then(async (response) => {
          if (!response.ok) {
            let errorMsg = `HTTP ${response.status}`;
            try {
              const body = await response.text();
              if (body) {
                const parsed = JSON.parse(body);
                errorMsg = parsed.message || parsed.error || errorMsg;
              }
            } catch {}
            throw new Error(errorMsg);
          }

          if (!response.body) {
            throw new Error('Resposta vazia do servidor');
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data:')) {
                const data = trimmed.slice(5).trim();
                if (data === '[DONE]') {
                  observer.complete();
                  return;
                }
                try {
                  const parsed: SseData = JSON.parse(data);
                  observer.next(parsed);
                } catch {
                  // skip unparseable data
                }
              }
            }
          }
          observer.complete();
        })
        .catch((err) => {
          if (err.name === 'AbortError') return;
          observer.error(toApiError(err));
        });

      return () => controller.abort();
    });

    return { stream };
  }
}
