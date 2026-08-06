"""
Validate environment variables before FastAPI starts.
Exits with a clear error message if any required variable is missing or empty.
Run manually first: python .env_validator.py
Then delete this file (or keep it for CI).
"""

import os, sys


REQUIRED_VARS = {
    'JWT_SECRET_KEY': 'JWT secret key',
    'MONGO_URI': 'MongoDB connection URI',
}

OPTIONAL_VARS = {
    'GROQ_API_KEY': 'Groq API key (for LLM calls)',
    'CHROMA_PATH': 'ChromaDB path (defaults to ./chroma_db)',
    'VITE_API_BASE_URL': 'Frontend backend URL',
}


def check_env():
    errors = []

    for var, desc in REQUIRED_VARS.items():
        val = os.environ.get(var) or ''
        if not val:
            errors.append(f"❌ Missing required env variable: {var} ({desc})")

    optional_missing = [v for v, d in OPTIONAL_VARS.items() if not os.environ.get(v)]
    if optional_missing:
        warnings = "\n".join([f"⚠️  Optional missing: {v}" for v in optional_missing])
        print(warnings)

    if errors:
        print("\n".join(errors))
        sys.exit(1)


if __name__ == '__main__':
    check_env()