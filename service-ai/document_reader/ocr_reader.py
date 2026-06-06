from PIL.Image import Image
import cv2
import pytesseract
from PIL import *


def read_ocr(path: str) -> str:
    file = cv2.imread(path)

    if file is None:
        raise FileNotFoundError(f"File not found at {path}")

    gray = cv2.cvtColor(file, cv2.COLOR_BGR2GRAY)

    gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

    _, img = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    config = r"--oem 3 --psm 3 -l por"

    img_pil: Image = Image.fromarray(img)

    text = pytesseract.image_to_string(img_pil, config=config)

    return text
    
