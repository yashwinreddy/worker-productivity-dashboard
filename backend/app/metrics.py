from sqlalchemy.orm import Session
from sqlalchemy import func
from .models import Event, Worker, Workstation
from .schemas import WorkerMetrics, WorkstationMetrics, FactoryMetrics
from datetime import datetime, timedelta
from typing import List

def calculate_worker_metrics(db: Session) -> List[WorkerMetrics]:
    """
    Calculate metrics for each worker.

    Assumptions:
    - Events represent state changes
    - Time between events represents duration in that state
    - Last event persists until end of shift (8 hours default)
    """
    workers = db.query(Worker).all()
    metrics = []

    for worker in workers:
        # Get all events for this worker, ordered by timestamp
        events = db.query(Event).filter(
            Event.worker_id == worker.worker_id
        ).order_by(Event.timestamp).all()

        if not events:
            metrics.append(WorkerMetrics(
                worker_id=worker.worker_id,
                name=worker.name,
                total_active_time_minutes=0.0,
                total_idle_time_minutes=0.0,
                utilization_percentage=0.0,
                total_units_produced=0,
                units_per_hour=0.0
            ))
            continue

        active_time = 0.0
        idle_time = 0.0
        total_units = 0

        # Process events in sequence
        for i in range(len(events)):
            current_event = events[i]

            # Calculate duration until next event or end of shift
            if i < len(events) - 1:
                next_event = events[i + 1]
                duration_minutes = (next_event.timestamp - current_event.timestamp).total_seconds() / 60
            else:
                # Last event - assume 30 minutes duration
                duration_minutes = 30.0

            # Accumulate time based on event type
            if current_event.event_type == "working":
                active_time += duration_minutes
            elif current_event.event_type == "idle":
                idle_time += duration_minutes

            # Count production
            if current_event.event_type == "product_count":
                total_units += current_event.count

        # Calculate metrics
        total_time = active_time + idle_time
        utilization = (active_time / total_time * 100) if total_time > 0 else 0.0
        units_per_hour = (total_units / (total_time / 60)) if total_time > 0 else 0.0

        metrics.append(WorkerMetrics(
            worker_id=worker.worker_id,
            name=worker.name,
            total_active_time_minutes=round(active_time, 2),
            total_idle_time_minutes=round(idle_time, 2),
            utilization_percentage=round(utilization, 2),
            total_units_produced=total_units,
            units_per_hour=round(units_per_hour, 2)
        ))

    return metrics

def calculate_workstation_metrics(db: Session) -> List[WorkstationMetrics]:
    """
    Calculate metrics for each workstation.

    Assumptions:
    - Occupancy = time when any worker is at the station (working or idle)
    - Utilization = productive time only
    """
    workstations = db.query(Workstation).all()
    metrics = []

    for station in workstations:
        # Get all events for this workstation
        events = db.query(Event).filter(
            Event.workstation_id == station.station_id
        ).order_by(Event.timestamp).all()

        if not events:
            metrics.append(WorkstationMetrics(
                station_id=station.station_id,
                name=station.name,
                occupancy_time_minutes=0.0,
                utilization_percentage=0.0,
                total_units_produced=0,
                throughput_rate=0.0
            ))
            continue

        occupancy_time = 0.0
        productive_time = 0.0
        total_units = 0

        for i in range(len(events)):
            current_event = events[i]

            # Calculate duration
            if i < len(events) - 1:
                next_event = events[i + 1]
                duration_minutes = (next_event.timestamp - current_event.timestamp).total_seconds() / 60
            else:
                duration_minutes = 30.0

            # Accumulate time
            if current_event.event_type in ["working", "idle"]:
                occupancy_time += duration_minutes

            if current_event.event_type == "working":
                productive_time += duration_minutes

            # Count production
            if current_event.event_type == "product_count":
                total_units += current_event.count

        # Calculate metrics
        utilization = (productive_time / occupancy_time * 100) if occupancy_time > 0 else 0.0
        throughput_rate = (total_units / (occupancy_time / 60)) if occupancy_time > 0 else 0.0

        metrics.append(WorkstationMetrics(
            station_id=station.station_id,
            name=station.name,
            occupancy_time_minutes=round(occupancy_time, 2),
            utilization_percentage=round(utilization, 2),
            total_units_produced=total_units,
            throughput_rate=round(throughput_rate, 2)
        ))

    return metrics

def calculate_factory_metrics(db: Session) -> FactoryMetrics:
    """
    Calculate factory-level aggregate metrics.
    """
    # Get all workers and workstations count
    total_workers = db.query(func.count(Worker.id)).scalar()
    total_workstations = db.query(func.count(Workstation.id)).scalar()

    # Calculate worker metrics to aggregate
    worker_metrics = calculate_worker_metrics(db)

    # Aggregate across all workers
    total_productive_time = sum(m.total_active_time_minutes for m in worker_metrics)
    total_production = sum(m.total_units_produced for m in worker_metrics)
    avg_utilization = sum(m.utilization_percentage for m in worker_metrics) / len(worker_metrics) if worker_metrics else 0.0

    # Calculate average production rate
    avg_production_rate = (total_production / (total_productive_time / 60)) if total_productive_time > 0 else 0.0

    return FactoryMetrics(
        total_productive_time_minutes=round(total_productive_time, 2),
        total_production_count=total_production,
        average_production_rate=round(avg_production_rate, 2),
        average_utilization_percentage=round(avg_utilization, 2),
        total_workers=total_workers,
        total_workstations=total_workstations
    )
