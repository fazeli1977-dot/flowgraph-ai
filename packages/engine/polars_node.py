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

        # Default engineering dataset when no upstream data is provided
        if dataframe is None and pl is not None:
            dataframe = pl.DataFrame({
                "timestamp": [
                    "2026-11-03 08:00",
                    "2026-11-03 09:00",
                    "2026-11-03 10:00",
                    "2026-11-03 11:00",
                    "2026-11-03 12:00",
                ],
                "flow_rate_m3h": [125.4, 138.0, 142.5, 131.2, 120.0],
                "turbidity_ntu": [4.2, 5.0, 4.8, 3.9, 3.5],
                "bod5_mg_l": [220.0, 240.5, 235.0, 215.0, 205.0],
            })
            payload["source"] = "default_engineering_dataset"

        if pl is not None and isinstance(dataframe, pl.DataFrame):
            if self.operation == "select":
                columns = self.config.get("columns")
                if columns:
                    dataframe = dataframe.select(columns)
            payload["data"] = dataframe
            payload["row_count"] = dataframe.height
            payload["preview"] = dataframe.head(10).to_dicts()
            payload["output_rows"] = dataframe.height

        payload.setdefault("result", "processed")
        payload.setdefault("node", self.node_id or self.name or "polars_node")
        return NodeExecutionResult(outputs=payload)
