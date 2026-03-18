from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import hashlib
import secrets

from app.database.db import get_db
from app.database import crud

router = APIRouter(prefix="/auth", tags=["auth"])


# ============================================================
# Password helpers
# ============================================================

def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((salt + password).encode()).hexdigest()


# ============================================================
# Auth dependency helpers (used by other routers via Depends)
# ============================================================

def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Require a valid Bearer token. Raises 401 if missing or invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    user = crud.get_user_by_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


def get_optional_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Return the authenticated user, or a demo user dict if not authenticated."""
    if not authorization or not authorization.startswith("Bearer "):
        return {"email": "demo@algotrader.local", "name": "Demo User"}
    token = authorization.split(" ")[1]
    user = crud.get_user_by_token(db, token)
    if not user:
        return {"email": "demo@algotrader.local", "name": "Demo User"}
    return user


def _safe(user) -> dict:
    """Return a user dict safe to send to the client (no password fields)."""
    if isinstance(user, dict):
        return user
    return {
        "id":      user.id,
        "email":   user.email,
        "name":    user.name,
        "balance": user.balance,
    }


# ============================================================
# Schemas
# ============================================================

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AddFundsRequest(BaseModel):
    amount: float


class WithdrawRequest(BaseModel):
    amount: float


# ============================================================
# Routes
# ============================================================

@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(data.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    salt = secrets.token_hex(16)
    password_hash = _hash_password(data.password, salt)

    user = crud.create_user(db, data.name.strip(), data.email, password_hash, salt)
    token = crud.create_token(db, user)

    return {"token": token, "user": _safe(user)}


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, data.email)
    if not user:
        raise HTTPException(status_code=401, detail="No account found with this email")
    if _hash_password(data.password, user.salt) != user.password_hash:
        raise HTTPException(status_code=401, detail="Incorrect password")

    token = crud.create_token(db, user)
    return {"token": token, "user": _safe(user)}


@router.get("/me")
def me(user=Depends(get_current_user)):
    return _safe(user)


@router.post("/add-funds")
def add_funds(data: AddFundsRequest, user=Depends(get_current_user),
              db: Session = Depends(get_db)):
    """Add virtual funds to the authenticated user's balance."""
    new_balance = user.balance + data.amount
    crud.update_user_balance(db, user, new_balance)

    # Also top up the paper portfolio cash
    from app.database.crud import get_or_create_portfolio, update_portfolio_balance
    pf = get_or_create_portfolio(db, user.email)
    update_portfolio_balance(db, pf, pf.balance + data.amount)

    return {"balance": new_balance, "mode": "SIMULATED"}


@router.post("/withdraw")
def withdraw(data: WithdrawRequest, user=Depends(get_current_user),
             db: Session = Depends(get_db)):
    """Withdraw from the authenticated user's balance."""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if user.balance < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")

    new_balance = user.balance - data.amount
    crud.update_user_balance(db, user, new_balance)

    # Deduct from paper portfolio too
    from app.database.crud import get_or_create_portfolio, update_portfolio_balance
    pf = get_or_create_portfolio(db, user.email)
    new_pf_balance = max(0.0, pf.balance - data.amount)
    update_portfolio_balance(db, pf, new_pf_balance)

    return {"balance": new_balance, "mode": "SIMULATED"}
