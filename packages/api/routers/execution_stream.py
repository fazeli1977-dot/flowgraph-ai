from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from packages.api.schemas import GraphRunRequest
from packages.engine.executor import GraphExecutor
import json

router = APIRouter(prefix="/graph", tags=["execution-stream"])

@router.post("/run/stream")
async def run_graph_stream(request: GraphRunRequest):
    async def event_generator():
        executor = GraphExecutor()

        nodes_data = [
            node.model_dump() if hasattr(node, "model_dump") else (node.dict() if hasattr(node, "dict") else node)
            for node in request.nodes
        ]
        edges_data = [
            edge.model_dump() if hasattr(edge, "model_dump") else (edge.dict() if hasattr(edge, "dict") else edge)
            for edge in request.edges
        ]

        yield f"data: {json.dumps({'status': 'started'})}\n\n"
        try:
            result = await executor.run(nodes=nodes_data, edges=edges_data)
            import dataclasses
            result_dict = dataclasses.asdict(result) if dataclasses.is_dataclass(result) else result
            yield f"data: {json.dumps({'status': 'completed', 'results': result_dict})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'detail': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
