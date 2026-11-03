"""
flowgraph-ai Headless CLI Pipeline Runner
Executes FlowGraph DAG pipelines headless with live telemetry (psutil).
"""
import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any, Dict

import psutil
from packages.engine.executor import GraphExecutor


def load_pipeline_spec(file_path: Path) -> Dict[str, Any]:
    if not file_path.exists():
        raise FileNotFoundError(f"Pipeline definition file not found: {file_path}")
    
    with open(file_path, "r", encoding="utf-8-sig") as f:
        spec = json.load(f)
    return spec


def format_bytes(bytes_num: float) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if bytes_num < 1024.0:
            return f"{bytes_num:.2f} {unit}"
        bytes_num /= 1024.0
    return f"{bytes_num:.2f} TB"


def run_pipeline_command(file_path: str, verbose: bool = False) -> int:
    path = Path(file_path)
    print(f"\n[bold]====================================================")
    print(f"🚀 FlowGraph-AI Headless Engine Runner")
    print(f"📄 Target Pipeline: {path.resolve()}")
    print(f"====================================================\n")

    try:
        spec = load_pipeline_spec(path)
    except Exception as exc:
        print(f"❌ Failed to load pipeline JSON: {exc}", file=sys.stderr)
        return 1

    nodes = spec.get("nodes", {})
    edges = spec.get("edges", [])
    initial_inputs = spec.get("initial_inputs", {})

    print(f"🔹 Nodes Count: {len(nodes)}")
    print(f"🔹 Edges Count: {len(edges)}")
    print(f"🔹 Initial Inputs Provided: {list(initial_inputs.keys())}")

    process = psutil.Process()
    mem_before = process.memory_info().rss
    cpu_before = process.cpu_percent(interval=None)

    executor = GraphExecutor()
    start_time = time.perf_counter()

    try:
        result = executor.run_sync(
            nodes=nodes,
            edges=edges,
            initial_inputs=initial_inputs
        )
    except Exception as exc:
        print(f"\n❌ Execution Exception: {exc}", file=sys.stderr)
        return 1

    elapsed_time = (time.perf_counter() - start_time) * 1000.0
    mem_after = process.memory_info().rss
    mem_diff = mem_after - mem_before
    cpu_after = process.cpu_percent(interval=None)

    print("\n----------------------------------------------------")
    print(f"⚡ Execution Status: {result.status.upper()}")
    print(f"⏱️ Total Execution Time: {elapsed_time:.2f} ms")
    print(f"🧠 Memory Delta (RSS): {format_bytes(abs(mem_diff))} ({'+' if mem_diff >= 0 else '-'}{format_bytes(abs(mem_diff))})")
    print(f"💻 Peak System CPU Usage: {cpu_after:.1f}%")
    print("----------------------------------------------------")

    if result.status != "success":
        print(f"❌ Pipeline Failure Reason: {result.error}", file=sys.stderr)
        return 1

    print("\n📦 Node Outputs Summary:")
    for node_id, output in result.node_outputs.items():
        node_type = nodes.get(node_id, {}).get("type", "unknown") if isinstance(nodes, dict) else "node"
        keys_summary = list(output.keys()) if isinstance(output, dict) else type(output).__name__
        print(f"  • Node [{node_id}] (Type: {node_type}) -> Output keys: {keys_summary}")
        if verbose:
            print(f"    Detail: {output}")

    print("\n✨ Pipeline execution finished successfully.\n")
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="FlowGraph-AI Pipeline CLI Runner",
        prog="python -m packages.cli"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Run a pipeline JSON definition file")
    run_parser.add_argument("pipeline_path", type=str, help="Path to pipeline JSON file")
    run_parser.add_argument("-v", "--verbose", action="store_true", help="Print verbose output for all nodes")

    args = parser.parse_args()

    if args.command == "run":
        exit_code = run_pipeline_command(args.pipeline_path, verbose=args.verbose)
        sys.exit(exit_code)


if __name__ == "__main__":
    main()
