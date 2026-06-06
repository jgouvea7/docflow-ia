from pathlib import Path

from document_reader.ocr_reader import read_ocr
from document_reader.pdf_reader import read_pdf


class DocumentReader:

    @staticmethod
    def extract_text(path: str) -> str:
        extension = Path(path).suffix.lower()

        if extension == ".pdf":
            text = read_pdf(path)

            if text.strip():
                return text

            raise ValueError(
                "PDF does not contain extractable text"
            )

        if extension in [".jpg", ".jpeg", ".png"]:
            return read_ocr(path)

        raise ValueError(
            f"Format not supported: {extension}"
        )