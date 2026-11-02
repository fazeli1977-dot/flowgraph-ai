import asyncio
from packages.engine.polars_node import PolarsNode
from packages.engine.executor import GraphExecutor

async def main():
    executor = GraphExecutor()
    # ??? ?????? ???????? ??????
    node1 = PolarsNode("p1", "DataAnalyzer")
    executor.add_node(node1)
    
    # ???????? ???? (????? ????? ???????? ?????)
    input_data = {"data": {"temperature": [22.5, 23.0, 24.1], "pressure": [1012, 1013, 1011]}}
    
    results = await executor.run_pipeline(["p1"], input_data)
    print(f"Result: {results[0].outputs}")

if __name__ == "__main__":
    asyncio.run(main())
