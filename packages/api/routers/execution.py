import time
import re
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import polars as pl

from packages.engine.executor import GraphExecutor, NodePayload, EdgePayload
import packages.engine.civil_nodes  # ثبت نودهای مهندسی در ریجستری موتور

router = APIRouter(prefix="/graph", tags=["execution"])

class GraphRunRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    initial_inputs: Optional[Dict[str, Any]] = Field(default_factory=dict)

class NodeRunResult(BaseModel):
    node_id: str
    status: str
    duration_ms: float
    output_rows: int = 0
    preview: List[Dict[str, Any]] = Field(default_factory=list)

class GraphRunResponse(BaseModel):
    execution_id: str
    status: str
    total_duration_ms: float
    results: Dict[str, NodeRunResult]

def normalize_node_type(raw_type: str) -> str:
    """نرمال‌سازی نام نودها جهت تطابق با رجیستری موتور"""
    if not raw_type:
        return "polars_node"
    s1 = re.sub(r'(.)([A-Z][a-z]+)', r'\1_\2', raw_type)
    normalized = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', s1).lower()
    return normalized

@router.post("/run", response_model=GraphRunResponse)
async def execute_graph(req: GraphRunRequest):
    start_time = time.perf_counter()
    
    executor_nodes = []
    for n in req.nodes:
        node_id = str(n.get("id"))
        raw_type = n.get("type", "polars_node")
        node_type = normalize_node_type(raw_type)
        node_data = n.get("data", {})
        config = node_data.get("config", {}) if isinstance(node_data, dict) else {}
        if not config and "config" in n:
            config = n["config"]
        
        executor_nodes.append({
            "id": node_id,
            "type": node_type,
            "config": config,
            **{k: v for k, v in node_data.items() if k != "config"}
        })

    executor_edges = []
    for e in req.edges:
        src = str(e.get("source"))
        tgt = str(e.get("target"))
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
            preview=preview_data
        )

    return GraphRunResponse(
        execution_id=exec_result.execution_id,
        status="success",
        total_duration_ms=total_duration,
        results=formatted_results
    )
