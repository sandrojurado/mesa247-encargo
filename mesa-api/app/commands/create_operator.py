from __future__ import annotations

import argparse
import secrets
import string
import sys
from collections.abc import Callable, Sequence
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import Location, Operator
from app.models.queue import OperatorStatus

InputFunc = Callable[[str], str]
OutputFunc = Callable[[str], None]

PASSWORD_ALPHABET = (
    string.ascii_letters + string.digits + "!#$%&*+-=?@_"
)


@dataclass(frozen=True)
class OperatorCredentials:
    username: str
    password: str
    location_id: int
    location_name: str


class CommandError(Exception):
    """Raised when the operator command cannot complete."""


def generate_password(length: int = 16) -> str:
    if length < 12:
        raise CommandError("Password length must be at least 12 characters.")
    return "".join(secrets.choice(PASSWORD_ALPHABET) for _ in range(length))


def normalize_username(username: str) -> str:
    normalized = username.strip()
    if not normalized:
        raise CommandError("Username is required.")
    if len(normalized) > 50:
        raise CommandError("Username must be 50 characters or fewer.")
    return normalized


def find_location(
    db: Session,
    *,
    location_id: int | None = None,
    location_name: str | None = None,
) -> Location:
    if location_id is not None:
        location = db.get(Location, location_id)
        if location is None:
            raise CommandError(f"Location with id {location_id} was not found.")
        return location

    if location_name is not None:
        name = location_name.strip()
        location = db.scalar(select(Location).where(Location.name == name))
        if location is None:
            raise CommandError(f"Location named {name!r} was not found.")
        return location

    raise CommandError("A location must be selected.")


def prompt_for_location(
    db: Session,
    *,
    input_func: InputFunc = input,
    output_func: OutputFunc = print,
) -> Location:
    locations = db.scalars(select(Location).order_by(Location.name)).all()
    if not locations:
        raise CommandError("There are no locations available.")

    output_func("Available restaurants:")
    for location in locations:
        output_func(f"  {location.id}. {location.name}")

    while True:
        raw_location_id = input_func("Choose a restaurant by id: ").strip()
        try:
            location_id = int(raw_location_id)
        except ValueError:
            output_func("Please enter a numeric id.")
            continue

        for location in locations:
            if location.id == location_id:
                return location
        output_func("That restaurant id is not in the list.")


def create_operator(
    db: Session,
    *,
    username: str,
    location: Location,
    password_length: int = 16,
) -> OperatorCredentials:
    username = normalize_username(username)
    existing_operator = db.scalar(select(Operator).where(Operator.username == username))
    if existing_operator is not None:
        raise CommandError(f"Operator username {username!r} already exists.")

    password = generate_password(password_length)
    operator = Operator(
        username=username,
        password=password,
        location_id=location.id,
        status=OperatorStatus.ENABLED,
    )
    db.add(operator)
    db.commit()

    return OperatorCredentials(
        username=username,
        password=password,
        location_id=location.id,
        location_name=location.name,
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Create an operator account.")
    parser.add_argument(
        "--username",
        help="Operator username. If omitted, the command asks for it.",
    )
    parser.add_argument(
        "--location-id",
        type=int,
        help="Restaurant/location id for the operator.",
    )
    parser.add_argument(
        "--location-name",
        help="Restaurant/location name for the operator.",
    )
    parser.add_argument(
        "--password-length",
        type=int,
        default=16,
        help="Generated password length. Minimum: 12. Default: 16.",
    )
    return parser


def run(
    argv: Sequence[str] | None = None,
    *,
    input_func: InputFunc = input,
    output_func: OutputFunc = print,
) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.location_id is not None and args.location_name is not None:
        parser.error("Use either --location-id or --location-name, not both.")

    try:
        with SessionLocal() as db:
            username = args.username
            if username is None:
                username = input_func("Operator username: ")

            if args.location_id is None and args.location_name is None:
                location = prompt_for_location(
                    db,
                    input_func=input_func,
                    output_func=output_func,
                )
            else:
                location = find_location(
                    db,
                    location_id=args.location_id,
                    location_name=args.location_name,
                )

            credentials = create_operator(
                db,
                username=username,
                location=location,
                password_length=args.password_length,
            )
    except CommandError as exc:
        output_func(f"Error: {exc}")
        return 1

    output_func("Operator created.")
    output_func(f"Username: {credentials.username}")
    output_func(f"Password: {credentials.password}")
    output_func(
        f"Restaurant: {credentials.location_name} (id: {credentials.location_id})"
    )
    return 0


def main() -> None:
    raise SystemExit(run(sys.argv[1:]))


if __name__ == "__main__":
    main()
