from sqlalchemy.orm import Session
from .models import Worker, Workstation, Event
from datetime import datetime, timedelta
import random

def seed_workers(db: Session):
    """Create 6 sample workers"""
    workers_data = [
        {"worker_id": "W1", "name": "John Smith"},
        {"worker_id": "W2", "name": "Sarah Johnson"},
        {"worker_id": "W3", "name": "Michael Chen"},
        {"worker_id": "W4", "name": "Emily Rodriguez"},
        {"worker_id": "W5", "name": "David Kumar"},
        {"worker_id": "W6", "name": "Lisa Anderson"},
    ]

    workers = []
    for data in workers_data:
        worker = Worker(**data)
        db.add(worker)
        workers.append(worker)

    db.commit()
    return len(workers)

def seed_workstations(db: Session):
    """Create 6 sample workstations"""
    workstations_data = [
        {"station_id": "S1", "name": "Assembly Line A", "station_type": "assembly"},
        {"station_id": "S2", "name": "Quality Control", "station_type": "inspection"},
        {"station_id": "S3", "name": "Packaging Station", "station_type": "packaging"},
        {"station_id": "S4", "name": "Assembly Line B", "station_type": "assembly"},
        {"station_id": "S5", "name": "Testing Bench", "station_type": "testing"},
        {"station_id": "S6", "name": "Shipping Prep", "station_type": "logistics"},
    ]

    workstations = []
    for data in workstations_data:
        station = Workstation(**data)
        db.add(station)
        workstations.append(station)

    db.commit()
    return len(workstations)

def seed_events(db: Session):
    """
    Generate realistic dummy events for a full work shift.
    Simulates 8-hour shift with realistic patterns.
    """
    worker_ids = ["W1", "W2", "W3", "W4", "W5", "W6"]
    station_ids = ["S1", "S2", "S3", "S4", "S5", "S6"]

    # Start time: today at 8 AM
    base_time = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)

    events = []
    event_count = 0

    # Generate events for each worker
    for worker_id in worker_ids:
        current_time = base_time
        assigned_station = random.choice(station_ids)

        # Simulate 8-hour shift (480 minutes)
        shift_end = base_time + timedelta(hours=8)

        while current_time < shift_end:
            # Randomly determine activity duration (15-60 minutes)
            duration = random.randint(15, 60)

            # Determine event type (weighted probabilities)
            event_type_choice = random.choices(
                ["working", "idle", "working", "working"],  # More working events
                k=1
            )[0]

            # Create event
            event = Event(
                timestamp=current_time,
                worker_id=worker_id,
                workstation_id=assigned_station,
                event_type=event_type_choice,
                confidence=round(random.uniform(0.85, 0.98), 2),
                count=1
            )
            events.append(event)
            event_count += 1

            # If working, add product_count events
            if event_type_choice == "working":
                # Add 1-3 product_count events during this working period
                num_products = random.randint(1, 3)
                for _ in range(num_products):
                    product_time = current_time + timedelta(minutes=random.randint(5, duration-5))
                    product_event = Event(
                        timestamp=product_time,
                        worker_id=worker_id,
                        workstation_id=assigned_station,
                        event_type="product_count",
                        confidence=round(random.uniform(0.90, 0.99), 2),
                        count=random.randint(1, 5)
                    )
                    events.append(product_event)
                    event_count += 1

            # Move to next time period
            current_time += timedelta(minutes=duration)

            # Occasionally switch stations
            if random.random() < 0.2:
                assigned_station = random.choice(station_ids)

    # Bulk insert events
    db.bulk_save_objects(events)
    db.commit()

    return event_count

def clear_all_data(db: Session):
    """Clear all existing data from database"""
    db.query(Event).delete()
    db.query(Worker).delete()
    db.query(Workstation).delete()
    db.commit()

def seed_database(db: Session, clear_existing: bool = True):
    """Main function to seed entire database"""
    if clear_existing:
        clear_all_data(db)

    workers_count = seed_workers(db)
    workstations_count = seed_workstations(db)
    events_count = seed_events(db)

    return {
        "workers_created": workers_count,
        "workstations_created": workstations_count,
        "events_created": events_count
    }
