#!/usr/bin/env python3
"""CLI helper for iVote backend administration."""

import argparse
import sys

from app.db.database import SessionLocal
from app.db.models import User, UserRole
from app.core.security import hash_password


def cmd_create_admin(args: argparse.Namespace) -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == args.email).first()
        if existing:
            print(f"Error: A user with email '{args.email}' already exists.")
            sys.exit(1)

        admin = User(
            email=args.email,
            full_name=args.name,
            password_hash=hash_password(args.password),
            tu_registration_number=args.tu or f"ADMIN-{args.email.split('@')[0]}",
            faculty=args.faculty or "Administration",
            year=1,
            role=UserRole.ELECTION_HEAD,
            is_verified=True,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"Admin created successfully!")
        print(f"  Email:    {args.email}")
        print(f"  Password: {args.password}")
        print(f"  Name:     {args.name}")
    finally:
        db.close()


def cmd_list_admins(args: argparse.Namespace) -> None:
    db = SessionLocal()
    try:
        admins = db.query(User).filter(User.role == UserRole.ELECTION_HEAD).all()
        if not admins:
            print("No admin users found.")
            return
        print(f"{'ID':<5} {'Email':<30} {'Name':<25} {'Active':<8}")
        print("-" * 70)
        for a in admins:
            print(f"{a.id:<5} {a.email:<30} {a.full_name:<25} {str(a.is_active):<8}")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="iVote backend management CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    p_create = sub.add_parser("create-admin", help="Create an admin (election_head) user")
    p_create.add_argument("--email", required=True, help="Admin email address")
    p_create.add_argument("--password", required=True, help="Admin password")
    p_create.add_argument("--name", required=True, help="Admin full name")
    p_create.add_argument("--tu", help="TU registration number (optional)")
    p_create.add_argument("--faculty", help="Faculty (default: Administration)")

    p_list = sub.add_parser("list-admins", help="List all admin users")

    args = parser.parse_args()

    if args.command == "create-admin":
        cmd_create_admin(args)
    elif args.command == "list-admins":
        cmd_list_admins(args)


if __name__ == "__main__":
    main()
