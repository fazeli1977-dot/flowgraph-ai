import json
from pathlib import Path
from packages.cli import load_pipeline_spec, run_pipeline_command

def test_load_pipeline_spec(tmp_path: Path):
    test_file = tmp_path / "test_pipeline.json"
    content = {"nodes": {"a": {"type": "polars_node"}}, "edges": []}
    test_file.write_text(json.dumps(content), encoding="utf-8-sig")
    
    spec = load_pipeline_spec(test_file)
    assert "nodes" in spec
    assert "a" in spec["nodes"]

def test_cli_run_pipeline_command(tmp_path: Path):
    test_file = tmp_path / "valid_pipeline.json"
    content = {
        "nodes": {
            "node_1": {
                "type": "polars_node",
                "config": {"operation": "select", "columns": ["q_in"]}
            },
            "node_2": {
                "type": "polars_node",
                "config": {"operation": "filter", "column": "q_in", "operator": ">", "value": 100}
            }
        },
        "edges": [
            {"from": "node_1", "to": "node_2"}
        ],
        "initial_inputs": {
            "node_1": {
                "data": {"q_in": [80.0, 120.0, 150.0]}
            }
        }
    }
    test_file.write_text(json.dumps(content), encoding="utf-8")
    
    exit_code = run_pipeline_command(str(test_file), verbose=False)
    assert exit_code == 0
