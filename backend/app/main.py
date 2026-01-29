from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
import os

from .database import engine, get_db, Base
from .models import Worker, Workstation, Event
from .schemas import (
    EventCreate, EventResponse,
    WorkerResponse, WorkstationResponse,
    WorkerMetrics, WorkstationMetrics, FactoryMetrics,
    SeedDataResponse
)
from .metrics import calculate_worker_metrics, calculate_workstation_metrics, calculate_factory_metrics
from .seed_data import seed_database

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Worker Productivity Dashboard API",
    description="AI-Powered manufacturing productivity monitoring system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
def read_root():
    return {
        "message": "Worker Productivity Dashboard API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# ==================== SEED DATA ENDPOINT ====================

@app.post("/api/seed", response_model=SeedDataResponse, status_code=status.HTTP_201_CREATED)
def seed_data(clear_existing: bool = True, db: Session = Depends(get_db)):
    """
    Seed the database with dummy data.

    - **clear_existing**: If True, clears all existing data before seeding
    """
    try:
        result = seed_database(db, clear_existing=clear_existing)
        return SeedDataResponse(
            message="Database seeded successfully",
            **result
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error seeding database: {str(e)}"
        )

# ==================== EVENT INGESTION ====================

@app.post("/api/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def ingest_event(event: EventCreate, db: Session = Depends(get_db)):
    """
    Ingest a new event from CCTV/AI system.

    Handles:
    - Duplicate detection (same timestamp, worker, workstation, event_type)
    - Out-of-order events (stores with original timestamp)
    """
    # Check for duplicate event
    existing_event = db.query(Event).filter(
        and_(
            Event.timestamp == event.timestamp,
            Event.worker_id == event.worker_id,
            Event.workstation_id == event.workstation_id,
            Event.event_type == event.event_type
        )
    ).first()

    if existing_event:
        # Return existing event instead of creating duplicate
        return existing_event

    # Validate worker exists
    worker = db.query(Worker).filter(Worker.worker_id == event.worker_id).first()
    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Worker {event.worker_id} not found"
        )

    # Validate workstation exists
    workstation = db.query(Workstation).filter(Workstation.station_id == event.workstation_id).first()
    if not workstation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workstation {event.workstation_id} not found"
        )

    # Create new event
    db_event = Event(**event.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    return db_event

@app.get("/api/events", response_model=List[EventResponse])
def get_events(
    skip: int = 0,
    limit: int = 100,
    worker_id: str = None,
    workstation_id: str = None,
    db: Session = Depends(get_db)
):
    """Get events with optional filtering"""
    query = db.query(Event)

    if worker_id:
        query = query.filter(Event.worker_id == worker_id)
    if workstation_id:
        query = query.filter(Event.workstation_id == workstation_id)

    events = query.order_by(Event.timestamp.desc()).offset(skip).limit(limit).all()
    return events

# ==================== METRICS ENDPOINTS ====================

@app.get("/api/metrics/workers", response_model=List[WorkerMetrics])
def get_worker_metrics(db: Session = Depends(get_db)):
    """Get productivity metrics for all workers"""
    return calculate_worker_metrics(db)

@app.get("/api/metrics/workers/{worker_id}", response_model=WorkerMetrics)
def get_worker_metric(worker_id: str, db: Session = Depends(get_db)):
    """Get productivity metrics for a specific worker"""
    metrics = calculate_worker_metrics(db)
    worker_metric = next((m for m in metrics if m.worker_id == worker_id), None)

    if not worker_metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Worker {worker_id} not found"
        )

    return worker_metric

@app.get("/api/metrics/workstations", response_model=List[WorkstationMetrics])
def get_workstation_metrics(db: Session = Depends(get_db)):
    """Get productivity metrics for all workstations"""
    return calculate_workstation_metrics(db)

@app.get("/api/metrics/workstations/{station_id}", response_model=WorkstationMetrics)
def get_workstation_metric(station_id: str, db: Session = Depends(get_db)):
    """Get productivity metrics for a specific workstation"""
    metrics = calculate_workstation_metrics(db)
    station_metric = next((m for m in metrics if m.station_id == station_id), None)

    if not station_metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workstation {station_id} not found"
        )

    return station_metric

@app.get("/api/metrics/factory", response_model=FactoryMetrics)
def get_factory_metrics(db: Session = Depends(get_db)):
    """Get factory-level aggregate metrics"""
    return calculate_factory_metrics(db)

# ==================== WORKER & WORKSTATION ENDPOINTS ====================

@app.get("/api/workers", response_model=List[WorkerResponse])
def get_workers(db: Session = Depends(get_db)):
    """Get all workers"""
    return db.query(Worker).all()

@app.get("/api/workstations", response_model=List[WorkstationResponse])
def get_workstations(db: Session = Depends(get_db)):
    """Get all workstations"""
    return db.query(Workstation).all()

# Initialize database with seed data on startup
@app.on_event("startup")
def startup_event():
    """Seed database on startup if empty"""
    db = next(get_db())

    # Check if database is empty
    worker_count = db.query(Worker).count()

    if worker_count == 0:
        print("Database is empty. Seeding with initial data...")
        seed_database(db, clear_existing=False)
        print("Database seeded successfully!")
    else:
        print(f"Database already contains {worker_count} workers. Skipping seed.")

    db.close()
