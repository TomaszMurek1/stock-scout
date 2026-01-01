"""Authorization utilities for role-based access control."""

from fastapi import HTTPException, status, Depends
from database.user import User, UserScope
from services.auth.auth import get_current_user


def require_scope(allowed_scopes: list[UserScope]):
    """
    Create a dependency that ensures the current user has one of the allowed scopes.
    
    Usage:
        @router.post("/admin-only")
        def admin_endpoint(user: User = Depends(require_scope([UserScope.ADMIN]))):
            pass
    """
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.scope not in allowed_scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {[s.value for s in allowed_scopes]}, You have: {user.scope.value}"
            )
        return user
    return dependency


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Dependency that requires admin scope."""
    return require_scope([UserScope.ADMIN])(user)


def require_admin_or_demo(user: User = Depends(get_current_user)) -> User:
    """Dependency that requires admin or demo scope (view-only admin)."""
    return require_scope([UserScope.ADMIN, UserScope.DEMO])(user)
