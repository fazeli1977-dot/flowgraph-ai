"""Polars-backed node implementation."""

from typing import Any, Dict

try:
    import polars as pl
except Exception:  # pragma: no cover - optional dependency
    pl = None

from packages.engine.node_base import BaseNode, NodeExecutionResult, NodeRegistry


@NodeRegistry.register("polars_node")
class PolarsNode(BaseNode):
    """A node that processes and forwards Polars data."""

    def __init__(
        self,
        node_id: str | None = None,
        name: str | None = None,
        operation: str = "passthrough",
        **config: Any,
    ):
        super().__init__(node_id=node_id, name=name, **config)
        self.operation = operation

    def run(self, data: Dict[str, Any]) -> NodeExecutionResult:
        """Process the incoming data and return it for downstream nodes."""
        payload = dict(data or {})
        dataframe = payload.get("data", payload.get("df", payload.get("input")))

        if pl is not None and isinstance(dataframe, pl.DataFrame):
            if self.operation == "select":
                columns = self.config.get("columns")
                if columns:
                    dataframe = dataframe.select(columns)
            payload["data"] = dataframe
            payload["row_count"] = dataframe.height

        payload.setdefault("result", "processed")
        payload.setdefault("node", self.node_id or self.name or "polars_node")
        return NodeExecutionResult(outputs=payload)
