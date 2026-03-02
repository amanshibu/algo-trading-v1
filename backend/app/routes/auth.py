from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
import hashlib
import secrets

router = APIRouter(prefix="/auth", tags=["auth"])

# ---- In-memory user store ----
# { email: { id, email, name, password_hash, salt, balance } }
USERS: dict[str, dict] = {}
TOKENS: dict[str, str] = {}  # { token: email }
_next_id = 1


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((salt + password).encode()).hexdigest()


# ---- Auth helpers (defined BEFORE routes so Depends() can reference them) ----

def get_current_user(authorization: str = Header(None)):
    """Require a valid Bearer token. Raises 401 if missing or invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    email = TOKENS.get(token)
    if not email or email not in USERS:
        raise HTTPException(status_code=401, detail="Invalid token")
    return USERS[email]


def get_optional_user(authorization: str = Header(None)):
    """Return the authenticated user, or fall back to a demo user."""
    if not authorization or not authorization.startswith("Bearer "):
        return {"email": "demo@algotrader.local", "name": "Demo User"}
    token = authorization.split(" ")[1]
    email = TOKENS.get(token)
    if not email or email not in USERS:
        return {"email": "demo@algotrader.local", "name": "Demo User"}
    return USERS[email]


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


class WithdrawRequest(BaseModel):
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
    token = f"token-{user['id']}-{secrets.token_hex(8)}"
    TOKENS[token] = data.email

    return {
        "token": token,
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
    token = f"token-{user['id']}-{secrets.token_hex(8)}"
    TOKENS[token] = data.email

    return {
        "token": token,
        "user": safe_user,
    }


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    """Returns the authenticated user's profile."""
    return {k: v for k, v in user.items() if k not in ("password_hash", "salt")}


@router.post("/add-funds")
def add_funds(data: AddFundsRequest, user: dict = Depends(get_current_user)):
    """Add virtual funds to the authenticated user's balance."""
    user["balance"] += data.amount
    return {
        "balance": user["balance"],
        "mode": "SIMULATED",
    }


@router.post("/withdraw")
def withdraw(data: WithdrawRequest, user: dict = Depends(get_current_user)):
    """Withdraw from the authenticated user's balance."""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if user["balance"] < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")

    user["balance"] -= data.amount
    return {
        "balance": user["balance"],
        "mode": "SIMULATED",
    }
