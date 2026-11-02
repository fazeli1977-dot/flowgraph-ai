"""Node-related API routes for flowgraph-ai."""

from fastapi import APIRouter
import packages.engine.polars_node  # noqa: F401
from packages.engine.node_base import NodeRegistry

router = APIRouter(tags=["nodes"])

@router.get("")
@router.get("/")
@router.get("/nodes")
@router.get("/nodes/")
def get_nodes():
    """Return the list of registered node type names."""
    return {"nodes": list(NodeRegistry._nodes.keys())}
