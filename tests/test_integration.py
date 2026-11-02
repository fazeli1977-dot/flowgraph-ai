from fastapi.testclient import TestClient
from packages.api.main import app

client = TestClient(app)

def test_graph_run_integration():
    payload = {
        "nodes": [
            {"id": "source", "type": "PolarsNode", "data": {"action": "load"}},
            {"id": "target", "type": "PolarsNode", "data": {"action": "filter"}}
        ],
        "edges": [{"source": "source", "target": "target"}]
    }
    response = client.post("/api/v1/graph/run", json=payload)
    # با توجه به اینکه در فازهای قبل execution.py را برای بازگشت status تنظیم کردیم
    assert response.status_code == 200
    assert "status" in response.json()

def test_graph_stream_integration():
    payload = {
        "nodes": [{"id": "n1", "type": "PolarsNode", "data": {"action": "test"}}],
        "edges": []
    }
    with client.stream("POST", "/api/v1/graph/run/stream", json=payload) as response:
        assert response.status_code == 200
