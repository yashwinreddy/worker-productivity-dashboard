from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class Worker(Base):
    __tablename__ = "workers"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)

    events = relationship("Event", back_populates="worker")

class Workstation(Base):
    __tablename__ = "workstations"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    station_type = Column(String, nullable=True)

    events = relationship("Event", back_populates="workstation")

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    worker_id = Column(String, ForeignKey("workers.worker_id"), nullable=False, index=True)
    workstation_id = Column(String, ForeignKey("workstations.station_id"), nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)  # working, idle, absent, product_count
    confidence = Column(Float, nullable=False)
    count = Column(Integer, default=1)  # For product_count events
    created_at = Column(DateTime, default=datetime.utcnow)

    # Composite index for deduplication
    __table_args__ = (
        Index('idx_event_dedup', 'timestamp', 'worker_id', 'workstation_id', 'event_type'),
    )

    worker = relationship("Worker", back_populates="events")
    workstation = relationship("Workstation", back_populates="events")
