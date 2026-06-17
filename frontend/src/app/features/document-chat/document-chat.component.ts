import { Component, DestroyRef, inject, signal, ElementRef, viewChild, afterNextRender } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map, switchMap, tap } from 'rxjs';

import { ChatService } from '../../services/chat.service';
import { DocumentService } from '../../services/document.service';
import { ApiError } from '../../core/errors/api-error';
import { DocumentDetail } from '../../models/document.model';
import {
  ChatMessage,
  ChatMessageDto,
  ChatSource,
  createMessage
} from '../../models/chat.model';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-document-chat',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule, SkeletonComponent, StatusBadgeComponent],
  template: `
    <div class="flex h-[calc(100dvh-10rem)] flex-col space-y-4">
      <!-- ── Header ─────────────────────────────────────────────── -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <a
            routerLink="/arquivos"
            class="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-border-muted hover:bg-surface-700 hover:text-slate-200"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
            </svg>
            Voltar
          </a>

          @if (document()) {
            <div class="hidden sm:block">
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-brand-400">Chat IA</p>
              <h1 class="font-display text-lg font-bold text-slate-100 truncate max-w-xs">
                {{ document()!.fileName }}
              </h1>
            </div>
          }
        </div>

        @if (document()) {
          <app-status-badge [status]="document()!.status" />
        }
      </div>

      <!-- ── Loading ─────────────────────────────────────────────── -->
      @if (loading()) {
        <div class="flex-1 space-y-4">
          <app-skeleton height="3rem" width="60%" />
          <app-skeleton height="3rem" width="40%" />
        </div>
      }

      <!-- ── Error ───────────────────────────────────────────────── -->
      @if (!loading() && error()) {
        <div class="flex-1 flex items-center justify-center">
          <div class="card-elevated rounded-2xl p-8 text-center max-w-md">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10">
              <svg class="h-7 w-7 text-rose-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
              </svg>
            </div>
            <h2 class="font-display text-xl font-bold text-slate-100">Erro ao carregar</h2>
            <p class="mt-2 text-sm text-slate-400">{{ error() }}</p>
            <a routerLink="/arquivos" class="mt-6 inline-flex rounded-xl bg-brand-gradient px-4 py-2 text-sm font-medium text-white">
              Meus Arquivos
            </a>
          </div>
        </div>
      }

      <!-- ── Document not processed yet ──────────────────────────── -->
      @if (!loading() && document() && document()!.status !== 'COMPLETED') {
        <div class="flex-1 flex items-center justify-center">
          <div class="card-elevated rounded-2xl p-8 text-center max-w-md">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
              <svg class="h-7 w-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 class="font-display text-xl font-bold text-slate-100">Aguardando processamento</h2>
            <p class="mt-2 text-sm text-slate-400">
              O documento ainda está sendo processado. O chat estará disponível após a conclusão.
            </p>
            <a [routerLink]="['/documents', documentId()]" class="mt-6 inline-flex rounded-xl border border-border-default px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-surface-700">
              Ver processamento
            </a>
          </div>
        </div>
      }

      <!-- ── Chat Area ──────────────────────────────────────────── -->
      @if (!loading() && document() && document()!.status === 'COMPLETED') {
        <div #messagesContainer class="flex-1 overflow-y-auto space-y-4 pr-2 scroll-smooth">
          @if (messages().length === 0) {
            <div class="flex flex-col items-center justify-center h-full text-center">
              <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10">
                <svg class="h-8 w-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
                </svg>
              </div>
              <h2 class="font-display text-xl font-bold text-slate-100">Converse com o documento</h2>
              <p class="mt-2 max-w-md text-sm text-slate-400">
                Faça perguntas sobre o conteúdo do documento. A IA responderá com base apenas nas informações extraídas.
              </p>
            </div>
          }

          @for (msg of messages(); track msg.id) {
            <div class="animate-fade-up space-y-3">
              <!-- User question -->
              <div class="flex justify-end">
                <div class="max-w-[80%] rounded-2xl rounded-br-md bg-brand-600/30 border border-brand-500/20 px-4 py-3">
                  <p class="text-sm text-slate-200 whitespace-pre-wrap">{{ msg.question }}</p>
                  <p class="mt-1 text-[10px] text-right text-slate-600">{{ msg.timestamp | date:'HH:mm' }}</p>
                </div>
              </div>

              <!-- AI answer -->
              <div class="flex justify-start">
                <div class="max-w-[80%] rounded-2xl rounded-bl-md bg-surface-700 border border-border-subtle px-4 py-3">
                  @if (msg.error) {
                    <div class="flex items-start gap-2">
                      <svg class="mt-0.5 h-4 w-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
                      </svg>
                      <div>
                        <p class="text-sm font-medium text-rose-400">Erro</p>
                        <p class="mt-1 text-sm text-slate-400">{{ msg.error }}</p>
                      </div>
                    </div>
                  } @else {
                    <p class="text-sm text-slate-200 whitespace-pre-wrap">{{ msg.answer || '' }}@if (msg.answer === undefined && msg.id === activeMessageId()) {<span class="inline-block h-4 w-1.5 animate-pulse bg-brand-400 ml-0.5 rounded-sm"></span>}</p>

                    @if (msg.sources && msg.sources.length > 0) {
                      <details class="mt-3">
                        <summary class="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-400">
                          Fontes ({{ msg.sources.length }})
                        </summary>
                        <div class="mt-2 space-y-2">
                          @for (source of msg.sources; track source.chunkIndex) {
                            <div class="rounded-lg border border-border-subtle bg-surface-800/50 p-3">
                              <div class="flex items-center justify-between mb-1">
                                <span class="text-[10px] font-mono text-slate-600">Chunk #{{ source.chunkIndex }}</span>
                                <span class="text-[10px] text-emerald-500">Similaridade: {{ (source.similarity * 100) | number:'1.0-0' }}%</span>
                              </div>
                              <p class="text-xs text-slate-400 line-clamp-3">{{ source.chunkContent }}</p>
                            </div>
                          }
                        </div>
                      </details>
                    }
                  }
                  <p class="mt-1 text-[10px] text-slate-600">{{ msg.timestamp | date:'HH:mm' }}</p>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- ── Input area ────────────────────────────────────────── -->
        <div class="shrink-0">
          <form (ngSubmit)="sendMessage($event)" class="flex gap-3">
            <textarea
              #questionInput
              rows="1"
              placeholder="Faça uma pergunta sobre o documento..."
              class="flex-1 rounded-xl border border-border-default bg-surface-800 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 transition focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
              [disabled]="sending()"
              [value]="currentQuestion()"
              (input)="currentQuestion.set($any($event.target).value); autoResize($event)"
              (keydown.enter)="onEnterKey($event)"
            ></textarea>
            <button
              type="submit"
              [disabled]="sending() || !currentQuestion().trim()"
              class="inline-flex items-center justify-center rounded-xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
            >
              @if (sending()) {
                <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
                  <path class="opacity-70" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                </svg>
              } @else {
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
                </svg>
              }
            </button>
          </form>
        </div>
      }
    </div>
  `
})
export class DocumentChatComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly documentService = inject(DocumentService);
  private readonly chatService = inject(ChatService);
  private readonly destroyRef = inject(DestroyRef);

  readonly messagesContainer = viewChild<ElementRef<HTMLElement>>('messagesContainer');

  readonly documentId = signal<string | null>(null);
  readonly document = signal<DocumentDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly sending = signal(false);
  readonly messages = signal<ChatMessage[]>([]);
  readonly currentQuestion = signal('');
  readonly activeMessageId = signal<string | null>(null);

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        filter((id): id is string => Boolean(id)),
        tap((id) => {
          this.documentId.set(id);
          this.loading.set(true);
        }),
        switchMap((id) => this.documentService.getDocumentById(id)),
        tap((doc) => {
          this.document.set(doc);
          this.loading.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {},
        error: (err: ApiError) => {
          this.error.set(err.message);
          this.loading.set(false);
        }
      });

    afterNextRender(() => {
      const container = this.messagesContainer()?.nativeElement;
      if (container) {
        this.scrollToBottom(container);
      }
    });
  }

  onEnterKey(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.sendMessage(event);
    }
  }

  sendMessage(event: Event): void {
    event.preventDefault();
    const question = this.currentQuestion().trim();
    if (!question || this.sending()) return;

    const message = createMessage(question);
    this.messages.update((msgs) => [...msgs, message]);
    this.currentQuestion.set('');
    this.sending.set(true);
    this.activeMessageId.set(message.id);

    const docId = this.documentId();
    if (!docId) return;

    const history = this.buildHistory();

    const { stream } = this.chatService.streamChat(docId, { question, history });

    stream
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (data.answer !== undefined) {
            this.messages.update((msgs) =>
              msgs.map((m) =>
                m.id === message.id
                  ? { ...m, answer: data.answer }
                  : m
              )
            );
          }
          if (data.token !== undefined) {
            this.messages.update((msgs) =>
              msgs.map((m) =>
                m.id === message.id
                  ? { ...m, answer: (m.answer || '') + data.token }
                  : m
              )
            );
          }
          if (data.sources !== undefined) {
            this.messages.update((msgs) =>
              msgs.map((m) =>
                m.id === message.id
                  ? { ...m, sources: data.sources }
                  : m
              )
            );
          }
        },
        complete: () => {
          this.sending.set(false);
          this.activeMessageId.set(null);
        },
        error: (err: ApiError | Error) => {
          this.messages.update((msgs) =>
            msgs.map((m) =>
              m.id === message.id
                ? { ...m, error: err.message || 'Erro ao obter resposta' }
                : m
            )
          );
          this.sending.set(false);
          this.activeMessageId.set(null);
        }
      });

    this.scheduleScroll();
  }

  private buildHistory(): ChatMessageDto[] {
    const msgs = this.messages();
    const history: ChatMessageDto[] = [];
    for (let i = 0; i < msgs.length - 1; i++) {
      const m = msgs[i];
      history.push({ role: 'user', content: m.question });
      if (m.answer) {
        history.push({ role: 'assistant', content: m.answer });
      }
    }
    return history;
  }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  }

  private scheduleScroll(): void {
    requestAnimationFrame(() => {
      const container = this.messagesContainer()?.nativeElement;
      if (container) {
        this.scrollToBottom(container);
      }
    });
  }

  private scrollToBottom(element: HTMLElement): void {
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
  }
}
