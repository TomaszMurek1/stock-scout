# core/openapi_overrides.py
from fastapi.openapi.utils import get_openapi
from fastapi import FastAPI

def add_bearer_auth(app: FastAPI):
    """Attach HTTP BearerAuth (JWT) security scheme to Swagger UI."""
    def custom_openapi():
        if app.openapi_schema:
            return app.openapi_schema
        openapi_schema = get_openapi(
            title=app.title,
            version="1.0.0",
            description="Stock Scout API documentation",
            routes=app.routes,
        )
        # Name must match what FastAPI uses ("HTTPBearer")
        openapi_schema["components"]["securitySchemes"] = {
            "HTTPBearer": {  # ← changed from "BearerAuth"
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "Paste your access token here (no 'Bearer ' prefix).",
            }
        }
        # Apply globally
        openapi_schema["security"] = [{"HTTPBearer": []}]
        app.openapi_schema = openapi_schema
        return app.openapi_schema

    app.openapi = custom_openapi