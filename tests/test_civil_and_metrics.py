import pytest
import polars as pl
from packages.engine.civil_nodes import MassBalanceNode, EnergyEfficiencyNode
from packages.engine.executor import GraphExecutor
from packages.engine.node_base import NodeRegistry


@pytest.mark.anyio
async def test_mass_balance_node_execution_and_metrics():
    node = MassBalanceNode(node_id="mb1", generation_rate=25.0, consumption_rate=10.0)
    inflow = pl.DataFrame({"mass": [100.0, 50.0]})
    outflow = pl.DataFrame({"mass": [30.0, 40.0]})

    result = await node.execute({"inflow": inflow, "outflow": outflow})

    assert result.status == "success"
    df_res = result.outputs["balance"]
    assert df_res["total_mass_in"][0] == 150.0
    assert df_res["total_mass_out"][0] == 70.0
    assert df_res["accumulation"][0] == (150.0 - 70.0) + 25.0 - 10.0

    # Verify psutil metrics injection
    assert "duration_ms" in result.metrics
    assert "cpu_percent" in result.metrics
    assert "peak_memory_mb" in result.metrics
    assert result.metrics["peak_memory_mb"] > 0


@pytest.mark.anyio
async def test_energy_efficiency_pipeline():
    energy_df = pl.DataFrame({
        "useful_out": [80.0, 180.0],
        "total_in": [100.0, 200.0]
    })
    node = EnergyEfficiencyNode(node_id="eff1")
    result = await node.execute({"energy_data": energy_df})

    assert result.status == "success"
    res_df = result.outputs["result"]
    assert res_df["efficiency_eta"].to_list() == [0.8, 0.9]
    assert "duration_ms" in result.metrics


def test_registry_contains_civil_nodes():
    assert "mass_balance_node" in NodeRegistry._nodes
    assert "energy_efficiency_node" in NodeRegistry._nodes
