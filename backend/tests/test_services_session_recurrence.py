"""Tests for recurrence functionality in app.services.session."""
import os
os.environ.setdefault("JWT_SECRET", "test-secret-key")
os.environ.setdefault("MAIL_USERNAME", "test@example.com")
os.environ.setdefault("MAIL_PASSWORD", "testpassword")
os.environ.setdefault("MAIL_FROM", "test@example.com")
os.environ.setdefault("MAIL_SERVER", "smtp.example.com")

import pytest
from datetime import datetime, timezone, timedelta

from app.services.session import (
    expand_rule_dates,
    creater_session,
    delete_session,
    delete_session_and_following,
    list_sessions,
)
from app.models.models import Session, SessionRule
from sqlalchemy import select


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _dt(year=2030, month=1, day=1, hour=9, minute=0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=timezone.utc)


def _session_start(year=2030, month=1, day=1) -> datetime:
    return _dt(year, month, day, 9, 0)


def _session_end(year=2030, month=1, day=1) -> datetime:
    return _dt(year, month, day, 10, 0)


# ---------------------------------------------------------------------------
# expand_rule_dates — unit tests (no DB needed)
# ---------------------------------------------------------------------------

class TestExpandRuleDates:
    def test_daily_count(self):
        start = _dt(2030, 1, 1, 9)
        end = _dt(2030, 1, 1, 10)
        pairs = expand_rule_dates(start, end, frequency="daily", interval=1, count=3)
        assert len(pairs) == 3
        assert pairs[0] == (start, end)
        assert pairs[1][0] == _dt(2030, 1, 2, 9)
        assert pairs[2][0] == _dt(2030, 1, 3, 9)

    def test_daily_interval_2(self):
        start = _dt(2030, 1, 1, 9)
        end = _dt(2030, 1, 1, 10)
        pairs = expand_rule_dates(start, end, frequency="daily", interval=2, count=3)
        assert pairs[1][0] == _dt(2030, 1, 3, 9)
        assert pairs[2][0] == _dt(2030, 1, 5, 9)

    def test_weekly_count(self):
        start = _dt(2030, 1, 7, 9)
        end = _dt(2030, 1, 7, 10)
        pairs = expand_rule_dates(start, end, frequency="weekly", interval=1, count=4)
        assert len(pairs) == 4
        assert pairs[1][0] == _dt(2030, 1, 14, 9)
        assert pairs[3][0] == _dt(2030, 1, 28, 9)

    def test_biweekly(self):
        start = _dt(2030, 1, 1, 9)
        end = _dt(2030, 1, 1, 10)
        pairs = expand_rule_dates(start, end, frequency="weekly", interval=2, count=3)
        assert pairs[1][0] == _dt(2030, 1, 15, 9)
        assert pairs[2][0] == _dt(2030, 1, 29, 9)

    def test_monthly_count(self):
        start = _dt(2030, 1, 31, 9)
        end = _dt(2030, 1, 31, 10)
        pairs = expand_rule_dates(start, end, frequency="monthly", interval=1, count=3)
        # Feb 31 clamps to Feb 28 (2030 is not a leap year)
        assert pairs[1][0].month == 2
        assert pairs[1][0].day == 28
        # Subsequent months are computed from the clamped value (Feb 28 → Mar 28)
        assert pairs[2][0].month == 3
        assert pairs[2][0].day == 28

    def test_yearly_count(self):
        start = _dt(2030, 3, 15, 9)
        end = _dt(2030, 3, 15, 10)
        pairs = expand_rule_dates(start, end, frequency="yearly", interval=1, count=3)
        assert pairs[1][0].year == 2031
        assert pairs[2][0].year == 2032

    def test_until_bound(self):
        start = _dt(2030, 1, 1, 9)
        end = _dt(2030, 1, 1, 10)
        until = _dt(2030, 1, 10)
        pairs = expand_rule_dates(start, end, frequency="daily", interval=1, until=until)
        # days 1–10 inclusive = 10 occurrences
        assert len(pairs) == 10
        assert pairs[-1][0] == _dt(2030, 1, 10, 9)

    def test_count_cap_at_365(self):
        start = _dt(2030, 1, 1, 9)
        end = _dt(2030, 1, 1, 10)
        pairs = expand_rule_dates(start, end, frequency="daily", interval=1, count=500)
        assert len(pairs) == 365

    def test_duration_preserved(self):
        start = _dt(2030, 1, 1, 9)
        end = _dt(2030, 1, 1, 11, 30)
        duration = end - start
        pairs = expand_rule_dates(start, end, frequency="weekly", interval=1, count=3)
        for s, e in pairs:
            assert (e - s) == duration

    def test_invalid_frequency_raises(self):
        with pytest.raises(ValueError, match="invalid_frequency"):
            expand_rule_dates(_dt(), _dt(hour=10), frequency="hourly", interval=1, count=1)

    def test_invalid_interval_raises(self):
        with pytest.raises(ValueError, match="invalid_interval"):
            expand_rule_dates(_dt(), _dt(hour=10), frequency="daily", interval=0, count=1)

    def test_missing_count_and_until_raises(self):
        with pytest.raises(ValueError, match="count_or_until_required"):
            expand_rule_dates(_dt(), _dt(hour=10), frequency="daily", interval=1)

    def test_count_one_returns_single_occurrence(self):
        start = _dt(2030, 6, 1, 9)
        end = _dt(2030, 6, 1, 10)
        pairs = expand_rule_dates(start, end, frequency="weekly", interval=1, count=1)
        assert pairs == [(start, end)]


# ---------------------------------------------------------------------------
# creater_session with recurrence — integration tests (DB)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_recurrence_creates_multiple_sessions(db):
    start = _session_start(2030, 2, 1)
    end = _session_end(2030, 2, 1)
    first = await creater_session(
        db,
        method_id=None,
        start_time=start,
        end_time=end,
        capacity=5,
        instructor=None,
        recurrence={"frequency": "weekly", "interval": 1, "count": 4},
    )
    assert first.rule_id is not None
    assert first.rule_index == 0

    # All 4 sessions should exist in the DB
    result = await db.execute(select(Session).where(Session.rule_id == first.rule_id))
    sessions = result.scalars().all()
    assert len(sessions) == 4


@pytest.mark.asyncio
async def test_recurrence_rule_record_created(db):
    start = _session_start(2030, 3, 1)
    end = _session_end(2030, 3, 1)
    first = await creater_session(
        db,
        method_id=None,
        start_time=start,
        end_time=end,
        capacity=1,
        instructor=None,
        recurrence={"frequency": "daily", "interval": 1, "count": 3},
    )
    rule = await db.get(SessionRule, first.rule_id)
    assert rule is not None
    assert rule.frequency == "daily"
    assert rule.interval == 1
    assert rule.count == 3


@pytest.mark.asyncio
async def test_recurrence_sessions_have_correct_rule_indexes(db):
    start = _session_start(2030, 4, 1)
    end = _session_end(2030, 4, 1)
    first = await creater_session(
        db,
        method_id=None,
        start_time=start,
        end_time=end,
        capacity=1,
        instructor=None,
        recurrence={"frequency": "weekly", "interval": 1, "count": 3},
    )
    result = await db.execute(
        select(Session)
        .where(Session.rule_id == first.rule_id)
        .order_by(Session.rule_index)
    )
    sessions = result.scalars().all()
    indexes = [s.rule_index for s in sessions]
    assert indexes == [0, 1, 2]


@pytest.mark.asyncio
async def test_recurrence_sessions_have_correct_start_times(db):
    start = _session_start(2030, 5, 1)  # Wednesday
    end = _session_end(2030, 5, 1)
    first = await creater_session(
        db,
        method_id=None,
        start_time=start,
        end_time=end,
        capacity=1,
        instructor=None,
        recurrence={"frequency": "weekly", "interval": 1, "count": 3},
    )
    result = await db.execute(
        select(Session)
        .where(Session.rule_id == first.rule_id)
        .order_by(Session.rule_index)
    )
    sessions = result.scalars().all()
    expected_starts = [
        _dt(2030, 5, 1, 9),
        _dt(2030, 5, 8, 9),
        _dt(2030, 5, 15, 9),
    ]
    for s, expected in zip(sessions, expected_starts):
        assert s.start_time.replace(tzinfo=timezone.utc) == expected


@pytest.mark.asyncio
async def test_recurrence_no_rule_without_recurrence_param(db):
    start = _session_start(2030, 6, 1)
    end = _session_end(2030, 6, 1)
    session = await creater_session(
        db, method_id=None, start_time=start, end_time=end, capacity=1, instructor=None
    )
    assert session.rule_id is None
    assert session.rule_index is None


# ---------------------------------------------------------------------------
# delete_session_and_following
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_following_from_first(db):
    """Delete the first session in a series: all 4 should be removed."""
    start = _session_start(2030, 7, 1)
    end = _session_end(2030, 7, 1)
    first = await creater_session(
        db,
        method_id=None,
        start_time=start,
        end_time=end,
        capacity=1,
        instructor=None,
        recurrence={"frequency": "daily", "interval": 1, "count": 4},
    )
    deleted = await delete_session_and_following(db, first.id)
    assert deleted == 4

    result = await db.execute(select(Session).where(Session.rule_id == first.rule_id))
    remaining = result.scalars().all()
    assert len(remaining) == 0


@pytest.mark.asyncio
async def test_delete_following_from_middle(db):
    """Delete the 3rd session of 5: sessions at index 2, 3, 4 removed; 0 and 1 remain."""
    start = _session_start(2030, 8, 1)
    end = _session_end(2030, 8, 1)
    first = await creater_session(
        db,
        method_id=None,
        start_time=start,
        end_time=end,
        capacity=1,
        instructor=None,
        recurrence={"frequency": "daily", "interval": 1, "count": 5},
    )
    result = await db.execute(
        select(Session)
        .where(Session.rule_id == first.rule_id)
        .order_by(Session.rule_index)
    )
    sessions = result.scalars().all()
    third = sessions[2]

    deleted = await delete_session_and_following(db, third.id)
    assert deleted == 3

    result = await db.execute(
        select(Session)
        .where(Session.rule_id == first.rule_id)
        .order_by(Session.rule_index)
    )
    remaining = result.scalars().all()
    assert len(remaining) == 2
    assert [s.rule_index for s in remaining] == [0, 1]


@pytest.mark.asyncio
async def test_delete_following_from_last(db):
    """Deleting the last session removes exactly one and leaves the rest."""
    start = _session_start(2030, 9, 1)
    end = _session_end(2030, 9, 1)
    first = await creater_session(
        db,
        method_id=None,
        start_time=start,
        end_time=end,
        capacity=1,
        instructor=None,
        recurrence={"frequency": "daily", "interval": 1, "count": 4},
    )
    result = await db.execute(
        select(Session)
        .where(Session.rule_id == first.rule_id)
        .order_by(Session.rule_index)
    )
    sessions = result.scalars().all()
    last = sessions[-1]

    deleted = await delete_session_and_following(db, last.id)
    assert deleted == 1

    result = await db.execute(
        select(Session)
        .where(Session.rule_id == first.rule_id)
        .order_by(Session.rule_index)
    )
    remaining = result.scalars().all()
    assert len(remaining) == 3


@pytest.mark.asyncio
async def test_delete_following_cleans_up_rule_when_all_gone(db):
    """When all sessions are deleted, the SessionRule row should also be removed."""
    start = _session_start(2030, 10, 1)
    end = _session_end(2030, 10, 1)
    first = await creater_session(
        db,
        method_id=None,
        start_time=start,
        end_time=end,
        capacity=1,
        instructor=None,
        recurrence={"frequency": "daily", "interval": 1, "count": 2},
    )
    rule_id = first.rule_id
    await delete_session_and_following(db, first.id)

    rule = await db.get(SessionRule, rule_id)
    assert rule is None


@pytest.mark.asyncio
async def test_delete_following_keeps_rule_when_siblings_remain(db):
    """If some sessions remain, the SessionRule row should be kept."""
    start = _session_start(2030, 11, 1)
    end = _session_end(2030, 11, 1)
    first = await creater_session(
        db,
        method_id=None,
        start_time=start,
        end_time=end,
        capacity=1,
        instructor=None,
        recurrence={"frequency": "daily", "interval": 1, "count": 3},
    )
    result = await db.execute(
        select(Session)
        .where(Session.rule_id == first.rule_id)
        .order_by(Session.rule_index)
    )
    sessions = result.scalars().all()
    last = sessions[-1]

    await delete_session_and_following(db, last.id)
    rule = await db.get(SessionRule, first.rule_id)
    assert rule is not None


@pytest.mark.asyncio
async def test_delete_following_nonexistent_returns_zero(db):
    import uuid
    deleted = await delete_session_and_following(db, uuid.uuid4())
    assert deleted == 0


@pytest.mark.asyncio
async def test_delete_following_on_non_recurring_session(db):
    """delete_session_and_following on a standalone session should delete exactly 1."""
    start = _session_start(2030, 12, 1)
    end = _session_end(2030, 12, 1)
    session = await creater_session(
        db, method_id=None, start_time=start, end_time=end, capacity=1, instructor=None
    )
    deleted = await delete_session_and_following(db, session.id)
    assert deleted == 1

    result = await db.execute(select(Session).where(Session.id == session.id))
    assert result.scalar_one_or_none() is None


# ---------------------------------------------------------------------------
# list_sessions still works after adding rule_id / rule_index columns
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_sessions_includes_recurring_sessions(db):
    start = _session_start(2030, 1, 1)
    end = _session_end(2030, 1, 1)
    await creater_session(
        db,
        method_id=None,
        start_time=start,
        end_time=end,
        capacity=5,
        instructor=None,
        recurrence={"frequency": "weekly", "interval": 1, "count": 3},
    )
    rows = await list_sessions(db)
    assert len(rows) == 3
    # Spots remaining should be capacity (no bookings)
    for _, spots in rows:
        assert spots == 5
