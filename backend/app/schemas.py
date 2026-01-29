from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

# Event Schemas
class EventCreate(BaseModel):
    timestamp: datetime
    worker_id: str
    workstation_id: str
    event_type: str = Field(..., pattern="^(working|idle|absent|product_count)$")
    confidence: float = Field(..., ge=0.0, le=1.0)
    count: int = Field(default=1, ge=0)

class EventResponse(BaseModel):
    id: int
    timestamp: datetime
    worker_id: str
    workstation_id: str
    event_type: str
    confidence: float
    count: int
    created_at: datetime

    class Config:
        from_attributes = True

# Worker Schemas
class WorkerBase(BaseModel):
    worker_id: str
    name: str

class WorkerCreate(WorkerBase):
    pass

class WorkerResponse(WorkerBase):
    id: int

    class Config:
        from_attributes = True

# Workstation Schemas
class WorkstationBase(BaseModel):
    station_id: str
    name: str
    station_type: Optional[str] = None

class WorkstationCreate(WorkstationBase):
    pass

class WorkstationResponse(WorkstationBase):
    id: int

    class Config:
        from_attributes = True

# Metrics Schemas
class WorkerMetrics(BaseModel):
    worker_id: str
    name: str
    total_active_time_minutes: float
    total_idle_time_minutes: float
    utilization_percentage: float
    total_units_produced: int
    units_per_hour: float

class WorkstationMetrics(BaseModel):
    station_id: str
    name: str
    occupancy_time_minutes: float
    utilization_percentage: float
    total_units_produced: int
    throughput_rate: float

class FactoryMetrics(BaseModel):
    total_productive_time_minutes: float
    total_production_count: int
    average_production_rate: float
    average_utilization_percentage: float
    total_workers: int
    total_workstations: int

class SeedDataResponse(BaseModel):
    message: str
    workers_created: int
    workstations_created: int
    events_created: int
