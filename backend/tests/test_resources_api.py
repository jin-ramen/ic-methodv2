from uuid import uuid4
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.deps import get_db
from app.booking import models


@pytest.fixture
def client(engine, session):
    def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


class TestResourceCRUD:
    def test_create_resource(self, client):
        resp = client.post("/resources", json={
            "name": "Consultation Room A",
            "capacity": 1,
            "duration_minutes": 30,
        })
        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Consultation Room A"
        assert body["is_active"] is True
        assert "id" in body

    def test_create_resource_with_defaults(self, client):
        resp = client.post("/resources", json={"name": "Simple Room"})
        assert resp.status_code == 201
        body = resp.json()
        assert body["capacity"] == 1
        assert body["duration_minutes"] == 30
        assert body["buffer_minutes"] == 0

    def test_create_resource_rejects_invalid_capacity(self, client):
        resp = client.post("/resources", json={"name": "Bad", "capacity": 0})
        assert resp.status_code == 422

    def test_create_resource_rejects_empty_name(self, client):
        resp = client.post("/resources", json={"name": ""})
        assert resp.status_code == 422

    def test_list_resources(self, client):
        client.post("/resources", json={"name": "Room A"})
        client.post("/resources", json={"name": "Room B"})
        resp = client.get("/resources")
        assert resp.status_code == 200
        names = [r["name"] for r in resp.json()]
        assert "Room A" in names
        assert "Room B" in names

    def test_list_excludes_inactive_by_default(self, client):
        r = client.post("/resources", json={"name": "Room A"}).json()
        client.delete(f"/resources/{r['id']}")

        active = client.get("/resources").json()
        assert all(x["id"] != r["id"] for x in active)

        all_resources = client.get("/resources?include_inactive=true").json()
        assert any(x["id"] == r["id"] for x in all_resources)

    def test_get_resource(self, client):
        r = client.post("/resources", json={"name": "Room A"}).json()
        resp = client.get(f"/resources/{r['id']}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Room A"

    def test_get_unknown_resource_404(self, client):
        resp = client.get(f"/resources/{uuid4()}")
        assert resp.status_code == 404

    def test_patch_resource(self, client):
        r = client.post("/resources", json={"name": "Room A"}).json()
        resp = client.patch(f"/resources/{r['id']}", json={"name": "Room A (renamed)"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "Room A (renamed)"

    def test_patch_partial_update(self, client):
        r = client.post("/resources", json={
            "name": "Room A",
            "duration_minutes": 30,
            "buffer_minutes": 0,
        }).json()
        # Only update buffer — name and duration should stay
        resp = client.patch(f"/resources/{r['id']}", json={"buffer_minutes": 15})
        body = resp.json()
        assert body["name"] == "Room A"
        assert body["duration_minutes"] == 30
        assert body["buffer_minutes"] == 15

    def test_patch_empty_body_rejected(self, client):
        r = client.post("/resources", json={"name": "Room A"}).json()
        resp = client.patch(f"/resources/{r['id']}", json={})
        assert resp.status_code == 400

    def test_delete_is_soft_delete(self, client):
        r = client.post("/resources", json={"name": "Room A"}).json()
        resp = client.delete(f"/resources/{r['id']}")
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

        # Still retrievable by ID
        resp = client.get(f"/resources/{r['id']}")
        assert resp.status_code == 200


class TestAvailabilityRules:
    @pytest.fixture
    def resource_id(self, client):
        return client.post("/resources", json={"name": "Room A"}).json()["id"]

    def test_create_rule(self, client, resource_id):
        resp = client.post(f"/resources/{resource_id}/availability-rules", json={
            "day_of_week": 0,
            "start_time": "09:00:00",
            "end_time": "17:00:00",
        })
        assert resp.status_code == 201
        body = resp.json()
        assert body["day_of_week"] == 0
        assert body["start_time"] == "09:00:00"

    def test_create_rule_rejects_invalid_dow(self, client, resource_id):
        resp = client.post(f"/resources/{resource_id}/availability-rules", json={
            "day_of_week": 7,
            "start_time": "09:00:00",
            "end_time": "17:00:00",
        })
        assert resp.status_code == 422

    def test_create_rule_rejects_end_before_start(self, client, resource_id):
        resp = client.post(f"/resources/{resource_id}/availability-rules", json={
            "day_of_week": 0,
            "start_time": "17:00:00",
            "end_time": "09:00:00",
        })
        assert resp.status_code == 422

    def test_create_rule_unknown_resource(self, client):
        resp = client.post(f"/resources/{uuid4()}/availability-rules", json={
            "day_of_week": 0,
            "start_time": "09:00:00",
            "end_time": "17:00:00",
        })
        assert resp.status_code == 404

    def test_list_rules_ordered(self, client, resource_id):
        # Add rules out of order
        client.post(f"/resources/{resource_id}/availability-rules", json={
            "day_of_week": 4, "start_time": "09:00:00", "end_time": "17:00:00",
        })
        client.post(f"/resources/{resource_id}/availability-rules", json={
            "day_of_week": 0, "start_time": "09:00:00", "end_time": "17:00:00",
        })
        client.post(f"/resources/{resource_id}/availability-rules", json={
            "day_of_week": 0, "start_time": "18:00:00", "end_time": "20:00:00",
        })

        rules = client.get(f"/resources/{resource_id}/availability-rules").json()
        # Expect: Mon 09:00, Mon 18:00, Fri 09:00
        assert [r["day_of_week"] for r in rules] == [0, 0, 4]
        assert rules[0]["start_time"] < rules[1]["start_time"]

    def test_delete_rule(self, client, resource_id):
        r = client.post(f"/resources/{resource_id}/availability-rules", json={
            "day_of_week": 0, "start_time": "09:00:00", "end_time": "17:00:00",
        }).json()

        resp = client.delete(f"/availability-rules/{r['id']}")
        assert resp.status_code == 204

        remaining = client.get(f"/resources/{resource_id}/availability-rules").json()
        assert len(remaining) == 0


class TestEndToEndFlow:
    """Drives the full flow via the API — no direct DB access."""

    def test_create_resource_add_rules_book_and_check_availability(self, client):
        # 1. Create a resource
        r = client.post("/resources", json={
            "name": "Test Room",
            "duration_minutes": 30,
        }).json()

        # 2. Add an availability rule (Friday 09:00-11:00)
        client.post(f"/resources/{r['id']}/availability-rules", json={
            "day_of_week": 4,
            "start_time": "09:00:00",
            "end_time": "11:00:00",
        })

        # 3. Check availability on a Friday — should have 4 slots
        resp = client.get(
            f"/resources/{r['id']}/availability",
            params={"from": "2026-05-01", "to": "2026-05-01"},
        )
        assert len(resp.json()["slots"]) == 4

        # 4. Book one slot
        booking = client.post("/bookings", json={
            "resource_id": r["id"],
            "customer_email": "jin@example.com",
            "customer_name": "Jin",
            "start_time": "2026-05-01T09:30:00+00:00",
            "end_time": "2026-05-01T10:00:00+00:00",
        }).json()

        # 5. Availability now shows 3 slots
        resp = client.get(
            f"/resources/{r['id']}/availability",
            params={"from": "2026-05-01", "to": "2026-05-01"},
        )
        assert len(resp.json()["slots"]) == 3

        # 6. Cancel the booking — slot returns
        client.post(f"/bookings/{booking['id']}/cancel")
        resp = client.get(
            f"/resources/{r['id']}/availability",
            params={"from": "2026-05-01", "to": "2026-05-01"},
        )
        assert len(resp.json()["slots"]) == 4