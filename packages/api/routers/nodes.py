from fastapi import APIRouter
from packages.engine.node_base import NodeRegistry
import packages.engine.polars_node
import packages.engine.civil_nodes

router = APIRouter(tags=["nodes"])

@router.get("")
@router.get("/")
@router.get("/nodes")
@router.get("/nodes/")
@router.get("/nodes/registry")
def get_nodes():
    registry_data = []
    category_map = {
        "polars_node": {
            "label": "Polars Transform",
            "category": "Data Processing",
            "description": "High-performance Polars DataFrame operations"
        },
        "mass_balance_node": {
            "label": "Mass Balance Analysis",
            "category": "Civil & Environmental",
            "description": "Environmental mass accumulation and reaction rate modeling"
        },
        "energy_efficiency_node": {
            "label": "Energy Efficiency & Loss",
            "category": "Civil & Mechanical",
            "description": "Thermodynamic heat balance and energy recovery estimation"
        }
    }
    
    for name in NodeRegistry._nodes.keys():
        meta = category_map.get(name, {
            "label": name.replace("_", " ").title(),
            "category": "General",
            "description": "Workflow computational node"
        })
        registry_data.append({
            "type": name,
            "label": meta["label"],
            "category": meta["category"],
            "description": meta["description"]
        })
        
    return {
        "nodes": list(NodeRegistry._nodes.keys()),
        "registry": registry_data
    }
