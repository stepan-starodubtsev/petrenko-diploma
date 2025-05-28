# app/api/api_v1/api.py
from fastapi import APIRouter

from app.api.api_v1.endpoints import auth, hosts, agents, metrics, trigger_configs # <--- Додано

api_router_v1 = APIRouter()

api_router_v1.include_router(auth.router, prefix="/auth", tags=["Authentication & Users (Dev)"])
api_router_v1.include_router(hosts.router, prefix="/hosts", tags=["Hosts"])
api_router_v1.include_router(agents.router, prefix="/agents", tags=["Agents"])
api_router_v1.include_router(metrics.router, tags=["Metrics"])
api_router_v1.include_router(trigger_configs.router, tags=["Trigger Configurations"])