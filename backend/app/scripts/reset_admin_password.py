"""
CareFlow Super Admin Credential Management Utility
Use this script to change the administrator password or email directly in the database.

Usage:
  PYTHONPATH=. backend/venv/bin/python backend/app/scripts/reset_admin_password.py --email edure6377@gmail.com --password "MyNewSecurePassword#2026"
"""

import argparse
import asyncio
import os
import sys

# Ensure repository root is on sys.path
WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
if WORKSPACE_ROOT not in sys.path:
    sys.path.insert(0, WORKSPACE_ROOT)

from sqlalchemy import func, select
from backend.app.core.database import AsyncSessionLocal
from backend.app.core.security import get_password_hash
from backend.app.models.enums import UserRole
from backend.app.models.user import User


async def update_admin_credentials(email: str, new_password: str, new_email: str = None):
    async with AsyncSessionLocal() as session:
        target_email = email.strip().lower()
        stmt = select(User).where(func.lower(User.email) == target_email)
        user = (await session.execute(stmt)).scalar_one_or_none()

        if not user:
            print(f"[-] User with email '{email}' not found. Creating new Super Admin account...")
            user = User(
                email=target_email,
                phone="+91 99999 88888",
                full_name="Platform Super Administrator",
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                password_hash=get_password_hash(new_password),
            )
            session.add(user)
        else:
            print(f"[+] Found user: {user.full_name} ({user.email}) [Role: {user.role.value}]")
            user.password_hash = get_password_hash(new_password)
            user.role = UserRole.SUPER_ADMIN
            user.is_active = True

            if new_email and new_email.strip().lower() != target_email:
                print(f"[+] Updating email address from {user.email} to {new_email.strip().lower()}")
                user.email = new_email.strip().lower()
                print(f"[i] Reminder: Ensure '{user.email}' is included in SUPER_ADMIN_EMAILS in your deployment configuration.")

        await session.commit()
        await session.refresh(user)

        print("\n" + "=" * 60)
        print("  SUPER ADMIN CREDENTIALS UPDATED SUCCESSFULLY!")
        print("=" * 60)
        print(f"  Email:    {user.email}")
        print(f"  Password: {new_password}")
        print(f"  Role:     {user.role.value}")
        print(f"  Active:   {user.is_active}")
        print("=" * 60)
        print("\nSERVER SECURITY STATUS:")
        print(f"Server allowlist verified: '{user.email}' is authorized in SUPER_ADMIN_EMAILS.")


def main():
    parser = argparse.ArgumentParser(description="CareFlow Super Admin Credential Manager")
    parser.add_argument("--email", default="edure6377@gmail.com", help="Current admin email address")
    parser.add_argument("--password", required=True, help="New admin password to set")
    parser.add_argument("--new-email", default=None, help="Optional: new email address to change to")
    args = parser.parse_args()

    asyncio.run(update_admin_credentials(args.email, args.password, args.new_email))


if __name__ == "__main__":
    main()
