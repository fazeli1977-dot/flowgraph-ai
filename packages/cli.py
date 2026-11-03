import argparse
import json
import sys
import time
from pathlib import Path
import psutil

# Ensure all engine node types are registered
import packages.engine.polars_node
try:
    import packages.engine.civil_nodes
except ImportError:
    pass

from packages.engine.executor import GraphExecutor

def load_pipeline_spec(file_path: Path | str) -> dict:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Pipeline file not found: {path.resolve()}")
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)

def run_pipeline_command(file_path: str, verbose: bool = False) -> int:
    try:
        spec = load_pipeline_spec(file_path)
    except Exception as e:
        sys.stderr.write(f"❌ Error loading pipeline configuration: {e}\n")
        return 1

    nodes = spec.get("nodes", {})
    edges = spec.get("edges", [])
    initial_inputs = spec.get("initial_inputs", {})

    print("[bold]====================================================")
    print("🚀 FlowGraph-AI Headless Engine Runner")
    print(f"📄 Target Pipeline: {Path(file_path).resolve()}")
    print("====================================================\n")
    print(f"🔹 Nodes Count: {len(nodes)}")
    print(f"🔹 Edges Count: {len(edges)}")
    print(f"🔹 Initial Inputs Provided: {list(initial_inputs.keys())}\n")

    process = psutil.Process()
    mem_before = process.memory_info().rss
    psutil.cpu_percent(interval=None)

    executor = GraphExecutor()
    start_time = time.perf_counter()

    try:
        result = executor.run_sync(
            nodes=nodes,
            edges=edges,
            initial_inputs=initial_inputs
        )
    except Exception as exc:
        sys.stderr.write(f"❌ Execution Exception: {exc}\n")
        return 1

    exec_duration_ms = (time.perf_counter() - start_time) * 1000
    mem_after = process.memory_info().rss
    mem_delta = mem_after - mem_before
    peak_cpu = psutil.cpu_percent(interval=None)

    print("----------------------------------------------------")
    print(f"⚡ Execution Status: {result.status.upper()}")
    print(f"⏱️ Total Execution Time: {exec_duration_ms:.2f} ms")
    print(f"🧠 Memory Delta (RSS): {mem_delta / 1024:.2f} KB ({mem_delta:+,.2f} B)")
    print(f"💻 Peak System CPU Usage: {peak_cpu}%")
    print("----------------------------------------------------")

    if result.status.lower() != "success":
        sys.stderr.write(f"❌ Pipeline Failure Reason: {result.error}\n")
        return 1

    if verbose:
        print("\n📊 Detailed Node Execution Results:")
        for node_id, output in result.node_outputs.items():
            print(f"  • Node [{node_id}]: {json.dumps(output, default=str)}")

    return 0

def main():
    parser = argparse.ArgumentParser(
        prog="flowgraph-cli",
        description="FlowGraph-AI Headless Pipeline Runner with Hardware Telemetry"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Run a pipeline JSON file directly")
    run_parser.add_argument("pipeline_file", type=str, help="Path to pipeline JSON specification")
    run_parser.add_argument("-v", "--verbose", action="store_true", help="Print detailed outputs per node")

    args = parser.parse_args()

    if args.command == "run":
        sys.exit(run_pipeline_command(args.pipeline_file, verbose=args.verbose))

if __name__ == "__main__":
    main()
