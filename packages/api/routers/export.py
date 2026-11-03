from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any, List, Optional
import io
import polars as pl


router = APIRouter(tags=["Export"])


class ParquetExportRequest(BaseModel):
    columns: List[str]
    rows: List[dict]
    filename: Optional[str] = "export"


@router.post("/export/parquet")
async def export_parquet(request: ParquetExportRequest):
    if not request.rows:
        raise HTTPException(status_code=400, detail="No rows to export")

    df = pl.DataFrame(request.rows)

    buffer = io.BytesIO()
    df.write_parquet(buffer)
    buffer.seek(0)

    filename = request.filename or "export"
    if not filename.lower().endswith(".parquet"):
        filename = f"{filename}.parquet"

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
