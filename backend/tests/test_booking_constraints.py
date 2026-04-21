from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy.exc import IntegrityError
from psycopg.types.range import TimestamptzRange
from app.booking import models


def make_range(start: datetime, end: datetime) -> TimestamptzRange:
    """Build a half-open tstzrange [start, end) — end exclusive."""
    return TimestamptzRange(start, end, bounds="[)")


def utc(y, m, d, h, mi=0):
    return datetime(y, m, d, h, mi, tzinfo=timezone.utc)


def make_booking(resource, start, end, status="confirmed", email="jin@example.com"):
    return models.Booking(
        resource_id=resource.id,
        customer_email=email,
        customer_name="Jin",
        time_range=make_range(start, end),
        status=status,
    )


class TestNoOverlapConstraint:
    def test_non_overlapping_bookings_succeed(self, session, resource):
        """Two bookings on the same resource at different times should both succeed."""
        b1 = make_booking(resource, utc(2026, 5, 1, 10), utc(2026, 5, 1, 10, 30))
        b2 = make_booking(resource, utc(2026, 5, 1, 11), utc(2026, 5, 1, 11, 30))
        session.add_all([b1, b2])
        session.flush()  # no error = passed

    def test_adjacent_bookings_succeed(self, session, resource):
        """Back-to-back bookings (10:00-10:30 then 10:30-11:00) should not conflict
        because time_range uses half-open [) bounds."""
        b1 = make_booking(resource, utc(2026, 5, 1, 10), utc(2026, 5, 1, 10, 30))
        b2 = make_booking(resource, utc(2026, 5, 1, 10, 30), utc(2026, 5, 1, 11))
        session.add_all([b1, b2])
        session.flush()

    def test_overlapping_bookings_rejected(self, session, resource):
        """Overlapping bookings on the same resource should raise IntegrityError."""
        b1 = make_booking(resource, utc(2026, 5, 1, 10), utc(2026, 5, 1, 10, 30))
        session.add(b1)
        session.flush()

        b2 = make_booking(resource, utc(2026, 5, 1, 10, 15), utc(2026, 5, 1, 10, 45))
        session.add(b2)

        with pytest.raises(IntegrityError) as exc_info:
            session.flush()
        assert "bookings_no_overlap" in str(exc_info.value)

    def test_fully_contained_booking_rejected(self, session, resource):
        """A shorter booking entirely inside an existing one should be rejected."""
        b1 = make_booking(resource, utc(2026, 5, 1, 10), utc(2026, 5, 1, 11))
        session.add(b1)
        session.flush()

        b2 = make_booking(resource, utc(2026, 5, 1, 10, 15), utc(2026, 5, 1, 10, 30))
        session.add(b2)

        with pytest.raises(IntegrityError):
            session.flush()

    def test_identical_bookings_rejected(self, session, resource):
        """Two bookings with the exact same time range should conflict."""
        start, end = utc(2026, 5, 1, 10), utc(2026, 5, 1, 10, 30)
        session.add(make_booking(resource, start, end))
        session.flush()

        session.add(make_booking(resource, start, end, email="other@example.com"))
        with pytest.raises(IntegrityError):
            session.flush()

    def test_different_resources_can_have_overlapping_bookings(self, session, resource):
        """Overlap on DIFFERENT resources is fine — the constraint is per-resource."""
        other = models.Resource(name="Room B", capacity=1, duration_minutes=30)
        session.add(other)
        session.flush()

        start, end = utc(2026, 5, 1, 10), utc(2026, 5, 1, 10, 30)
        b1 = make_booking(resource, start, end)
        b2 = models.Booking(
            resource_id=other.id,
            customer_email="other@example.com",
            customer_name="Other",
            time_range=make_range(start, end),
            status="confirmed",
        )
        session.add_all([b1, b2])
        session.flush()

    def test_cancelled_booking_does_not_block_new_booking(self, session, resource):
        """Cancelled bookings are excluded from the constraint's WHERE clause."""
        b1 = make_booking(resource, utc(2026, 5, 1, 10), utc(2026, 5, 1, 10, 30))
        session.add(b1)
        session.flush()

        b1.status = "cancelled"
        session.flush()

        # Now the slot should be free
        b2 = make_booking(resource, utc(2026, 5, 1, 10), utc(2026, 5, 1, 10, 30),
                          email="other@example.com")
        session.add(b2)
        session.flush()

    def test_completed_booking_does_not_block(self, session, resource):
        """Completed bookings (past events) also shouldn't block — only pending/confirmed do."""
        b1 = make_booking(resource, utc(2026, 5, 1, 10), utc(2026, 5, 1, 10, 30),
                          status="completed")
        session.add(b1)
        session.flush()

        b2 = make_booking(resource, utc(2026, 5, 1, 10), utc(2026, 5, 1, 10, 30),
                          email="other@example.com")
        session.add(b2)
        session.flush()

    def test_pending_booking_blocks_new_booking(self, session, resource):
        """Pending (held) bookings must block new ones — that's the whole point of holds."""
        b1 = make_booking(resource, utc(2026, 5, 1, 10), utc(2026, 5, 1, 10, 30),
                          status="pending")
        session.add(b1)
        session.flush()

        b2 = make_booking(resource, utc(2026, 5, 1, 10), utc(2026, 5, 1, 10, 30),
                          email="other@example.com")
        session.add(b2)
        with pytest.raises(IntegrityError):
            session.flush()


class TestCheckConstraints:
    def test_invalid_status_rejected(self, session, resource):
        b = make_booking(resource, utc(2026, 5, 1, 10), utc(2026, 5, 1, 10, 30),
                         status="bogus")
        session.add(b)
        with pytest.raises(IntegrityError) as exc_info:
            session.flush()
        assert "bookings_valid_status" in str(exc_info.value)

    def test_resource_capacity_must_be_positive(self, session):
        r = models.Resource(name="Bad", capacity=0, duration_minutes=30)
        session.add(r)
        with pytest.raises(IntegrityError):
            session.flush()

    def test_resource_duration_must_be_positive(self, session):
        r = models.Resource(name="Bad", capacity=1, duration_minutes=0)
        session.add(r)
        with pytest.raises(IntegrityError):
            session.flush()

    def test_availability_rule_end_after_start(self, session, resource):
        from datetime import time
        rule = models.AvailabilityRule(
            resource_id=resource.id,
            day_of_week=0,
            start_time=time(17, 0),
            end_time=time(9, 0),  # invalid: end before start
        )
        session.add(rule)
        with pytest.raises(IntegrityError):
            session.flush()

    def test_availability_rule_valid_day_of_week(self, session, resource):
        from datetime import time
        rule = models.AvailabilityRule(
            resource_id=resource.id,
            day_of_week=7,  # invalid: only 0-6 allowed
            start_time=time(9, 0),
            end_time=time(17, 0),
        )
        session.add(rule)
        with pytest.raises(IntegrityError):
            session.flush()