"""FastAPI service for /v1/quantum/*."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError

SEGMENT = "quantum"
SERVICE = "quantum-api"

app = FastAPI(title=SERVICE, version="0.0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _load_env() -> None:
    from dotenv import load_dotenv

    root = Path.cwd()
    for _ in range(24):
        if (root / "nx.json").exists():
            load_dotenv(root / ".env", override=False)
            load_dotenv(
                root / "apps/services/quantum-api/.env.development",
                override=True,
            )
            return
        if root.parent == root:
            break
        root = root.parent


_load_env()


def _normalize_audience(raw: str | None) -> str | None:
    if not raw or not raw.strip():
        return None
    return raw.strip().rstrip("/")


def _issuer() -> str | None:
    override = os.environ.get("AUTH0_ISSUER", "").strip()
    if override:
        return override if override.endswith("/") else f"{override}/"
    domain = os.environ.get("AUTH0_DOMAIN", "").strip()
    if not domain:
        return None
    host = domain.replace("https://", "").replace("http://", "").rstrip("/")
    return f"https://{host}/"


def _auth_configured() -> bool:
    if os.environ.get("AUTH0_VERIFY_DISABLED") == "true":
        return True
    return bool(
        os.environ.get("AUTH0_DOMAIN", "").strip()
        and _normalize_audience(os.environ.get("AUTH0_AUDIENCE"))
    )


def _verify_disabled() -> bool:
    return os.environ.get("AUTH0_VERIFY_DISABLED") == "true"


async def require_principal(request: Request) -> dict[str, str]:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail={
                "error": "missing_token",
                "message": "Authorization: Bearer <access_token> is required.",
            },
        )
    token = auth[7:].strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "missing_token",
                "message": "Bearer token is empty.",
            },
        )

    if _verify_disabled():
        try:
            claims = jwt.get_unverified_claims(token)
        except JWTError as e:
            raise HTTPException(
                status_code=401,
                detail={"error": "invalid_token", "message": str(e)},
            ) from e
        sub = str(claims.get("sub", "unknown"))
        return {"sub": sub}

    domain = os.environ.get("AUTH0_DOMAIN", "").strip()
    audience = _normalize_audience(os.environ.get("AUTH0_AUDIENCE"))
    issuer = _issuer()
    if not domain or not audience or not issuer:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "auth_not_configured",
                "message": (
                    "Set AUTH0_DOMAIN and AUTH0_AUDIENCE, or "
                    "AUTH0_VERIFY_DISABLED=true for local development only."
                ),
            },
        )

    host = domain.replace("https://", "").replace("http://", "").rstrip("/")
    jwks_url = f"https://{host}/.well-known/jwks.json"

    try:
        from jose import jwk
        import httpx

        async with httpx.AsyncClient() as client:
            resp = await client.get(jwks_url, timeout=10.0)
            resp.raise_for_status()
            jwks = resp.json()
        unverified = jwt.get_unverified_header(token)
        kid = unverified.get("kid")
        rsa_key: dict[str, Any] = {}
        for key in jwks.get("keys", []):
            if kid is None or key.get("kid") == kid:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"],
                }
                break
        if not rsa_key:
            raise HTTPException(
                status_code=401,
                detail={"error": "invalid_token", "message": "Signing key not found."},
            )
        payload = jwt.decode(
            token,
            jwk.construct(rsa_key),
            algorithms=["RS256"],
            audience=audience,
            issuer=issuer,
            options={"leeway": 300},
        )
        sub = str(payload.get("sub", "unknown"))
        return {"sub": sub}
    except ExpiredSignatureError as e:
        raise HTTPException(
            status_code=401,
            detail={"error": "invalid_token", "message": "Token expired."},
        ) from e
    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail={"error": "invalid_token", "message": str(e)},
        ) from e


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "error", "message": str(exc.detail)},
    )


@app.get("/")
def root() -> dict[str, str]:
    return {"message": f"Spectra {SERVICE}", "segment": SEGMENT}


@app.get(f"/v1/{SEGMENT}/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get(f"/v1/{SEGMENT}/ready")
def ready() -> dict[str, Any]:
    return {"status": "ok", "checks": {"runtime": "ok"}}


@app.get(f"/v1/{SEGMENT}/hello")
def hello(principal: dict[str, str] = Depends(require_principal)) -> dict[str, Any]:
    return {
        "message": f"Hello from {SERVICE}",
        "segment": SEGMENT,
        "service": SERVICE,
        "authenticated": True,
        "principal": principal,
    }


def run() -> None:
    import uvicorn

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "3004"))
    if _verify_disabled():
        print(
            "[quantum-api] AUTH0_VERIFY_DISABLED=true — JWTs are not cryptographically verified."
        )
    print(f"[ ready ] http://{host}:{port}")
    uvicorn.run(
        "quantum_api.main:app",
        host=host,
        port=port,
        reload=False,
        factory=False,
    )


if __name__ == "__main__":
    run()
