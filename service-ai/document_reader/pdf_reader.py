import fitz


def read_pdf(path: str) -> str:
    with fitz.open(path) as doc:
        texts = []

        for page in doc:
            texts.append(page.get_text())

    return "\n".join(texts)
