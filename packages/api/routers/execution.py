from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any
from packages.engine.executor import execute_graph

router = APIRouter(prefix="/graph", tags=["execution"])

class NodeRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    type: str
    data: Dict[str, Any] = {}

class EdgeRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    source: str
    target: str

class GraphRunRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    nodes: List[NodeRequest]
    edges: List[EdgeRequest]

@router.post("/run")
async def run_graph(request: GraphRunRequest):
    nodes_payload = [n.model_dump() for n in request.nodes]
    edges_payload = [e.model_dump() for e in request.edges]
    
    result = await execute_graph(nodes=nodes_payload, edges=edges_payload)
    
    return {
        "status": "success",
        "result": result
    }
