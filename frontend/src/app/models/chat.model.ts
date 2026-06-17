export interface ChatRequest {
  question: string;
  history?: ChatMessageDto[];
}

export interface ChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSource {
  chunkIndex: number;
  chunkContent: string;
  similarity: number;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

export interface SseTokenData {
  token?: string;
}

export interface SseSourcesData {
  sources?: ChatSource[];
}

export interface SseData {
  answer?: string;
  token?: string;
  sources?: ChatSource[];
}

export interface ChatMessage {
  id: string;
  question: string;
  answer?: string;
  sources?: ChatSource[];
  error?: string;
  timestamp: Date;
}

export function createMessage(question: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    question,
    timestamp: new Date()
  };
}
