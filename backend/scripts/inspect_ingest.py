"""Parse + chunk a PDF and print a summary — for eyeballing step 3a output.

    uv run python -m scripts.inspect_ingest path/to/brochure.pdf [--full]
"""

import sys

from app.services.chunking import chunk_document
from app.services.parsing import parse_pdf


def main(argv: list[str]) -> int:
    if not argv or argv[0] in {"-h", "--help"}:
        print(__doc__)
        return 0

    path = argv[0]
    full = "--full" in argv[1:]

    parsed = parse_pdf(path)
    chunks = chunk_document(parsed)

    print(
        f"{path}\n"
        f"pages: {parsed.page_count}   tables: {len(parsed.tables)}   "
        f"chunks: {len(chunks)}   "
        f"tokens: {sum(c.token_count for c in chunks)}"
    )
    print("-" * 72)
    for i, c in enumerate(chunks):
        span = f"p{c.page_start}" if c.page_start == c.page_end else f"p{c.page_start}-{c.page_end}"
        body = c.content if full else c.content[:110].replace("\n", " ")
        print(f"[{i:3}] {c.kind.value:5} {span:>9} {c.token_count:4}t  {body}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
