import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from typing import Optional
import logging
from services.auth.auth import get_current_user
from core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Inside Docker, n8n is accessible via service name 'n8n'
# In dev it might be 'dev_n8n' but usually service name in compose is 'n8n'
# Let's check docker-compose.dev.yml: it's 'n8n'
N8N_BASE_URL = "http://n8n:5678"

@router.post("/analyze")
async def analyze_portfolio(
    request: Request,
    authorization: Optional[str] = Header(None),
    user = Depends(get_current_user)
):
    """
    Proxies AI Advisor requests to n8n.
    This hides n8n from the frontend and centralizes security.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    body = await request.json()
    
    # Auto-detect mode based on backend environment
    is_dev = settings.ENV == "development"
    path = "/webhook-test/ai-advisor" if is_dev else "/webhook/ai-advisor"
    
    # In production/deployment, n8n might be under a subpath /n8n/
    # But usually internal communication is direct to port.
    url = f"{N8N_BASE_URL}{path}"
    
    logger.debug(f"Proxying AI analysis request to n8n: {url}")
    
    async with httpx.AsyncClient() as client:
        try:
            # We forward the authorization header so n8n can call back to our API on behalf of the user
            response = await client.post(
                url,
                json=body,
                headers={"Authorization": authorization},
                timeout=90.0 # AI analysis can be slow
            )
            
            if response.status_code == 404:
                raise HTTPException(
                    status_code=404, 
                    detail="n8n is not listening! Ensure the workflow is active or in 'Execute' mode."
                )
            
            if response.status_code >= 400:
                logger.error(f"n8n error: {response.status_code} - {response.text}")
                try:
                    error_json = response.json()
                    detail = error_json.get("message") or response.text
                except:
                    detail = response.text
                raise HTTPException(status_code=response.status_code, detail=detail)
            
            return response.json()
            
        except httpx.ConnectError:
            logger.error("Could not connect to n8n service.")
            raise HTTPException(status_code=502, detail="AI Advisor service (n8n) is currently unreachable.")
        except httpx.TimeoutException:
            logger.error("n8n timed out.")
            raise HTTPException(status_code=504, detail="AI Advisor timed out. Please try again later.")
        except Exception as e:
            logger.exception("Unexpected error in AI Advisor proxy")
            raise HTTPException(status_code=500, detail=f"AI Advisor Proxy Error: {str(e)}")
