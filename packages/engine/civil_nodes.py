import polars as pl
from typing import Any, Dict
from packages.engine.node_base import BaseNode, NodeExecutionResult, NodeRegistry


def _ensure_polars_df(data: Any, default_col: str = "mass") -> pl.DataFrame:
    """Helper to safely convert raw dict/list or polars.DataFrame into pl.DataFrame."""
    if data is None:
        return pl.DataFrame({default_col: [0.0]})
    if isinstance(data, pl.DataFrame):
        return data
    if isinstance(data, list):
        if len(data) == 0:
            return pl.DataFrame({default_col: [0.0]})
        return pl.DataFrame(data)
    if isinstance(data, dict):
        return pl.DataFrame([data])
    return pl.DataFrame({default_col: [0.0]})


@NodeRegistry.register("mass_balance_node")
class MassBalanceNode(BaseNode):
    """
    Civil/Environmental Engineering Node: Computes Mass Balance.
    Accumulation = Inflow - Outflow + Generation - Consumption
    """
    def run(self, data: Dict[str, Any]) -> NodeExecutionResult:
        df_in = _ensure_polars_df(data.get("inflow"), default_col="mass")
        df_out = _ensure_polars_df(data.get("outflow"), default_col="mass")

        mass_in = float(df_in["mass"].sum()) if "mass" in df_in.columns else 0.0
        mass_out = float(df_out["mass"].sum()) if "mass" in df_out.columns else 0.0
        generation = float(self.config.get("generation_rate", 0.0))
        consumption = float(self.config.get("consumption_rate", 0.0))

        accumulation = (mass_in - mass_out) + generation - consumption

        # Balance summary DataFrame (always returned under "balance")
        result_df = pl.DataFrame({
            "total_mass_in": [mass_in],
            "total_mass_out": [mass_out],
            "generation": [generation],
            "consumption": [consumption],
            "accumulation": [accumulation]
        })

        # If upstream provided a flow rate DataFrame, enrich it with derived metrics
        enriched_df = df_in
        if pl is not None and isinstance(df_in, pl.DataFrame) and not df_in.is_empty():
            if "flow_rate_m3h" in df_in.columns and "bod5_mg_l" in df_in.columns:
                enriched_df = df_in.with_columns(
                    ((pl.col("flow_rate_m3h") * pl.col("bod5_mg_l")) / 1000.0).alias("mass_in_kg_h")
                )
            preview = enriched_df.head(10).to_dicts()
            output_rows = enriched_df.height
        else:
            preview = result_df.to_dicts()
            output_rows = result_df.height
            enriched_df = result_df

        outputs = {
            "balance": result_df,
            "data": enriched_df,
            "preview": preview,
            "output_rows": output_rows,
        }

        return NodeExecutionResult(outputs=outputs)


@NodeRegistry.register("energy_efficiency_node")
class EnergyEfficiencyNode(BaseNode):
    """
    Civil/Environmental Engineering Node: Computes Energy Efficiency.
    Efficiency (eta) = Useful Energy Out / Total Energy In
    """
    def run(self, data: Dict[str, Any]) -> NodeExecutionResult:
        df = _ensure_polars_df(data.get("energy_data"), default_col="total_in")

        if df.is_empty() or "useful_out" not in df.columns or "total_in" not in df.columns:
            return NodeExecutionResult(outputs={"result": df}, status="skipped_missing_columns")

        df = df.with_columns(
            (pl.col("useful_out") / pl.col("total_in")).alias("efficiency_eta")
        )

        return NodeExecutionResult(outputs={"result": df, "preview": df.head(10).to_dicts(), "output_rows": df.height})
