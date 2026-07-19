"""Deterministic local PDF-to-slide-text extraction for Track A."""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from pypdf import PdfReader
from pypdf.errors import FileNotDecryptedError, PdfReadError


class DeckExtractionError(RuntimeError):
    """Raised when a deck cannot be safely converted to text."""


@dataclass(frozen=True)
class ExtractedPage:
    slide: int
    text: str


@dataclass(frozen=True)
class ExtractedDeck:
    schemaVersion: str
    sourceFile: str
    sourceSha256: str
    pageCount: int
    emptySlides: list[int]
    pages: list[ExtractedPage]
    text: str


def _normalize_page_text(value: str) -> str:
    lines = [line.rstrip() for line in value.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    while lines and not lines[0]:
        lines.pop(0)
    while lines and not lines[-1]:
        lines.pop()
    return "\n".join(lines)


def extract_deck(path: Path) -> ExtractedDeck:
    source = path.resolve()
    if not source.is_file():
        raise DeckExtractionError(f"PDF does not exist: {source}")
    if source.suffix.lower() != ".pdf":
        raise DeckExtractionError(f"Expected a .pdf file: {source}")

    payload = source.read_bytes()
    try:
        reader = PdfReader(source, strict=True)
        if reader.is_encrypted and reader.decrypt("") == 0:
            raise DeckExtractionError("Encrypted PDF requires a password and cannot be extracted")

        pages: list[ExtractedPage] = []
        empty_slides: list[int] = []
        for index, page in enumerate(reader.pages, start=1):
            page_text = _normalize_page_text(page.extract_text() or "")
            if not page_text:
                empty_slides.append(index)
            pages.append(ExtractedPage(slide=index, text=page_text))
    except DeckExtractionError:
        raise
    except (PdfReadError, FileNotDecryptedError, OSError, ValueError) as error:
        raise DeckExtractionError(f"Could not read PDF: {error}") from error

    if not pages:
        raise DeckExtractionError("PDF contains no pages")

    blocks = [f"Slide {page.slide}:\n{page.text}".rstrip() for page in pages]
    return ExtractedDeck(
        schemaVersion="track-a.deck-text.v1",
        sourceFile=source.name,
        sourceSha256=hashlib.sha256(payload).hexdigest(),
        pageCount=len(pages),
        emptySlides=empty_slides,
        pages=pages,
        text="\n\n".join(blocks),
    )


def to_json(deck: ExtractedDeck) -> str:
    return json.dumps(asdict(deck), ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def write_output(path: Path, content: str, *, force: bool) -> None:
    output = path.resolve()
    if output.exists() and not force:
        raise DeckExtractionError(f"Output already exists; pass --force to replace it: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(content, encoding="utf-8", newline="\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path, help="Local PDF deck")
    parser.add_argument("--output", type=Path, help="Optional JSON output path")
    parser.add_argument("--force", action="store_true", help="Allow replacement of --output")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        content = to_json(extract_deck(args.pdf))
        if args.output:
            write_output(args.output, content, force=args.force)
        else:
            print(content, end="")
        return 0
    except DeckExtractionError as error:
        print(json.dumps({"error": str(error)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
