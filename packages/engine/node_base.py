"""Base node contracts for flowgraph-ai."""

import inspect
import time
import os
import psutil
from typing import Any, Dict


class NodeExecutionResult:
    """Result returned by a node execution."""

    def __init__(self, outputs: Dict[str, Any], status: str = "success", metrics: Dict[str, Any] | None = None):
        self.outputs = outputs
        self.status = status
        self.metrics = metrics or {}

    def __repr__(self) -> str:
        return f"NodeExecutionResult(status={self.status!r}, metrics={self.metrics!r})"


class BaseNode:
    """Base class for all executable graph nodes."""

    def __init__(self, node_id: str | None = None, name: str | None = None, **config: Any):
        self.node_id = node_id
        self.name = name
        self.config = dict(config)

    def run(self, data: Dict[str, Any]) -> NodeExecutionResult:
        raise NotImplementedError

    async def execute(self, data: Dict[str, Any]) -> NodeExecutionResult:
        process = psutil.Process(os.getpid())

        # Start tracking
        start_time = time.perf_counter()
        process.cpu_percent(interval=None)
        start_memory = process.memory_info().rss

        # Run node
        result = self.run(data)
        if inspect.iscoroutine(result):
            result = await result

        # End tracking
        end_time = time.perf_counter()
        end_cpu = process.cpu_percent(interval=None)
        end_memory = process.memory_info().rss

        duration_ms = (end_time - start_time) * 1000
        memory_delta_mb = (end_memory - start_memory) / (1024 * 1024)

        result.metrics.update({
            "duration_ms": round(duration_ms, 3),
            "cpu_percent": round(end_cpu, 2),
            "memory_delta_mb": round(memory_delta_mb, 4),
            "peak_memory_mb": round(end_memory / (1024 * 1024), 2)
        })

        return result


class NodeRegistry:
    _nodes = {}

    @classmethod
    def register(cls, name):
        def inner(subclass):
            cls._nodes[name] = subclass
            return subclass
        return inner
