# Invitation-Based Access System

StockScan Pro uses an invitation-based registration system to manage user access and role-based permissions. This ensures that the platform remains controlled while allowing for custom access levels for different types of users (e.g., admins, paid users, or recruiters).

## System Overview

Access is controlled via unique, cryptographically secure invitation codes. Each code is linked to a specific **User Scope** and an **Access Duration**.

### User Scopes
Permissions are inherited from the invitation used during registration:

| Scope | Description | Access Level |
|-------|-------------|--------------|
| `admin` | Full system access | Can manage invitations and system data |
| `demo` | Read-only admin access | Can view all admin tools but cannot modify data |
| `paid_access` | Premium scanner access | Access to advanced scanner features |
| `basic_access` | Standard user access | Access to basic scanner features |
| `read_only` | Viewing access only | Cannot run scans, view results only |

### Key Concepts

1.  **Direct Registration Protection**: The system prevents any user registration without a valid, active invitation code.
2.  **Access Duration**: Defined in days. This starts from the moment a user registers and is checked during every login.
3.  **Usage Limits**: Invitations can be limited to a specific number of uses (e.g., a one-time use code or a 10-person group code).
4.  **Automatic Deactivation**: An invitation automatically becomes inactive once its `max_uses` limit is reached.

---

## Administration Interface

Administrators can manage invitations through the **Invitation Management** page (accessible via the Admin Dashboard).

### Creating Invitations
When creating a new invitation, admins define:
- **Access Scope**: The role the user will receive.
- **Max Uses**: Total number of users who can sign up using this specific code.
- **Duration (days)**: How many days of access the user gets from their signup date.

### Security Features
- **Code Anonymization**: For users with `demo` scope, invitation codes are masked on the backend (e.g., `P••••w`) to prevent unauthorized usage while allowing for administrative oversight.
- **Role Validation**: All sensitive API endpoints are protected with scope-based decorators (`require_admin`, `require_admin_or_demo`).

---

## Technical Details

### API Endpoints

- `POST /api/admin/invitations`: Create a new invitation (Admin only).
- `GET /api/admin/invitations`: List all invitations (Admin/Demo).
- `POST /api/auth/register`: Register with an invitation code.

### Database Schema

The system relies on two main tables:
- `invitations`: Stores the codes, scopes, usage counts, and durations.
- `users`: Stores user credentials, their inherited scope, and a reference to the invitation used.

### JWT Integration
The user's `scope` is embedded directly into the JWT (JSON Web Token) payload. This allows the frontend to conditionally render UI elements (like the Admin card in the carousel) without redundant API calls.

```json
{
  "sub": "user@example.com",
  "scope": "demo",
  "exp": 1704123456
}
```

---

## Secure Implementation Notes (for Public Repository)

While the invitation logic is public, the security of the system depends on:
1.  **Secret Management**: Ensure `SECRET_KEY` for JWT signing is unique and not stored in version control.
2.  **Production Scopes**: In production, ensure the initial admin user is created via a secure database migration or seed script, not a public invitation.
3.  **HTTPS**: Always serve the application over HTTPS to protect invitation codes in transit.
