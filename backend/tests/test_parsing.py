from pathlib import Path

import pymupdf

from app.services.parsing import parse_pdf, table_to_markdown


def _make_pdf(path: Path, pages: list[str]) -> None:
    doc = pymupdf.open()
    for body in pages:
        page = doc.new_page()
        page.insert_textbox(pymupdf.Rect(50, 50, 545, 780), body, fontsize=11)
    doc.save(str(path))
    doc.close()


def test_parse_pdf_extracts_page_text(tmp_path: Path) -> None:
    pdf = tmp_path / "brochure.pdf"
    _make_pdf(pdf, ["ALPHA " * 40, "BRAVO " * 40])

    parsed = parse_pdf(pdf)

    assert parsed.page_count == 2
    assert [p.number for p in parsed.pages] == [1, 2]
    assert "ALPHA" in parsed.pages[0].text
    assert "BRAVO" in parsed.pages[1].text
    assert "BRAVO" not in parsed.pages[0].text


def test_parse_pdf_normalises_whitespace(tmp_path: Path) -> None:
    pdf = tmp_path / "spaced.pdf"
    _make_pdf(pdf, ["line one\n\n\n   line two   \n"])

    text = parse_pdf(pdf).pages[0].text

    assert "\n\n" not in text
    assert not any(line != line.strip() for line in text.splitlines())


def test_table_to_markdown_handles_ragged_and_none() -> None:
    md = table_to_markdown([["Trim", "Price"], ["Base", None], ["Sport"]])

    lines = md.splitlines()
    assert lines[0] == "| Trim | Price |"
    assert lines[1] == "| --- | --- |"
    assert lines[2] == "| Base |  |"
    assert lines[3] == "| Sport |  |"


def test_table_to_markdown_empty() -> None:
    assert table_to_markdown([]) == ""
    assert table_to_markdown([[None, None]]) == ""
