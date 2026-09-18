import pytest

from app.commands.create_operator import (
    CommandError,
    generate_password,
    normalize_username,
)


def test_generate_password_uses_requested_length() -> None:
    password = generate_password(20)

    assert len(password) == 20


def test_generate_password_requires_minimum_length() -> None:
    with pytest.raises(CommandError, match="at least 12"):
        generate_password(8)


def test_normalize_username_strips_whitespace() -> None:
    assert normalize_username("  host@example.com  ") == "host@example.com"


def test_normalize_username_requires_value() -> None:
    with pytest.raises(CommandError, match="Username is required"):
        normalize_username("   ")
