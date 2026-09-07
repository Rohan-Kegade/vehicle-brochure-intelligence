"""PDF parsing: page text via PyMuPDF, tables via pdfplumber.

The output is a plain-data `ParsedDocument` that `chunking.py` turns into
chunk drafts. No database or embedding concerns live here.
"""

from dataclasses import dataclass, field
from pathlib import Path

import pdfplumber
import pymupdf


@dataclass
class ParsedTable:
    page: int  # 1-indexed page the table was found on
    markdown: str


@dataclass
class ParsedPage:
    number: int  # 1-indexed
    text: str


@dataclass
class ParsedDocument:
    page_count: int
    pages: list[ParsedPage] = field(default_factory=list)
    tables: list[ParsedTable] = field(default_factory=list)


def _normalise(text: str) -> str:
    """Drop blank lines and trailing spaces; keep line structure otherwise."""
    lines = [line.strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if line)


def table_to_markdown(rows: list[list[str | None]]) -> str:
    """Render a pdfplumber table (ragged, `None` cells allowed) as GFM."""
    cleaned = [
        [(cell or "").strip().replace("\n", " ") for cell in row]
        for row in rows
        if row and any(cell not in (None, "") for cell in row)
    ]
    if not cleaned:
        return ""
    width = max(len(row) for row in cleaned)
    cleaned = [row + [""] * (width - len(row)) for row in cleaned]
    header, *body = cleaned
    out = [
        "| " + " | ".join(header) + " |",
        "| " + " | ".join(["---"] * width) + " |",
    ]
    out += ["| " + " | ".join(row) + " |" for row in body]
    return "\n".join(out)


def parse_pdf(path: str | Path) -> ParsedDocument:
    """Extract per-page text and tables from a PDF."""
    path = str(path)

    pages: list[ParsedPage] = []
    with pymupdf.open(path) as doc:
        page_count = doc.page_count
        for index, page in enumerate(doc, start=1):
            pages.append(ParsedPage(number=index, text=_normalise(page.get_text("text"))))

    tables: list[ParsedTable] = []
    with pdfplumber.open(path) as pdf:
        for index, page in enumerate(pdf.pages, start=1):
            for raw in page.extract_tables():
                markdown = table_to_markdown(raw)
                if markdown:
                    tables.append(ParsedTable(page=index, markdown=markdown))

    return ParsedDocument(page_count=page_count, pages=pages, tables=tables)
