"""DAG-based graph execution engine for flowgraph-ai."""

from __future__ import annotations

import asyncio
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from graphlib import CycleError, TopologicalSorter
from typing import Any, Dict, Iterable, List, Optional, Tuple, Union


from packages.engine.node_base import BaseNode, NodeExecutionResult
import packages.engine.polars_node  # noqa: F401

NodePayload = Union[BaseNode, Dict[str, Any], str]
EdgePayload = Union[Dict[str, Any], Tuple[Any, Any], List[Any]]


class CycleDetectedError(ValueError):
    """Raised when a graph contains a cycle."""


class GraphExecutionError(RuntimeError):
    """Raised when a node fails during execution."""
@dataclass
class GraphExecutionResult:
    """Result of executing a graph."""

    execution_id: str
    status: str
    node_outputs: Dict[str, Any] = field(default_factory=dict)
    execution_time: float = 0.0
    error: Optional[str] = None

    def __getitem__(self, key: str) -> Any:
        return getattr(self, key)


class GraphExecutor:
    """Execute a directed acyclic graph of nodes."""

    def __init__(
        self,
        nodes: Optional[Any] = None,
        edges: Optional[Any] = None,
    ):
        self.nodes: Dict[str, BaseNode] = {}
        self.edges: List[Tuple[str, str]] = []
        self._predecessors: Dict[str, List[str]] = defaultdict(list)
        self._successors: Dict[str, List[str]] = defaultdict(list)

        if nodes is not None or edges is not None:
            self.load_graph(nodes or {}, edges or [])

    def add_node(
        self,
        node: Optional[NodePayload] = None,
        node_id: Optional[str] = None,
        **config: Any,
    ) -> str:
        resolved_id, resolved_node = self._coerce_node(node, node_id, config)
        if resolved_id in self.nodes:
            raise ValueError(f"Duplicate node id: {resolved_id}")
        self.nodes[resolved_id] = resolved_node
        self._predecessors.setdefault(resolved_id, [])
        self._successors.setdefault(resolved_id, [])
        return resolved_id

    def add_edge(self, source: str, target: str) -> None:
        if source not in self.nodes or target not in self.nodes:
            raise ValueError("Edges must reference registered nodes")
        if (source, target) not in self.edges:
            self.edges.append((source, target))
        if source not in self._predecessors[target]:
            self._predecessors[target].append(source)
        if target not in self._successors[source]:
            self._successors[source].append(target)

    def load_graph(self, nodes: Any, edges: Any) -> None:
        self.nodes.clear()
        self.edges.clear()
        self._predecessors.clear()
        self._successors.clear()

        normalized_nodes = self._normalize_nodes(nodes)
        for node_id, node in normalized_nodes.items():
            self.nodes[node_id] = node
            self._predecessors.setdefault(node_id, [])
            self._successors.setdefault(node_id, [])

        for source, target in self._normalize_edges(edges):
            self.add_edge(source, target)

    def topological_order(self) -> List[str]:
        sorter = TopologicalSorter()
        for node_id in self.nodes:
            sorter.add(node_id, *self._predecessors.get(node_id, []))

        try:
            return list(sorter.static_order())
        except CycleError as exc:
            raise CycleDetectedError("Cycle detected in graph") from exc

    async def run(
        self,
        nodes: Optional[Any] = None,
        edges: Optional[Any] = None,
        initial_inputs: Optional[Any] = None,
        graph: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> GraphExecutionResult:
        execution_id = str(uuid.uuid4())
        start_time = time.perf_counter()
        
        try:
            if isinstance(nodes, dict) and ("nodes" in nodes or "edges" in nodes or "initial_inputs" in nodes):
                graph = nodes
                nodes = None
            if graph is not None:
                nodes = graph.get("nodes", nodes)
                edges = graph.get("edges", edges)
                initial_inputs = graph.get("initial_inputs", initial_inputs)
            if "initial_inputs" in kwargs:
                initial_inputs = kwargs.pop("initial_inputs")
            if "graph" in kwargs:
                g = kwargs.pop("graph")
                nodes = g.get("nodes", nodes)
                edges = g.get("edges", edges)
                initial_inputs = g.get("initial_inputs", initial_inputs)
            
            if nodes is not None or edges is not None:
                self.load_graph(nodes if nodes is not None else {}, edges if edges is not None else [])
        

            order = self.topological_order()
            node_outputs: Dict[str, Any] = {}

            for node_id in order:
                node = self.nodes[node_id]
                input_data = self._build_input_data(node_id, initial_inputs, node_outputs)
                try:
                    result = node.run(input_data)
                    if asyncio.iscoroutine(result):
                        result = await result
                except Exception as exc:
                    raise GraphExecutionError(f"Node '{node_id}' failed: {exc}") from exc

                if isinstance(result, NodeExecutionResult):
                    outputs = result.outputs
                elif isinstance(result, dict):
                    outputs = result
                else:
                    outputs = {"result": result}

                node_outputs[node_id] = outputs

            return GraphExecutionResult(
                execution_id=execution_id,
                status="success",
                node_outputs=node_outputs,
                execution_time=time.perf_counter() - start_time,
            )
        except (CycleDetectedError, GraphExecutionError, ValueError, KeyError) as exc:
            return GraphExecutionResult(
                execution_id=execution_id,
                status="failed",
                node_outputs=locals().get("node_outputs", {}),
                execution_time=time.perf_counter() - start_time,
                error=str(exc),
            )

    async def execute(self, *args: Any, **kwargs: Any) -> GraphExecutionResult:
        return await self.run(*args, **kwargs)

    async def run_graph(self, *args: Any, **kwargs: Any) -> GraphExecutionResult:
        return await self.run(*args, **kwargs)

    def run_sync(self, *args: Any, **kwargs: Any) -> GraphExecutionResult:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self.run(*args, **kwargs))
        finally:
            loop.close()

    async def run_pipeline(
        self,
        execution_order: List[str],
        initial_data: Optional[Dict[str, Any]] = None,
    ) -> List[NodeExecutionResult]:
        nodes = {node_id: self.nodes[node_id] for node_id in execution_order if node_id in self.nodes}
        edges = [(execution_order[i], execution_order[i + 1]) for i in range(len(execution_order) - 1)]
        result = await self.run(nodes=nodes, edges=edges, initial_inputs=initial_data)
        if result.status != "success":
            raise GraphExecutionError(result.error or "Graph execution failed")
        return [NodeExecutionResult(outputs=result.node_outputs[node_id]) for node_id in execution_order]

    def _build_input_data(
        self,
        node_id: str,
        initial_inputs: Any,
        node_outputs: Dict[str, Any],
    ) -> Dict[str, Any]:
        input_data: Dict[str, Any] = {}

        predecessors = self._predecessors.get(node_id, [])
        if not predecessors and isinstance(initial_inputs, dict):
            if node_id in initial_inputs:
                value = initial_inputs[node_id]
                if isinstance(value, dict):
                    input_data.update(value)
                else:
                    input_data["input"] = value
            else:
                input_data.update(initial_inputs)

        for predecessor in predecessors:
            predecessor_output = node_outputs.get(predecessor, {})
            if isinstance(predecessor_output, dict):
                input_data.setdefault("inputs", {})[predecessor] = predecessor_output
                for key, value in predecessor_output.items():
                    input_data.setdefault(key, value)

        return input_data

    def _coerce_node(
        self,
        node: Optional[Any],
        node_id: Optional[str],
        config: Dict[str, Any],
    ) -> Tuple[str, BaseNode]:
        if isinstance(node, BaseNode):
            resolved_id = node_id or node.node_id
            if resolved_id is None:
                raise ValueError("Node id is required")
            node.node_id = resolved_id
            if config:
                node.config.update(config)
            return resolved_id, node

        if isinstance(node, str):
            resolved_type = node
            resolved_id = node_id or config.pop("id", None) or config.pop("node_id", None)
            if resolved_id is None:
                raise ValueError("Node id is required")
            resolved_node = self._instantiate_node(resolved_id, resolved_type, config)
            return resolved_id, resolved_node

        if isinstance(node, dict):
            data = dict(node)
            resolved_id = node_id or data.pop("id", None) or data.pop("node_id", None)
            if resolved_id is None:
                raise ValueError("Node id is required")
            resolved_type = data.pop("type", None) or data.pop("node_type", None)
            node_config = data.pop("config", None) or data.pop("params", None) or {}
            if isinstance(node_config, dict):
                node_config = {**node_config, **data}
            else:
                node_config = data
            if resolved_type is None:
                existing = data.get("node") if isinstance(data, dict) else None
                if isinstance(existing, BaseNode):
                    existing.node_id = resolved_id
                    if isinstance(node_config, dict):
                        existing.config.update(node_config)
                    return resolved_id, existing
                resolved_type = "polars_node"
            resolved_node = self._instantiate_node(resolved_id, resolved_type, node_config or {})
            return resolved_id, resolved_node

        if node is None:
            resolved_type = config.pop("type", None) or config.pop("node_type", None) or "polars_node"
            if node_id is None:
                node_id = config.pop("id", None) or config.pop("node_id", None)
            if node_id is None:
                raise ValueError("Node id is required")
            resolved_node = self._instantiate_node(node_id, resolved_type, config)
            return node_id, resolved_node

        raise TypeError(f"Unsupported node payload: {type(node)!r}")

    def _instantiate_node(self, node_id: str, node_type: str, config: Dict[str, Any]) -> BaseNode:
        from packages.engine.node_base import NodeRegistry

        if node_type not in NodeRegistry._nodes:
            raise ValueError(f"Unknown node type: {node_type}")
        node_class = NodeRegistry._nodes[node_type]
        try:
            return node_class(node_id=node_id, name=config.pop("name", None), **config)
        except TypeError:
            return node_class(node_id, **config)

    def _normalize_nodes(self, nodes: Any) -> Dict[str, BaseNode]:
        normalized: Dict[str, BaseNode] = {}

        if isinstance(nodes, dict):
            for key, value in nodes.items():
                if isinstance(value, BaseNode):
                    node_id = getattr(value, "node_id", None) or key
                    value.node_id = node_id
                    normalized[node_id] = value
                elif isinstance(value, str):
                    normalized[key] = self._instantiate_node(key, value, {})
                elif isinstance(value, dict):
                    payload = dict(value)
                    payload.setdefault("id", key)
                    node_id, node = self._coerce_node(payload, None, {})
                    normalized[node_id] = node
                else:
                    raise TypeError(f"Unsupported node entry for '{key}': {type(value)!r}")
            return normalized

        if isinstance(nodes, (list, tuple)):
            for item in nodes:
                if isinstance(item, BaseNode):
                    node_id = item.node_id
                    if node_id is None:
                        raise ValueError("Node id is required")
                    normalized[node_id] = item
                elif isinstance(item, dict):
                    node_id, node = self._coerce_node(item, None, {})
                    normalized[node_id] = node
                else:
                    raise TypeError(f"Unsupported node entry: {type(item)!r}")
            return normalized

        raise TypeError(f"Unsupported nodes payload: {type(nodes)!r}")

    def _normalize_edges(self, edges: Any) -> List[Tuple[str, str]]:
        normalized: List[Tuple[str, str]] = []

        if isinstance(edges, dict):
            edges = list(edges.items())

        if not isinstance(edges, (list, tuple)):
            raise TypeError("Edges must be a list or tuple")

        for edge in edges:
            if isinstance(edge, dict):
                source = edge.get("source", edge.get("from", edge.get("src")))
                target = edge.get("target", edge.get("to", edge.get("dst")))
            elif isinstance(edge, (tuple, list)):
                if len(edge) != 2:
                    raise ValueError("Edge tuples must contain exactly two items")
                source, target = edge[0], edge[1]
            else:
                raise TypeError(f"Unsupported edge entry: {type(edge)!r}")

            if not isinstance(source, str) or not isinstance(target, str):
                source = str(source)
                target = str(target)
            normalized.append((source, target))

        return normalized


async def execute_graph(nodes=None, edges=None, initial_inputs=None, graph=None, **kwargs):
    """Convenience functional wrapper for GraphExecutor execution."""
    executor = GraphExecutor()
    return await executor.run(
        nodes=nodes,
        edges=edges,
        initial_inputs=initial_inputs,
        graph=graph,
        **kwargs
    )
