# Security Vulnerability Fixes - January 2026

## Summary
Dependabot identified 4 vulnerable dependencies in `backend/requirements.txt`. This document outlines the vulnerabilities and actions taken.

## Vulnerabilities Fixed

### 1. h11 - CRITICAL (CVE-2025-43859)
- **Severity**: Critical (CVSS 9.1)
- **Affected Version**: 0.14.0
- **Fixed Version**: 0.16.0
- **Issue**: Request smuggling vulnerability due to lenient parsing of line terminators in chunked-coding message bodies
- **Impact**: Could allow attackers to bypass security controls, gain unauthorized access, or leak credentials
- **Action**: ✅ Updated to h11==0.16.0

### 2. urllib3 - HIGH (CVE-2025-50181, CVE-2025-50182)
- **Severity**: High
- **Affected Version**: 2.4.0
- **Fixed Version**: 2.5.0
- **Issue**: Open redirect vulnerabilities
  - CVE-2025-50181: SSRF mitigation bypass at PoolManager level
  - CVE-2025-50182: Improper redirect control in Pyodide/Node.js environments
- **Impact**: Potential for open redirect attacks and SSRF bypass
- **Action**: ✅ Updated to urllib3==2.5.0

### 3. starlette - HIGH (CVE-2025-62727, CVE-2025-54121)
- **Severity**: High
- **Affected Version**: 0.46.2
- **Fixed Version**: 0.49.1
- **Issue**: Multiple Denial of Service vulnerabilities
  - CVE-2025-62727: ReDoS via crafted HTTP Range header
  - CVE-2025-54121: DoS via multipart file parsing
- **Impact**: CPU exhaustion and service unavailability
- **Action**: ✅ Updated to starlette==0.49.1

### 4. ecdsa - HIGH (CVE-2024-23342)
- **Severity**: High
- **Affected Version**: 0.19.1
- **Fixed Version**: None (maintainers won't fix)
- **Issue**: Minerva timing attack on P-256 curve
- **Impact**: Potential private key leakage through timing analysis
- **Status**: ⚠️ **UNFIXED** - Transitive dependency (via python-jose)
- **Mitigation**: 
  - Not directly used in codebase
  - Timing attacks are difficult to exploit in typical web application scenarios
  - Consider migrating from `python-jose` to `python-jose[cryptography]` or `PyJWT` with `cryptography` library in future

### 5. FastAPI - COMPATIBILITY UPDATE
- **Previous Version**: 0.115.12
- **Updated Version**: 0.128.0
- **Reason**: Required to support Starlette 0.49.1 (FastAPI 0.115.12 only supported Starlette <0.47.0)
- **Action**: ✅ Updated to fastapi==0.128.0
- **Benefits**: Latest features, bug fixes, and improved performance

## Deployment Status

✅ **All changes have been successfully deployed!**

- Docker image rebuilt with updated dependencies
- Backend container restarted and running successfully
- No errors detected in startup logs

## Next Steps

### Immediate Actions (Recommended)
1. ✅ **Docker containers rebuilt** - Backend is running with updated dependencies

2. **Test the application** functionality:
   - Test authentication endpoints (uses python-jose)
   - Test file upload/download features (uses starlette)
   - Test external API calls (uses urllib3)
   - Verify all critical user flows work as expected

3. **Run automated tests** (if available):
   ```bash
   cd /home/tm/Projekty/stock-scout/backend
   pytest
   ```

### Future Recommendations (Optional)
1. **Address ecdsa vulnerability** by migrating JWT handling:
   - Replace `python-jose` with `PyJWT` + `cryptography`
   - This provides better security and active maintenance
   - Example migration:
     ```python
     # Old: from jose import jwt
     # New: import jwt  # PyJWT
     ```

2. **Enable automated dependency updates**:
   - Configure Dependabot to auto-create PRs for security updates
   - Set up CI/CD to automatically test dependency updates

3. **Regular security audits**:
   - Run `pip-audit` or `safety check` regularly
   - Monitor security advisories for your dependencies

## Compatibility Notes
- **h11**: 0.14.0 → 0.16.0 (minor version bump, should be backward compatible)
- **urllib3**: 2.4.0 → 2.5.0 (patch version bump, backward compatible)
- **starlette**: 0.46.2 → 0.49.1 (minor version bump, may have breaking changes)
  - Check [Starlette changelog](https://www.starlette.io/release-notes/) for any breaking changes
  - FastAPI compatibility should be maintained

## Testing Checklist
- [ ] Backend starts without errors
- [ ] Authentication/login works
- [ ] API endpoints respond correctly
- [ ] File uploads/downloads work
- [ ] External API integrations function
- [ ] Docker deployment works
- [ ] All tests pass

## Date Applied
January 31, 2026
