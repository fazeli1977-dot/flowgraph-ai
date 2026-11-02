"""Base node contracts for flowgraph-ai."""

import inspect
from typing import Any, Dict


class NodeExecutionResult:
    """Result returned by a node execution."""

    def __init__(self, outputs: Dict[str, Any], status: str = "success"):
        self.outputs = outputs
        self.status = status

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"NodeExecutionResult(status={self.status!r}, outputs={self.outputs!r})"


class BaseNode:
    """Base class for all executable graph nodes."""

    def __init__(self, node_id: str | None = None, name: str | None = None, **config: Any):
        self.node_id = node_id
        self.name = name
        self.config = dict(config)

    def run(self, data: Dict[str, Any]) -> NodeExecutionResult:
        """Execute the node synchronously and return its outputs."""
        raise NotImplementedError

    async def execute(self, data: Dict[str, Any]) -> NodeExecutionResult:
        """Execute the node, supporting sync or async run implementations."""
        result = self.run(data)
        if inspect.iscoroutine(result):
            result = await result
        return result


class NodeRegistry:
    _nodes = {}

    @classmethod
    def register(cls, name):
        def inner(subclass):
            cls._nodes[name] = subclass
            return subclass
        return inner
