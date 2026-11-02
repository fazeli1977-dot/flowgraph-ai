from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from packages.api.routers.execution import GraphRunRequest
from packages.engine.executor import GraphExecutor
import json

router = APIRouter(prefix="/graph", tags=["execution-stream"])

@router.post("/run/stream")
async def run_graph_stream(request: GraphRunRequest):
    async def event_generator():
        executor = GraphExecutor()
        # اکنون request.nodes لیست اشیاء NodeRequest است که متد model_dump دارند
        nodes_data = [node.model_dump() for node in request.nodes]
        edges_data = [edge.model_dump() for edge in request.edges]
        
        yield f"data: {json.dumps({'status': 'started'})}\n\n"
        try:
            result = await executor.execute(nodes=nodes_data, edges=edges_data)
            yield f"data: {json.dumps({'status': 'completed', 'results': result})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'detail': str(e)})}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")
