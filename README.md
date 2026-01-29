# AI-Powered Worker Productivity Dashboard

A full-stack web application for monitoring manufacturing worker productivity using AI-powered CCTV camera events. This system ingests computer vision events, stores them in a database, computes productivity metrics, and displays them in a real-time dashboard.

## 🏗️ Architecture Overview
```
┌─────────────────┐
│  AI CCTV Edge   │
│    Cameras      │
└────────┬────────┘
         │ JSON Events
         ▼
┌─────────────────┐
│  FastAPI Backend│
│  (Event Queue)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SQLite Database│
│  (Persistence)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Metrics Engine  │
│  (Computation)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  React Frontend │
│   (Dashboard)   │
└─────────────────┘
```

### Architecture Components

**1. Edge Layer (AI CCTV Cameras)**
- Computer vision models detect worker activities
- Generate structured JSON events
- Send events to backend API via HTTP POST

**2. Backend Layer (FastAPI)**
- RESTful API for event ingestion
- Event validation and deduplication
- Database persistence
- Metrics computation engine
- CORS-enabled for frontend communication

**3. Data Layer (SQLite)**
- Relational database with 3 core tables
- Indexed for performance
- Persistent storage for all events

**4. Frontend Layer (React + Vite)**
- Real-time dashboard
- Factory, worker, and workstation views
- Auto-refresh every 30 seconds
- Filtering and selection capabilities

---

## 📊 Database Schema

### Tables

#### **workers**
```sql
CREATE TABLE workers (
    id INTEGER PRIMARY KEY,
    worker_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
);
```

#### **workstations**
```sql
CREATE TABLE workstations (
    id INTEGER PRIMARY KEY,
    station_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    station_type TEXT
);
```

#### **events**
```sql
CREATE TABLE events (
    id INTEGER PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    worker_id TEXT NOT NULL,
    workstation_id TEXT NOT NULL,
    event_type TEXT NOT NULL,  -- 'working', 'idle', 'absent', 'product_count'
    confidence FLOAT NOT NULL,
    count INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id),
    FOREIGN KEY (workstation_id) REFERENCES workstations(station_id)
);

-- Indexes for performance and deduplication
CREATE INDEX idx_event_dedup ON events(timestamp, worker_id, workstation_id, event_type);
CREATE INDEX idx_timestamp ON events(timestamp);
CREATE INDEX idx_worker_id ON events(worker_id);
CREATE INDEX idx_workstation_id ON events(workstation_id);
CREATE INDEX idx_event_type ON events(event_type);
```

### Relationships
- `events.worker_id` → `workers.worker_id` (Many-to-One)
- `events.workstation_id` → `workstations.station_id` (Many-to-One)

---

## 📈 Metric Definitions

### Worker-Level Metrics

| Metric | Definition | Calculation |
|--------|------------|-------------|
| **Total Active Time** | Time spent in 'working' state | Sum of durations between 'working' events and next event |
| **Total Idle Time** | Time spent in 'idle' state | Sum of durations between 'idle' events and next event |
| **Utilization %** | Percentage of time spent working | `(Active Time / Total Time) × 100` |
| **Total Units Produced** | Total products completed | Sum of `count` field in 'product_count' events |
| **Units per Hour** | Production rate | `Total Units / (Total Time in hours)` |

### Workstation-Level Metrics

| Metric | Definition | Calculation |
|--------|------------|-------------|
| **Occupancy Time** | Time station was in use | Sum of all 'working' and 'idle' event durations |
| **Utilization %** | Percentage of occupancy spent working | `(Productive Time / Occupancy Time) × 100` |
| **Total Units Produced** | Total products from station | Sum of 'product_count' events at this station |
| **Throughput Rate** | Station production rate | `Total Units / (Occupancy Time in hours)` |

### Factory-Level Metrics

| Metric | Definition | Calculation |
|--------|------------|-------------|
| **Total Productive Time** | Aggregate working time | Sum of all workers' active time |
| **Total Production Count** | Factory-wide output | Sum of all 'product_count' events |
| **Average Production Rate** | Factory average output | `Total Production / (Total Productive Time in hours)` |
| **Average Utilization** | Mean worker efficiency | `Sum of worker utilizations / Number of workers` |

---

## 🔧 Assumptions & Design Decisions

### Time Calculation Assumptions

1. **Event Duration Model**: Events represent **state changes**. The duration of a state is calculated as the time difference between consecutive events.

2. **Last Event Handling**: For the final event in a sequence, we assume a **30-minute duration** (configurable).

3. **Shift Duration**: Default shift is **8 hours**. Metrics are calculated within this window.

4. **Out-of-Order Events**: Events are sorted by timestamp before processing, ensuring correct chronological order.

### Production Event Aggregation

- `product_count` events are **independent** of time-based activity events
- They are **summed** to calculate total production
- Production rate = `Total Units / Active Working Time`
- Multiple `product_count` events can occur during a single 'working' period

### Edge Case Handling

#### 1. **Intermittent Connectivity**
**Problem**: Network interruptions between edge cameras and backend

**Solution**:
- Events include original timestamps (preserved during outages)
- Backend accepts events out of chronological order
- Events are sorted by timestamp during metrics calculation
- **Recommended Enhancement**: Implement edge-side event queue with retry logic
```python
# Edge-side pseudo-code
event_queue = []
while True:
    try:
        response = requests.post(API_URL, json=event)
        if response.status_code == 201:
            event_queue.remove(event)
    except ConnectionError:
        event_queue.append(event)  # Store for retry
```

#### 2. **Duplicate Events**
**Problem**: Network retries or multiple camera coverage could create duplicates

**Solution**:
- Composite index on `(timestamp, worker_id, workstation_id, event_type)`
- Duplicate detection before insertion
- If duplicate detected, return existing event (idempotent behavior)
```python
# In backend/app/main.py
existing_event = db.query(Event).filter(
    and_(
        Event.timestamp == event.timestamp,
        Event.worker_id == event.worker_id,
        Event.workstation_id == event.workstation_id,
        Event.event_type == event.event_type
    )
).first()

if existing_event:
    return existing_event  # Idempotent response
```

#### 3. **Out-of-Order Timestamps**
**Problem**: Events arrive in non-chronological order

**Solution**:
- Store events with original timestamps (no server-side timestamp override)
- Sort events by timestamp during metrics computation
- No rejection of "late" events
- Metrics are recalculated on each request to account for new historical data
```python
# In backend/app/metrics.py
events = db.query(Event).filter(
    Event.worker_id == worker.worker_id
).order_by(Event.timestamp).all()  # Always sorted
```

---

## 🤖 ML Ops Considerations

### 1. Model Versioning

**Strategy**: Tag events with model version for tracking
```python
# Enhanced Event Schema
class Event(Base):
    # ... existing fields ...
    model_version = Column(String, default="v1.0.0")
    model_name = Column(String, default="yolov8-worker-detection")
```

**Implementation**:
- Edge cameras include `model_version` in event payload
- Backend stores version with each event
- Analytics can compare metrics across model versions
- A/B testing: Deploy v1 and v2 simultaneously on different cameras

**Rollback Capability**:
```sql
-- Query events by model version
SELECT * FROM events WHERE model_version = 'v1.2.0';

-- Compare metrics between versions
SELECT model_version, AVG(confidence)
FROM events
GROUP BY model_version;
```

### 2. Model Drift Detection

**What is Model Drift?**
- Performance degradation over time
- Changes in camera angles, lighting, worker uniforms
- New behaviors not in training data

**Detection Methods**:

**a) Confidence Score Monitoring**
```python
# Daily confidence score aggregation
def detect_confidence_drift(db: Session, threshold=0.85):
    daily_avg = db.query(
        func.date(Event.timestamp),
        func.avg(Event.confidence)
    ).group_by(func.date(Event.timestamp)).all()

    for date, avg_conf in daily_avg:
        if avg_conf < threshold:
            alert_ops_team(f"Confidence drop on {date}: {avg_conf}")
```

**b) Event Distribution Analysis**
```python
# Monitor event type distribution
expected_distribution = {
    'working': 0.70,
    'idle': 0.20,
    'absent': 0.05,
    'product_count': 0.05
}

def detect_distribution_drift(db: Session):
    current = db.query(
        Event.event_type,
        func.count(Event.id)
    ).group_by(Event.event_type).all()

    # Calculate KL divergence or chi-square test
    # Alert if distribution shifts significantly
```

**c) Human-in-the-Loop Validation**
- Random sampling: 1% of events flagged for manual review
- Store ground truth labels
- Calculate ongoing accuracy metrics

**Dashboard Integration**:
- Display confidence trends over time
- Alert when 7-day rolling average drops below threshold
- Show event type distributions

### 3. Retraining Triggers

**Automated Triggers**:

1. **Confidence Threshold Breach**
   - If average confidence < 85% for 3 consecutive days → trigger retraining

2. **Distribution Shift**
   - If event type distribution deviates >15% from baseline → retrain

3. **Human Validation Accuracy Drop**
   - If sampled validation accuracy < 90% → retrain

4. **Scheduled Retraining**
   - Monthly retraining to capture seasonal/behavioral changes

**Retraining Pipeline**:
```
┌──────────────────┐
│ Drift Detected   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Query Events for │
│ Training Data    │ (Last 30 days with ground truth)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Augment Dataset  │
│ with Hard Cases  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Train New Model  │
│ (GPU Cluster)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Validation on    │
│ Hold-out Set     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ A/B Test on      │
│ 2 Cameras        │ (Compare v_old vs v_new)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Full Deployment  │
│ if Improved      │
└──────────────────┘
```

**Workflow Tools**:
- **MLflow**: Track experiments, model versions, metrics
- **DVC**: Version control for training datasets
- **Kubeflow**: Orchestrate retraining pipelines
- **Airflow**: Schedule periodic retraining jobs

---

## 🚀 Scaling Strategy

### Scenario 1: 5 Cameras → 100+ Cameras

**Challenges**:
- Increased event ingestion rate (5 cameras × 100 = 500× traffic)
- Database write bottlenecks
- Single-server limitations

**Solutions**:

**1. Event Ingestion Optimization**
- **Batch Ingestion**: Accept bulk event uploads
```python
@app.post("/api/events/batch")
def ingest_events_batch(events: List[EventCreate], db: Session):
    # Bulk insert with deduplication
    pass
```

- **Message Queue**: Decouple ingestion from processing
```
Edge Cameras → Kafka/RabbitMQ → Worker Processes → Database
```

- **Load Balancer**: Distribute traffic across multiple backend instances
```
        ┌─── Backend Instance 1
LB ────┼─── Backend Instance 2
        └─── Backend Instance 3
```

**2. Database Scaling**

**Vertical Scaling** (Short-term):
- Migrate from SQLite to **PostgreSQL**
- Add connection pooling
- Optimize indexes

**Horizontal Scaling** (Long-term):
- **Read Replicas**: Separate read (metrics) from write (events) traffic
```
Events API → Master DB (writes)
Metrics API → Replica DB (reads)
```

- **Partitioning**: Partition events table by timestamp
```sql
-- Partition by month
CREATE TABLE events_2026_01 PARTITION OF events
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

**3. Caching**
- **Redis**: Cache computed metrics (TTL: 30s)
```python
@app.get("/api/metrics/factory")
def get_factory_metrics(db: Session):
    cached = redis.get("factory_metrics")
    if cached:
        return json.loads(cached)

    metrics = calculate_factory_metrics(db)
    redis.setex("factory_metrics", 30, json.dumps(metrics))
    return metrics
```

**4. Asynchronous Processing**
- Use **Celery** for background metric computation
- Pre-compute metrics every minute instead of on-demand

### Scenario 2: Single Site → Multi-Site Deployment

**Challenges**:
- Data isolation per factory
- Cross-site analytics
- Network latency between sites

**Solutions**:

**1. Multi-Tenancy Architecture**

**Option A: Shared Database with Site ID**
```python
class Event(Base):
    # ... existing fields ...
    site_id = Column(String, index=True, nullable=False)

# Query with site filtering
events = db.query(Event).filter(Event.site_id == "FACTORY_NY").all()
```

**Option B: Database per Site**
```python
# Dynamic database routing
def get_db(site_id: str):
    engine = create_engine(f"postgresql:///{site_id}_db")
    return SessionLocal(bind=engine)
```

**2. Data Aggregation Layer**
```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Factory A  │   │  Factory B  │   │  Factory C  │
│  Database   │   │  Database   │   │  Database   │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       └─────────────────┴─────────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  Data Warehouse │
                │  (Snowflake)    │
                └─────────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  BI Dashboard   │
                │  (Multi-Site)   │
                └─────────────────┘
```

**3. Edge-to-Cloud Hybrid**
- **Edge**: Local processing and dashboard per factory
- **Cloud**: Centralized analytics and model training
- **Sync**: Periodic data upload to cloud for cross-site insights

**4. Site-Specific Deployment**
```yaml
# docker-compose.factory-ny.yml
services:
  backend:
    environment:
      - SITE_ID=FACTORY_NY
      - DATABASE_URL=postgresql://factory_ny_db
```

### Infrastructure Recommendations

**Small Scale (5-20 cameras)**
- Single VPS (4 CPU, 8GB RAM)
- SQLite or PostgreSQL
- Docker Compose deployment

**Medium Scale (20-100 cameras)**
- Kubernetes cluster (3 nodes)
- PostgreSQL with read replicas
- Redis caching
- Kafka for event streaming

**Large Scale (100+ cameras, multi-site)**
- Managed Kubernetes (AWS EKS, GCP GKE)
- Cloud database (AWS RDS, GCP Cloud SQL)
- Cloud message queue (AWS SQS, GCP Pub/Sub)
- CDN for dashboard static assets
- Multi-region deployment

---

## 🐳 Setup & Deployment

### Prerequisites
- **Docker** (v20.10+)
- **Docker Compose** (v2.0+)
- **Git**

### Local Development Setup

**1. Clone Repository**
```bash
git clone https://github.com/yourusername/worker-productivity-dashboard.git
cd worker-productivity-dashboard
```

**2. Start Services**
```bash
docker-compose up --build
```

**3. Access Application**
- **Frontend Dashboard**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

**4. Seed Database** (Optional)
The database is automatically seeded on first startup. To refresh data:
```bash
curl -X POST http://localhost:8000/api/seed
```

Or use the "Reseed Data" button in the dashboard.

### Production Deployment

**Option 1: Single Server (Docker Compose)**
```bash
# On production server
git clone <repo-url>
cd worker-productivity-dashboard

# Edit environment variables
nano frontend/.env  # Set VITE_API_URL to your domain

# Start services
docker-compose up -d

# Setup nginx reverse proxy
# Configure SSL with Let's Encrypt
```

**Option 2: Kubernetes**
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Verify deployment
kubectl get pods
kubectl get services
```

**Option 3: Cloud Platform (Render, Railway, Fly.io)**
- Connect GitHub repository
- Configure build settings
- Deploy with one click

---

## 📡 API Documentation

### Event Ingestion

**POST /api/events**
```json
{
  "timestamp": "2026-01-15T10:15:00Z",
  "worker_id": "W1",
  "workstation_id": "S3",
  "event_type": "working",
  "confidence": 0.93,
  "count": 1
}
```

**Response**: `201 Created`
```json
{
  "id": 1,
  "timestamp": "2026-01-15T10:15:00Z",
  "worker_id": "W1",
  "workstation_id": "S3",
  "event_type": "working",
  "confidence": 0.93,
  "count": 1,
  "created_at": "2026-01-15T10:15:05Z"
}
```

### Metrics Retrieval

**GET /api/metrics/workers**
```json
[
  {
    "worker_id": "W1",
    "name": "John Smith",
    "total_active_time_minutes": 420.5,
    "total_idle_time_minutes": 59.5,
    "utilization_percentage": 87.6,
    "total_units_produced": 145,
    "units_per_hour": 20.7
  }
]
```

**GET /api/metrics/factory**
```json
{
  "total_productive_time_minutes": 2523.0,
  "total_production_count": 870,
  "average_production_rate": 20.7,
  "average_utilization_percentage": 85.2,
  "total_workers": 6,
  "total_workstations": 6
}
```

### Full API Docs
Visit `/docs` endpoint for interactive Swagger documentation.

---

## 🧪 Testing

**Test Event Ingestion**
```bash
curl -X POST http://localhost:8000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-01-29T10:00:00Z",
    "worker_id": "W1",
    "workstation_id": "S1",
    "event_type": "working",
    "confidence": 0.95,
    "count": 1
  }'
```

**Test Metrics Retrieval**
```bash
curl http://localhost:8000/api/metrics/factory
```

**Test Duplicate Handling**
```bash
# Send same event twice
curl -X POST http://localhost:8000/api/events \
  -H "Content-Type: application/json" \
  -d '{ ... same payload ... }'

# Second request should return existing event (same ID)
```

---

## 🎯 Key Features

✅ **Real-time Monitoring**: Auto-refresh dashboard every 30 seconds
✅ **Duplicate Prevention**: Idempotent event ingestion
✅ **Out-of-Order Handling**: Events processed by timestamp, not arrival order
✅ **Seed Data API**: Evaluators can refresh test data without code changes
✅ **Filtering**: View all metrics, workers only, or workstations only
✅ **Responsive UI**: Works on desktop, tablet, and mobile
✅ **Docker Containerized**: One-command deployment
✅ **API Documentation**: Auto-generated Swagger docs

---

## 🛠️ Technology Stack

**Backend**:
- FastAPI (Python web framework)
- SQLAlchemy (ORM)
- Pydantic (data validation)
- SQLite (database)
- Uvicorn (ASGI server)

**Frontend**:
- React 18
- Vite (build tool)
- TailwindCSS (styling)
- Recharts (visualizations)

**DevOps**:
- Docker & Docker Compose
- Multi-stage builds
- Volume persistence

---

## 📝 Development Notes

### Project Structure
```
worker-productivity-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app & routes
│   │   ├── models.py         # SQLAlchemy models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── database.py       # DB connection
│   │   ├── metrics.py        # Metrics computation
│   │   └── seed_data.py      # Data seeding logic
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── App.jsx           # Main app component
│   │   └── main.jsx          # Entry point
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

### Adding New Metrics

1. **Update Computation Logic** (`backend/app/metrics.py`)
2. **Update Schema** (`backend/app/schemas.py`)
3. **Update Frontend Component** (`frontend/src/components/`)

### Database Migrations

For production, use Alembic:
```bash
pip install alembic
alembic init migrations
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License - feel free to use this project for your own purposes.

---

