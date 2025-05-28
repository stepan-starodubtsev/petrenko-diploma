from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from app.db.models.host import Host
from app.db.models.enums import HostAvailabilityStatusEnum, HostTypeEnum
from app.schemas.host import HostCreate, HostUpdate

def get_host(db: Session, host_id: uuid.UUID) -> Optional[Host]:
    return db.query(Host).filter(Host.id == host_id).first()

def get_host_by_name(db: Session, name: str) -> Optional[Host]:
    return db.query(Host).filter(Host.name == name).first()

def get_host_by_agent_id(db: Session, unique_agent_id: str) -> Optional[Host]:
    return db.query(Host).filter(Host.unique_agent_id == unique_agent_id).first()

def get_hosts(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    availability_status: Optional[HostAvailabilityStatusEnum] = None,
    host_type: Optional[HostTypeEnum] = None,
    is_monitored: Optional[bool] = None
) -> List[Host]:
    query = db.query(Host)
    if availability_status:
        query = query.filter(Host.availability_status == availability_status)
    if host_type:
        query = query.filter(Host.host_type == host_type)
    if is_monitored is not None:
        query = query.filter(Host.is_monitored == is_monitored)
    return query.order_by(Host.name).offset(skip).limit(limit).all()

def get_pending_approval_hosts(db: Session, skip: int = 0, limit: int = 100) -> List[Host]:
    return get_hosts(db, skip=skip, limit=limit, availability_status=HostAvailabilityStatusEnum.pending_approval)

def create_host(db: Session, host_in: HostCreate) -> Host:
    db_host = Host(
        name=host_in.name,
        ip_address=host_in.ip_address,
        host_type=host_in.host_type,
        unique_agent_id=host_in.unique_agent_id,
        snmp_community=host_in.snmp_community,
        snmp_port=host_in.snmp_port,
        snmp_version=host_in.snmp_version,
        is_monitored=host_in.is_monitored if host_in.is_monitored is not None else True,
        notes=host_in.notes,
    )
    if host_in.unique_agent_id and not get_host_by_agent_id(db, host_in.unique_agent_id):
         db_host.availability_status = HostAvailabilityStatusEnum.pending_approval
         db_host.is_monitored = False

    db.add(db_host)
    db.commit()
    db.refresh(db_host)
    return db_host

def approve_host(db: Session, db_host: Host, name: Optional[str] = None, ip_address: Optional[str] = None) -> Host:
    if db_host.availability_status == HostAvailabilityStatusEnum.pending_approval:
        db_host.availability_status = HostAvailabilityStatusEnum.unknown
        db_host.is_monitored = True
        if name:
            db_host.name = name
        if ip_address:
            db_host.ip_address = ip_address
        db.add(db_host)
        db.commit()
        db.refresh(db_host)
    return db_host

def update_host(db: Session, db_host: Host, host_in: HostUpdate) -> Host:
    update_data = host_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_host, field, value)

    db.add(db_host)
    db.commit()
    db.refresh(db_host)
    return db_host

def delete_host(db: Session, host_id: uuid.UUID) -> Optional[Host]:
    db_host = db.query(Host).filter(Host.id == host_id).first()
    if db_host:
        db.delete(db_host)
        db.commit()
    return db_host

def update_host_last_metric_at(db: Session, host_id: uuid.UUID) -> Optional[Host]:
    db_host = get_host(db, host_id=host_id)
    if db_host:
        db_host.last_metric_at = datetime.now(timezone.utc)
        if db_host.availability_status != HostAvailabilityStatusEnum.up and \
           db_host.availability_status != HostAvailabilityStatusEnum.pending_approval:
            db_host.availability_status = HostAvailabilityStatusEnum.up
        db.commit()
        db.refresh(db_host)
    return db_host

def update_host_availability(db: Session, host_id: uuid.UUID, status: HostAvailabilityStatusEnum) -> Optional[Host]:
    db_host = get_host(db, host_id=host_id)
    if db_host and db_host.availability_status != HostAvailabilityStatusEnum.pending_approval:
        db_host.availability_status = status
        db.commit()
        db.refresh(db_host)
    return db_host