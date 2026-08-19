import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from database import get_db
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------
# JWT Configuration
# ---------------------------------------------------------
# SECRET_KEY is used to sign the JWT. Only the server knows this.
# If a hacker tries to modify the JWT, the signature will be invalid.
SECRET_KEY = os.getenv("JWT_SECRET_KEY", os.getenv("JWT_SECRET", "super-secret-key-please-change-in-production"))
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

_jwt_expire_minutes = os.getenv("JWT_EXPIRE_MINUTES")
_token_expire_hours = os.getenv("TOKEN_EXPIRE_HOURS")
if _jwt_expire_minutes:
    ACCESS_TOKEN_EXPIRE_MINUTES = int(_jwt_expire_minutes)
elif _token_expire_hours:
    ACCESS_TOKEN_EXPIRE_MINUTES = int(_token_expire_hours) * 60
else:
    ACCESS_TOKEN_EXPIRE_MINUTES = 60

# bcrypt is used directly (passlib is incompatible with bcrypt>=4.x on Python 3.14)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def verify_password(plain_password, hashed_password):
    """
    Compares the plain text password (from the login request)
    with the hashed password stored in MongoDB.
    """
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    """
    Hashes a plain text password using bcrypt.
    We call this when a user registers, before saving to MongoDB.
    """
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Creates a new JSON Web Token.
    'data' contains the payload (e.g., {"sub": "user@email.com"}).
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
        
    to_encode.update({"exp": expire}) # Add expiration time to payload
    
    # Sign the token using our SECRET_KEY
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    """
    Dependency that can be injected into any FastAPI endpoint to protect it.
    It takes the JWT from the request, verifies it, extracts the email,
    and fetches the user from MongoDB.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the token using our SECRET_KEY
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub") # We use 'sub' (subject) to store the email
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Query MongoDB to find the user
    user = await db["users"].find_one({"email": email})
    if user is None:
        raise credentials_exception
        
    return user
