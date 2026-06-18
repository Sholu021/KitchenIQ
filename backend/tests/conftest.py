import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.core.deps import get_db
from app.core.security import get_password_hash
from app.main import app
from app.models.models import Organization, User

# Setup in-memory SQLite for isolated test runs
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Clean tables
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def seed_test_data(db):
    # 1. Create Organization A & B
    org_a = Organization(name="Organization A")
    org_b = Organization(name="Organization B")
    db.add_all([org_a, org_b])
    db.flush()

    hashed_pw = get_password_hash("testpass")
    
    # 2. Org A Users
    owner_a = User(
        organization_id=org_a.id,
        full_name="Owner A",
        email="owner_a@test.com",
        hashed_password=hashed_pw,
        role="Owner",
        is_active=True
    )
    manager_a = User(
        organization_id=org_a.id,
        full_name="Manager A",
        email="manager_a@test.com",
        hashed_password=hashed_pw,
        role="Manager",
        is_active=True
    )
    staff_a = User(
        organization_id=org_a.id,
        full_name="Staff A",
        email="staff_a@test.com",
        hashed_password=hashed_pw,
        role="Staff",
        is_active=True
    )

    # 3. Org B User
    owner_b = User(
        organization_id=org_b.id,
        full_name="Owner B",
        email="owner_b@test.com",
        hashed_password=hashed_pw,
        role="Owner",
        is_active=True
    )

    db.add_all([owner_a, manager_a, staff_a, owner_b])
    db.commit()

    return {
        "org_a_id": org_a.id,
        "org_b_id": org_b.id,
        "owner_a": owner_a,
        "manager_a": manager_a,
        "staff_a": staff_a,
        "owner_b": owner_b
    }
