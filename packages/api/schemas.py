"""Shared Pydantic schemas for the FlowGraph AI execution API.

Decouples request/response models from the router modules to avoid circular imports
between `execution.py` and `execution_stream.py`.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class NodeExecutionPayload(BaseModel):
    id: str
    type: str
    params: Dict[str, Any] = Field(default_factory=dict)


class EdgeExecutionPayload(BaseModel):
    source: str
    target: str


class GraphRunRequest(BaseModel):
    nodes: List[NodeExecutionPayload]
    edges: List[EdgeExecutionPayload]
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


# Frontend → engine registry node type mapping
_TYPE_ALIASES: Dict[str, str] = {
    "scan_csv": "polars_node",
    "scan_csv_node": "polars_node",
    "csv_input": "polars_node",
    "mass_balance": "mass_balance_node",
    "mass_balance_node": "mass_balance_node",
    "energy_efficiency": "energy_efficiency_node",
    "energy_efficiency_node": "energy_efficiency_node",
    "polars_node": "polars_node",
}


def normalize_node_type(raw_type: str) -> str:
    """Normalize a frontend node type to a registry-registered engine node type.

    Falls back to ``polars_node`` when the type is unknown or empty, instead of
    raising ``Unknown node type``.
    """
    if not raw_type:
        return "polars_node"
    # Direct registry match first
    from packages.engine.node_base import NodeRegistry

    if raw_type in NodeRegistry._nodes:
        return raw_type
    # Alias mapping for custom engineering node types
    if raw_type in _TYPE_ALIASES:
        return _TYPE_ALIASES[raw_type]
    # Try appending _node suffix (e.g. 'mass_balance' -> 'mass_balance_node')
    candidate = f"{raw_type}_node"
    if candidate in NodeRegistry._nodes:
        return candidate
    # Graceful fallback
    return "polars_node"
