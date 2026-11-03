from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import time
import polars as pl

from packages.api.schemas import (
    GraphRunRequest,
    GraphRunResponse,
    NodeRunResult,
    normalize_node_type,
)
import packages.engine.civil_nodes  # ثبت نودهای مهندسی در ریجستری موتور
from packages.engine.executor import GraphExecutor

router = APIRouter(prefix="/graph", tags=["Execution"])


@router.post("/run", response_model=GraphRunResponse)
async def run_pipeline(req: GraphRunRequest):
    start_time = time.perf_counter()

    executor_nodes = []
    for n in req.nodes:
        node_id = str(n.id)
        node_type = normalize_node_type(n.type)
        config = n.params if isinstance(n.params, dict) else {}

        executor_nodes.append({
            "id": node_id,
            "type": node_type,
            "config": config,
        })

    executor_edges = []
    for e in req.edges:
        src = str(e.source)
        tgt = str(e.target)
        executor_edges.append((src, tgt))

    try:
        executor = GraphExecutor(nodes=executor_nodes, edges=executor_edges)
        exec_result = await executor.run(initial_inputs=req.initial_inputs or {})

        if exec_result.status == "failed":
            raise HTTPException(status_code=400, detail=f"DAG Execution Failed: {exec_result.error}")

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"DAG Execution Failed: {str(exc)}")

    total_duration = round((time.perf_counter() - start_time) * 1000, 2)

    formatted_results: Dict[str, NodeRunResult] = {}
    for nid, node_output in exec_result.node_outputs.items():
        preview_data = []
        row_count = 0

        if isinstance(node_output, dict):
            for val in node_output.values():
                if isinstance(val, pl.DataFrame):
                    row_count = val.height
                    preview_data = val.head(5).to_dicts()
                    break
                elif isinstance(val, list):
                    row_count = len(val)
                    preview_data = val[:5]
                    break

        formatted_results[nid] = NodeRunResult(
            node_id=nid,
            status="completed",
            duration_ms=round(exec_result.execution_time * 1000, 2),
            output_rows=row_count,
            preview=preview_data,
        )

    return GraphRunResponse(
        execution_id=exec_result.execution_id,
        status="success",
        total_duration_ms=total_duration,
        results=formatted_results,
    )
