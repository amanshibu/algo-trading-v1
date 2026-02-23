from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import hashlib
import secrets

router = APIRouter(prefix="/auth", tags=["auth"])

# ---- In-memory user store ----
# { email: { id, email, name, password_hash, salt, balance } }
USERS: dict[str, dict] = {}
_next_id = 1


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((salt + password).encode()).hexdigest()


# ---- Schemas ----
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AddFundsRequest(BaseModel):
    amount: float


# ---- Routes ----
@router.post("/register")
def register(data: RegisterRequest):
    global _next_id

    if data.email in USERS:
        raise HTTPException(status_code=400, detail="Email already registered")

    if len(data.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    salt = secrets.token_hex(16)
    password_hash = _hash_password(data.password, salt)

    user = {
        "id": _next_id,
        "email": data.email,
        "name": data.name.strip(),
        "password_hash": password_hash,
        "salt": salt,
        "balance": 0.0,
    }
    USERS[data.email] = user
    _next_id += 1

    # Return token + user (auto-login after register)
    safe_user = {k: v for k, v in user.items() if k not in ("password_hash", "salt")}
    return {
        "token": f"token-{user['id']}-{secrets.token_hex(8)}",
        "user": safe_user,
    }


@router.post("/login")
def login(data: LoginRequest):
    user = USERS.get(data.email)
    if not user:
        raise HTTPException(status_code=401, detail="No account found with this email")

    if _hash_password(data.password, user["salt"]) != user["password_hash"]:
        raise HTTPException(status_code=401, detail="Incorrect password")

    safe_user = {k: v for k, v in user.items() if k not in ("password_hash", "salt")}
    return {
        "token": f"token-{user['id']}-{secrets.token_hex(8)}",
        "user": safe_user,
    }


@router.get("/me")
def me():
    # In a real app this would read the token header
    # For now return first user or empty
    if USERS:
        first = next(iter(USERS.values()))
        return {k: v for k, v in first.items() if k not in ("password_hash", "salt")}
    raise HTTPException(status_code=401, detail="Not authenticated")


@router.post("/add-funds")
def add_funds(data: AddFundsRequest):
    if not USERS:
        raise HTTPException(status_code=401, detail="Not authenticated")
    first = next(iter(USERS.values()))
    first["balance"] += data.amount
    return {
        "balance": first["balance"],
        "mode": "SIMULATED",
    }


class WithdrawRequest(BaseModel):
    amount: float


@router.post("/withdraw")
def withdraw(data: WithdrawRequest):
    if not USERS:
        raise HTTPException(status_code=401, detail="Not authenticated")
    first = next(iter(USERS.values()))
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if first["balance"] < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")

    first["balance"] -= data.amount
    return {
        "balance": first["balance"],
        "mode": "SIMULATED",
    }

