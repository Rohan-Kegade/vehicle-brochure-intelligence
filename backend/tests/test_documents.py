import uuid
from pathlib import Path

# A minimal valid PDF (header + one empty page + trailer).
_MINIMAL_PDF = b"""%PDF-1.4
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer<< /Size 4 /Root 1 0 R >>
startxref
190
%%EOF
"""


async def test_upload_document_creates_row_and_file(client, cleanup_documents, storage_dir):
    resp = await client.post(
        "/documents",
        files={"file": ("Audi_Q5_2026.pdf", _MINIMAL_PDF, "application/pdf")},
        data={"tag": "SUV"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    cleanup_documents.append(uuid.UUID(body["id"]))

    assert body["title"] == "Audi_Q5_2026"
    assert body["tag"] == "SUV"
    assert body["status"] == "uploading"
    assert body["page_count"] == 0
    assert body["chunk_count"] == 0

    stored = Path(storage_dir) / f"{body['id']}.pdf"
    assert stored.is_file()
    assert stored.read_bytes() == _MINIMAL_PDF


async def test_upload_document_rejects_non_pdf(client):
    resp = await client.post(
        "/documents",
        files={"file": ("notes.txt", b"not a pdf", "text/plain")},
    )
    assert resp.status_code == 415


async def test_list_documents_includes_uploaded(client, cleanup_documents):
    resp = await client.post(
        "/documents",
        files={"file": ("BMW_X3.pdf", _MINIMAL_PDF, "application/pdf")},
    )
    doc_id = resp.json()["id"]
    cleanup_documents.append(uuid.UUID(doc_id))

    listing = await client.get("/documents")
    assert listing.status_code == 200
    assert doc_id in {d["id"] for d in listing.json()}
