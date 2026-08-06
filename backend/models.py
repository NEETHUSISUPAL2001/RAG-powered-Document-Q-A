from pydantic import BaseModel, EmailStr
from typing import Optional

# ---------------------------------------------------------
# Authentication Models
# These define the structure of the JSON data we expect
# from the frontend when a user registers or logs in.
# ---------------------------------------------------------

class UserCreate(BaseModel):
    """
    Model for registering a new user.
    We enforce that 'email' must be a valid email format using EmailStr.
    """
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    """
    Model for logging in an existing user.
    """
    email: EmailStr
    password: str

class Token(BaseModel):
    """
    Model for the JWT token response we send back to the frontend
    upon a successful login.
    """
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """
    Model for the data encoded *inside* the JWT.
    We will store the user's email inside the token payload.
    """
    email: Optional[str] = None
