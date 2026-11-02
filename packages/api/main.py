from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from packages.api.routers.nodes import router as nodes_router
from packages.api.routers.execution import router as execution_router
from packages.api.routers.execution_stream import router as execution_stream_router

app = FastAPI(title="FlowGraph AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nodes_router, prefix="/api/v1")
app.include_router(execution_router, prefix="/api/v1")
app.include_router(execution_stream_router, prefix="/api/v1")
