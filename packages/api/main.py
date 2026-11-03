from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from packages.api.routers.nodes import router as nodes_router
from packages.api.routers.execution import router as execution_router
from packages.api.routers.execution_stream import router as execution_stream_router
from packages.api.routers.export import router as export_router

app = FastAPI(title="FlowGraph AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nodes_router, prefix="/api/v1")
app.include_router(execution_router, prefix="/api/v1")
app.include_router(execution_stream_router, prefix="/api/v1")
app.include_router(export_router, prefix="/api/v1")


@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "FlowGraph AI API"}
