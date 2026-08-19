import asyncio
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from requests_oauthlib import OAuth2Session

import auth
from database import get_db

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI", "http://127.0.0.1:8000/auth/google/callback"
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development") == "production"

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
SCOPE = ["openid", "email", "profile"]

OAUTH_TIMEOUT = 15

router = APIRouter(tags=["google-auth"])


@router.get("/google")
async def google_login(request: Request):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth is not configured (missing GOOGLE_CLIENT_ID)",
        )

    state = secrets.token_urlsafe(32)
    session = OAuth2Session(
        GOOGLE_CLIENT_ID, scope=SCOPE, redirect_uri=GOOGLE_REDIRECT_URI, state=state
    )
    authorization_url, _ = session.authorization_url(AUTH_URL)

    response = RedirectResponse(authorization_url)
    response.set_cookie(
        key="google_oauth_state",
        value=state,
        max_age=600,
        httponly=True,
        samesite="lax",
        secure=IS_PRODUCTION,
    )
    return response


@router.get("/google/callback")
async def google_callback(request: Request, code: str, state: str, db=Depends(get_db)):
    expected_state = request.cookies.get("google_oauth_state")
    if not expected_state or not secrets.compare_digest(expected_state, state):
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth is not configured",
        )

    session = OAuth2Session(
        GOOGLE_CLIENT_ID, scope=SCOPE, redirect_uri=GOOGLE_REDIRECT_URI, state=state
    )

    def _exchange_and_fetch_profile():
        session.fetch_token(
            token_url=TOKEN_URL,
            client_secret=GOOGLE_CLIENT_SECRET,
            code=code,
            timeout=OAUTH_TIMEOUT,
        )
        response = session.get(USERINFO_URL, timeout=OAUTH_TIMEOUT)
        response.raise_for_status()
        return response.json()

    try:
        info = await asyncio.to_thread(_exchange_and_fetch_profile)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to authenticate with Google: {str(e)}")

    email = info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")
    name = info.get("name") or email.split("@")[0]

    user = await db["users"].find_one({"email": email})
    if not user:
        await db["users"].insert_one(
            {
                "email": email,
                "name": name,
                "google_id": info.get("id"),
                "created_at": datetime.now(timezone.utc),
            }
        )
    else:
        set_fields = {}
        if not user.get("google_id") and info.get("id"):
            set_fields["google_id"] = info.get("id")
        if not user.get("name") and not user.get("hashed_password"):
            set_fields["name"] = name
        if set_fields:
            await db["users"].update_one({"_id": user["_id"]}, {"$set": set_fields})

    access_token = auth.create_access_token(
        data={"sub": email},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    redirect_url = f"{FRONTEND_URL}/auth/google?token={access_token}"
    response = RedirectResponse(redirect_url)
    response.delete_cookie("google_oauth_state")
    return response
