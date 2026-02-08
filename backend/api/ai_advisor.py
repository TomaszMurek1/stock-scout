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
        logger.warning("❌ Missing Authorization header in proxy request")
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    logger.info(f"🔄 Proxying request for user {user.email}. Auth header present: {bool(authorization)}")
    
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
            raise HTTPException(status_code=500, detail=f"AI Advisor Proxy Error: {str(e)}")

@router.post("/feed")
async def feed_knowledge(
    request: Request,
    authorization: Optional[str] = Header(None),
    user = Depends(get_current_user)
):
    """
    Proxies knowledge saving requests to n8n stock-adviser-feed.
    This workflow is used to populate the vector DB with ticker-specific data.
    """
    if not authorization:
        logger.warning("❌ Missing Authorization header in proxy request")
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    logger.info(f"🔄 Proxying feed request for user {user.email}")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # Validate ticker presence
    if "ticker" not in body or not body["ticker"]:
        raise HTTPException(status_code=400, detail="Ticker is required")
    
    # Auto-detect mode based on backend environment
    is_dev = settings.ENV == "development"
    # The n8n endpoint is specifically 'stock-adviser-feed'
    path = "/webhook-test/stock-adviser-feed" if is_dev else "/webhook/stock-adviser-feed"
    
    url = f"{N8N_BASE_URL}{path}"
    
    logger.debug(f"Proxying feed request to n8n: {url}")
    
    async with httpx.AsyncClient() as client:
        try:
            # Forward to n8n with auth header
            response = await client.post(
                url,
                json=body,
                headers={"Authorization": authorization},
                timeout=60.0 
            )
            
            if response.status_code == 404:
                raise HTTPException(
                    status_code=404, 
                    detail="n8n is not listening on stock-adviser-feed! Ensure the workflow is active."
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
            raise HTTPException(status_code=504, detail="AI Advisor timed out.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI Advisor Proxy Error: {str(e)}")

@router.post("/ask")
async def ask_advisor(
    request: Request,
    authorization: Optional[str] = Header(None),
    user = Depends(get_current_user)
):
    """
    Proxies questions to n8n stock-adviser-ask.
    This workflow retrieves relevant context from vector DB (and optionally live stock data) to answer user questions.
    """
    if not authorization:
        logger.warning("❌ Missing Authorization header in proxy request")
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    logger.info(f"🔄 Proxying ask request for user {user.email}")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # Validate query presence
    if "query" not in body or not body["query"]:
        raise HTTPException(status_code=400, detail="Query is required")
    
    # Auto-detect mode based on backend environment
    is_dev = settings.ENV == "development"
    # The n8n endpoint is specifically 'stock-adviser-ask'
    path = "/webhook-test/stock-adviser-ask" if is_dev else "/webhook/stock-adviser-ask"
    
    url = f"{N8N_BASE_URL}{path}"
    
    logger.debug(f"Proxying ask request to n8n: {url}")
    
    async with httpx.AsyncClient() as client:
        try:
            # Forward to n8n with auth header
            response = await client.post(
                url,
                json=body,
                headers={"Authorization": authorization},
                timeout=60.0 
            )
            
            if response.status_code == 404:
                raise HTTPException(
                    status_code=404, 
                    detail="n8n is not listening on stock-adviser-ask! Ensure the workflow is active."
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
            raise HTTPException(status_code=504, detail="AI Advisor timed out.")
        except Exception as e:
            logger.exception("Unexpected error in AI Advisor proxy")
            raise HTTPException(status_code=500, detail=f"AI Advisor Proxy Error: {str(e)}")
