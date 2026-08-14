import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_phase9_observability_request_tracing():
    """
    Step 6 — Observability & Request Tracing Verification
    Verifies that X-Request-ID headers are dynamically generated and populated in HTTP responses.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test default auto-generated X-Request-ID
        res1 = await client.get("/health")
        assert res1.status_code == 200
        req_id1 = res1.headers.get("X-Request-ID")
        assert req_id1 is not None and len(req_id1) > 0, "Missing X-Request-ID in response header"

        # Test client-supplied X-Request-ID propagation
        custom_id = "custom-trace-12345-abcdef"
        res2 = await client.get("/health", headers={"X-Request-ID": custom_id})
        assert res2.status_code == 200
        req_id2 = res2.headers.get("X-Request-ID")
        assert req_id2 == custom_id, f"Failed to propagate custom X-Request-ID: {req_id2}"

        print("\n" + "=" * 60)
        print("[OMNIVERSE OBSERVABILITY & TRACING PASSED]")
        print("=" * 60)
        print(f"1. Auto-Generated Request ID: {req_id1[:18]}...")
        print(f"2. Custom Trace ID Propagated: {req_id2}")
        print("=" * 60)
