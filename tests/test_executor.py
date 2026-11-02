"""Tests for the DAG graph executor."""

import polars as pl
import pytest

from packages.engine.executor import GraphExecutor, CycleDetectedError
from packages.engine.polars_node import PolarsNode


def test_multi_node_polars_transfer():
    frame = pl.DataFrame({"value": [1, 2, 3], "label": ["a", "b", "c"]})

    nodes = {
        "extract": PolarsNode(node_id="extract"),
        "transform": PolarsNode(node_id="transform", operation="passthrough"),
    }
    edges = [("extract", "transform")]

    executor = GraphExecutor(nodes=nodes, edges=edges)
    result = executor.run_sync(initial_inputs={"extract": {"data": frame}})

    assert result.status == "success"
    assert "extract" in result.node_outputs
    assert "transform" in result.node_outputs

    output_frame = result.node_outputs["transform"]["data"]
    assert isinstance(output_frame, pl.DataFrame)
    assert output_frame.equals(frame)
    assert result.node_outputs["transform"]["row_count"] == frame.height


def test_topological_order_handles_multiple_inputs():
    nodes = {
        "a": PolarsNode(node_id="a"),
        "b": PolarsNode(node_id="b"),
        "c": PolarsNode(node_id="c"),
    }
    edges = [("a", "c"), ("b", "c")]

    executor = GraphExecutor(nodes=nodes, edges=edges)
    order = executor.topological_order()

    assert order.index("a") < order.index("c")
    assert order.index("b") < order.index("c")


def test_cycle_detection():
    nodes = {
        "a": PolarsNode(node_id="a"),
        "b": PolarsNode(node_id="b"),
    }
    edges = [("a", "b"), ("b", "a")]

    executor = GraphExecutor(nodes=nodes, edges=edges)
    with pytest.raises((CycleDetectedError, ValueError)):
        executor.topological_order()


def test_graph_payload_from_list():
    frame = pl.DataFrame({"x": [10, 20]})

    nodes = [
        {"id": "source", "type": "polars_node"},
        {"id": "sink", "type": "polars_node"},
    ]
    edges = [{"source": "source", "target": "sink"}]

    executor = GraphExecutor()
    result = executor.run_sync(nodes=nodes, edges=edges, initial_inputs={"source": {"data": frame}})

    assert result.status == "success"
    assert result.node_outputs["sink"]["data"].equals(frame)


def test_failed_node_marks_result_failed():
    class BrokenNode(PolarsNode):
        def run(self, data):
            raise RuntimeError("boom")

    executor = GraphExecutor(nodes={"broken": BrokenNode(node_id="broken")}, edges=[])
    result = executor.run_sync()

    assert result.status == "failed"
    assert result.error is not None
    assert "boom" in result.error
