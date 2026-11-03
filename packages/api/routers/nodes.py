from fastapi import APIRouter
from packages.engine.node_base import NodeRegistry
import packages.engine.polars_node

router = APIRouter(tags=["nodes"])

ENGINEERING_CATALOG = [
    {
        "type": "scan_csv",
        "label": "CSV / Inflow Data",
        "category": "Source",
        "description": "Reads CSV data into Polars DataFrame",
    },
    {
        "type": "mass_balance",
        "label": "Civil Mass Balancer",
        "category": "Civil & Environmental",
        "description": "Calculates hydraulic mass balance and flow splits",
    },
    {
        "type": "energy_efficiency",
        "label": "Energy Efficiency Balancer",
        "category": "Civil & Mechanical",
        "description": "Evaluates specific energy consumption kWh/m3",
    },
    {
        "type": "polars_node",
        "label": "Polars Data Transformer",
        "category": "Transform",
        "description": "High-performance Polars tabular operations",
    },
]

@router.get("")
@router.get("/")
@router.get("/nodes")
@router.get("/nodes/")
async def get_nodes():
    return {"nodes": ENGINEERING_CATALOG}
