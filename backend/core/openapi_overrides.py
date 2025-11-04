# core/openapi_overrides.py
from fastapi.openapi.utils import get_openapi
from fastapi import FastAPI

def add_bearer_auth(app: FastAPI):
    """Attach a manual BearerAuth (JWT) security scheme to Swagger UI."""
    def custom_openapi():
        if app.openapi_schema:
            return app.openapi_schema
        openapi_schema = get_openapi(
            title=app.title,
            version="1.0.0",
            description="Stock Scout API documentation",
            routes=app.routes,
        )
        # Add a simple bearer auth scheme
        openapi_schema["components"]["securitySchemes"] = {
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "Paste your access token here. Example: **Bearer eyJhbGciOiJI...**",
            }
        }
        # Apply BearerAuth globally
        openapi_schema["security"] = [{"BearerAuth": []}]
        app.openapi_schema = openapi_schema
        return app.openapi_schema

    app.openapi = custom_openapi
