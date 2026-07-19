from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from deck_extract import DeckExtractionError, extract_deck, to_json, write_output


def write_pdf(path: Path, page_texts: list[str | None], *, encrypted: bool = False) -> None:
    writer = PdfWriter()
    for text in page_texts:
        page = writer.add_blank_page(width=612, height=792)
        if text is not None:
            font = DictionaryObject(
                {
                    NameObject("/Type"): NameObject("/Font"),
                    NameObject("/Subtype"): NameObject("/Type1"),
                    NameObject("/BaseFont"): NameObject("/Helvetica"),
                }
            )
            font_ref = writer._add_object(font)
            page[NameObject("/Resources")] = DictionaryObject(
                {NameObject("/Font"): DictionaryObject({NameObject("/F1"): font_ref})}
            )
            stream = DecodedStreamObject()
            escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            stream.set_data(f"BT /F1 12 Tf 72 720 Td ({escaped}) Tj ET".encode("latin-1"))
            page[NameObject("/Contents")] = writer._add_object(stream)
    if encrypted:
        writer.encrypt("track-a-secret")
    with path.open("wb") as output:
        writer.write(output)


class DeckExtractTests(unittest.TestCase):
    def test_extracts_pages_with_stable_slide_markers(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "demo.pdf"
            write_pdf(path, ["Problem evidence", "17 customer interviews"])

            first = extract_deck(path)
            second = extract_deck(path)

            self.assertEqual(first, second)
            self.assertEqual(first.pageCount, 2)
            self.assertEqual(first.emptySlides, [])
            self.assertEqual(first.text, "Slide 1:\nProblem evidence\n\nSlide 2:\n17 customer interviews")
            self.assertEqual(len(first.sourceSha256), 64)

    def test_records_empty_pages_without_dropping_them(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "empty-slide.pdf"
            write_pdf(path, [None])
            deck = extract_deck(path)
            self.assertEqual(deck.emptySlides, [1])
            self.assertEqual(deck.text, "Slide 1:")

    def test_rejects_malformed_and_encrypted_pdfs(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            malformed = Path(directory) / "bad.pdf"
            malformed.write_bytes(b"not a pdf")
            with self.assertRaises(DeckExtractionError):
                extract_deck(malformed)

            encrypted = Path(directory) / "encrypted.pdf"
            write_pdf(encrypted, ["secret"], encrypted=True)
            with self.assertRaisesRegex(DeckExtractionError, "password"):
                extract_deck(encrypted)

    def test_output_is_utf8_json_and_requires_force_to_replace(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "unicode.pdf"
            output = Path(directory) / "deck.json"
            write_pdf(source, ["Evidence"])
            content = to_json(extract_deck(source))
            write_output(output, content, force=False)
            self.assertEqual(output.read_text(encoding="utf-8"), content)
            with self.assertRaisesRegex(DeckExtractionError, "--force"):
                write_output(output, content, force=False)


if __name__ == "__main__":
    unittest.main()
