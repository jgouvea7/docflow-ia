import os
import threading
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline, BitsAndBytesConfig
# pyrefly: ignore [missing-import]
from sentence_transformers import SentenceTransformer, util


MODEL_NAME = "mistralai/Mistral-7B-Instruct-v0.3"
EMBEDDING_MODEL = "intfloat/multilingual-e5-base"

_model_lock = threading.Lock()
model = None
tokenizer = None
summarizer = None
embedding_model = None


def enable_gpu_optimizations():
    if torch.cuda.is_available():
        torch.backends.cudnn.benchmark = True
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True


def load_embedding_model():
    global embedding_model

    if embedding_model is not None:
        return

    with _model_lock:
        if embedding_model is not None:
            return
        enable_gpu_optimizations()

        device = "cuda" if torch.cuda.is_available() else "cpu"
        embedding_model = SentenceTransformer(
            EMBEDDING_MODEL,
            device=device
        )


def load_llm():
    global model, tokenizer, summarizer

    if model is not None:
        return

    with _model_lock:
        if model is not None:
            return
        enable_gpu_optimizations()

        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True
        )


        print("Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

        print("Loading model...")
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME,
            device_map="cuda",
            quantization_config=quantization_config,
            local_files_only=True,
            )

        summarizer = pipeline(
            "text-generation",
            model=model,
            tokenizer=tokenizer,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
        )


def load_model():
    load_embedding_model()
    load_llm()
    print("MODELS LOADED!")


def chunk_text(text: str, chunk_size=800, overlap=150):
    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap

    return chunks


def create_document_index(text: str):
    load_embedding_model()
    chunks = chunk_text(text)
    embeddings = embedding_model.encode(
        chunks,
        normalize_embeddings=True,
        convert_to_numpy=True,
        batch_size=32
    )

    return {
        "chunks": chunks,
        "embeddings": embeddings
    }


def embed_text(text: str):
    load_embedding_model()
    embedding = embedding_model.encode(
        text,
        normalize_embeddings=True
    )
    return embedding.tolist()


def retrieve_context(question, index, top_k=5):
    query_embedding = embedding_model.encode(
        question,
        normalize_embeddings=True
    )

    scores = util.cos_sim(
        query_embedding,
        index["embeddings"]
    )[0]

    top_k = min(top_k, len(index["chunks"]))
    top_results = scores.topk(top_k)

    return [
        index["chunks"][i]
        for i in top_results.indices.tolist()
    ]


def generate_response(question, index):
    contexts = retrieve_context(
        question,
        index,
        top_k=5
    )

    context_text = "\n\n".join(contexts)

    prompt = f"""
        Você é um assistente especializado em análise documental.

        Regras:
        - Responda apenas com informações presentes no contexto.
        - Se a resposta não estiver no contexto, diga:
        "Não encontrei essa informação no documento."
        - Não invente informações.

        Contexto:
        {context_text}

        Pergunta:
        {question}

        Resposta:
    """

    result = summarizer(
        prompt,
        max_new_tokens=512,
        do_sample=False,
    )

    answer = result[0]["generated_text"]

    if answer.startswith(prompt):
        return answer[len(prompt):].strip()

    return answer.strip()


def generate_answer(context: str, question: str) -> str:
    load_llm()

    prompt = _build_prompt(context, question)

    result = summarizer(
        prompt,
        max_new_tokens=512,
        do_sample=False,
    )

    answer = result[0]["generated_text"]

    if answer.startswith(prompt):
        return answer[len(prompt):].strip()

    return answer.strip()


def generate_answer_stream(context: str, question: str, history: str = ""):
    load_llm()

    prompt = _build_prompt(context, question, history)

    from transformers import TextIteratorStreamer

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    streamer = TextIteratorStreamer(
        tokenizer,
        skip_prompt=True,
        skip_special_tokens=True,
    )

    generation_kwargs = dict(
        **inputs,
        streamer=streamer,
        max_new_tokens=512,
        do_sample=False,
    )

    import threading as _threading
    thread = _threading.Thread(target=model.generate, kwargs=generation_kwargs)
    thread.start()

    for token in streamer:
        yield token


def _build_prompt(context: str, question: str, history: str = "") -> str:
    history_section = ""
    if history:
        history_section = f"""
        Histórico da conversa:
        {history}

        """

    return f"""
        Você é um assistente especializado em análise e interpretação de documentos.

        Regras:
        - Responda exclusivamente com base nas informações presentes no contexto fornecido.
        - Interpretação Semântica: O usuário pode fazer perguntas utilizando termos diferentes, sinônimos ou conceitos equivalentes aos que estão escritos no texto. Identifique o assunto principal da dúvida e correlacione-o com o conteúdo do documento para responder de forma direta.
        - Se o assunto da pergunta não estiver presente ou não puder ser deduzido diretamente do contexto fornecido, responda exatamente: "Não encontrei essa informação no documento."
        - Não invente, não extrapole e não utilize conhecimentos externos ao contexto fornecido.

        {history_section}
        Contexto:
        {context}

        Pergunta:
        {question}

        Resposta:
    """
