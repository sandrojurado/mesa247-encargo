from app.db.base import Base
from app.models import Admin, Customer, Location, Operator, QueueEntry


def test_queue_models_register_expected_tables() -> None:
    assert sorted(Base.metadata.tables) == [
        "admins",
        "customers",
        "locations",
        "operators",
        "queue",
    ]
    assert Admin.__tablename__ == "admins"
    assert Customer.__tablename__ == "customers"
    assert Location.__tablename__ == "locations"
    assert Operator.__tablename__ == "operators"
    assert QueueEntry.__tablename__ == "queue"
