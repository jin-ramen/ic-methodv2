from datetime import datetime, timezone, timedelta, time
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.deps import get_db
from app.booking import models


@pytest.fixture
def client(engine, session):
    """TestClient that shares the test session (so fixtures and API see the same data)."""
    def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def resource(session):
    r = models.Resource(name="Room A", capacity=1, duration_minutes=30, buffer_minutes=0)
    session.add(r)
    session.flush()
    return r


def iso(dt):
    return dt.isoformat()


class TestCreateBooking:
    def test_create_booking_success(self, client, resource):
        start = datetime(2026, 5, 1, 10, 0, tzinfo=timezone.utc)
        end = start + timedelta(minutes=30)
        resp = client.post("/bookings", json={
            "resource_id": str(resource.id),
            "customer_email": "jin@example.com",
            "customer_name": "Jin",
            "start_time": iso(start),
            "end_time": iso(end),
        })
        assert resp.status_code == 201
        body = resp.json()
        assert body["status"] == "confirmed"
        assert body["customer_email"] == "jin@example.com"

    def test_create_booking_conflict_returns_409(self, client, resource):
        start = datetime(2026, 5, 1, 10, 0, tzinfo=timezone.utc)
        end = start + timedelta(minutes=30)
        payload = {
            "resource_id": str(resource.id),
            "customer_email": "jin@example.com",
            "customer_name": "Jin",
            "start_time": iso(start),
            "end_time": iso(end),
        }
        r1 = client.post("/bookings", json=payload)
        assert r1.status_code == 201

        payload["customer_email"] = "other@example.com"
        r2 = client.post("/bookings", json=payload)
        assert r2.status_code == 409
        assert "already booked" in r2.json()["detail"].lower()

    def test_idempotency_key_returns_same_booking(self, client, resource):
        start = datetime(2026, 5, 1, 10, 0, tzinfo=timezone.utc)
        end = start + timedelta(minutes=30)
        payload = {
            "resource_id": str(resource.id),
            "customer_email": "jin@example.com",
            "customer_name": "Jin",
            "start_time": iso(start),
            "end_time": iso(end),
            "idempotency_key": "abc-123",
        }
        r1 = client.post("/bookings", json=payload)
        r2 = client.post("/bookings", json=payload)
        assert r1.status_code == 201
        assert r2.status_code == 201
        assert r1.json()["id"] == r2.json()["id"]

    def test_unknown_resource_returns_404(self, client):
        resp = client.post("/bookings", json={
            "resource_id": str(uuid4()),
            "customer_email": "jin@example.com",
            "customer_name": "Jin",
            "start_time": iso(datetime(2026, 5, 1, 10, tzinfo=timezone.utc)),
            "end_time": iso(datetime(2026, 5, 1, 10, 30, tzinfo=timezone.utc)),
        })
        assert resp.status_code == 404

    def test_naive_datetime_rejected(self, client, resource):
        # Pydantic accepts naive datetimes by default; our handler rejects them
        resp = client.post("/bookings", json={
            "resource_id": str(resource.id),
            "customer_email": "jin@example.com",
            "customer_name": "Jin",
            "start_time": "2026-05-01T10:00:00",
            "end_time": "2026-05-01T10:30:00",
        })
        assert resp.status_code == 422


class TestCancelBooking:
    def test_cancel_existing_booking(self, client, resource):
        start = datetime(2026, 5, 1, 10, 0, tzinfo=timezone.utc)
        end = start + timedelta(minutes=30)
        r1 = client.post("/bookings", json={
            "resource_id": str(resource.id),
            "customer_email": "jin@example.com",
            "customer_name": "Jin",
            "start_time": iso(start),
            "end_time": iso(end),
        })
        booking_id = r1.json()["id"]

        r2 = client.post(f"/bookings/{booking_id}/cancel")
        assert r2.status_code == 200
        assert r2.json()["status"] == "cancelled"

    def test_cancel_is_idempotent(self, client, resource):
        start = datetime(2026, 5, 1, 10, 0, tzinfo=timezone.utc)
        end = start + timedelta(minutes=30)
        r1 = client.post("/bookings", json={
            "resource_id": str(resource.id),
            "customer_email": "jin@example.com",
            "customer_name": "Jin",
            "start_time": iso(start),
            "end_time": iso(end),
        })
        booking_id = r1.json()["id"]
        client.post(f"/bookings/{booking_id}/cancel")
        r2 = client.post(f"/bookings/{booking_id}/cancel")
        assert r2.status_code == 200  # still succeeds

    def test_cancel_frees_slot(self, client, resource):
        start = datetime(2026, 5, 1, 10, 0, tzinfo=timezone.utc)
        end = start + timedelta(minutes=30)
        payload = {
            "resource_id": str(resource.id),
            "customer_email": "jin@example.com",
            "customer_name": "Jin",
            "start_time": iso(start),
            "end_time": iso(end),
        }
        r1 = client.post("/bookings", json=payload)
        client.post(f"/bookings/{r1.json()['id']}/cancel")

        # Same slot should now be bookable
        r2 = client.post("/bookings", json=payload)
        assert r2.status_code == 201


class TestAvailability:
    def test_no_rules_returns_empty(self, client, resource):
        resp = client.get(
            f"/resources/{resource.id}/availability",
            params={"from": "2026-05-01", "to": "2026-05-01"},
        )
        assert resp.status_code == 200
        assert resp.json()["slots"] == []

    def test_generates_slots_from_rule(self, client, resource, session):
        # Add a Mon–Fri 9am–11am rule (UTC for simplicity in tests)
        for dow in range(5):
            session.add(models.AvailabilityRule(
                resource_id=resource.id,
                day_of_week=dow,
                start_time=time(9, 0),
                end_time=time(11, 0),
            ))
        session.flush()

        # 2026-05-01 is a Friday (dow=4)
        resp = client.get(
            f"/resources/{resource.id}/availability",
            params={"from": "2026-05-01", "to": "2026-05-01"},
        )
        slots = resp.json()["slots"]
        # 2 hours / 30 min = 4 slots
        assert len(slots) == 4

    def test_excludes_booked_slots(self, client, resource, session):
        session.add(models.AvailabilityRule(
            resource_id=resource.id,
            day_of_week=4,  # Friday
            start_time=time(9, 0),
            end_time=time(11, 0),
        ))
        session.flush()

        # Book 9:30-10:00
        client.post("/bookings", json={
            "resource_id": str(resource.id),
            "customer_email": "jin@example.com",
            "customer_name": "Jin",
            "start_time": iso(datetime(2026, 5, 1, 9, 30, tzinfo=timezone.utc)),
            "end_time": iso(datetime(2026, 5, 1, 10, 0, tzinfo=timezone.utc)),
        })

        resp = client.get(
            f"/resources/{resource.id}/availability",
            params={"from": "2026-05-01", "to": "2026-05-01"},
        )
        slots = resp.json()["slots"]
        assert len(slots) == 3  # 9:00, 10:00, 10:30 (9:30 is booked)

    def test_date_range_cap(self, client, resource):
        resp = client.get(
            f"/resources/{resource.id}/availability",
            params={"from": "2026-01-01", "to": "2026-12-31"},
        )
        assert resp.status_code == 400