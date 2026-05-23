import logging
import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import SQLAlchemyError
import bcrypt

from constants import SQLITE_PATH

logger = logging.getLogger(__name__)

# Create database directory if it doesn't exist
os.makedirs(os.path.dirname(SQLITE_PATH) or ".", exist_ok=True)

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="clinician")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Database:
    def __init__(self, db_path=SQLITE_PATH):
        self.db_path = db_path
        self.engine = create_engine(f"sqlite:///{db_path}", echo=False)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self._init_db()

    def _init_db(self):
        """Initialize database tables"""
        try:
            Base.metadata.create_all(self.engine)
            logger.info(f"Database initialized at {self.db_path}")
        except SQLAlchemyError as e:
            logger.error(f"Database initialization failed: {e}")
            raise

    def get_session(self):
        """Get a new database session"""
        return self.SessionLocal()

    def create_user(self, username: str, password: str, role: str = "clinician") -> dict:
        """Create a new user"""
        session = self.get_session()
        try:
            # Hash password with bcrypt
            password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

            user = User(username=username, password_hash=password_hash, role=role)
            session.add(user)
            session.commit()

            result = {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "created_at": user.created_at.isoformat(),
            }
            logger.info(f"User created: {username}")
            return result
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Error creating user: {e}")
            raise
        finally:
            session.close()

    def get_user_by_username(self, username: str) -> dict:
        """Get user by username"""
        session = self.get_session()
        try:
            user = session.query(User).filter_by(username=username).first()
            if user:
                return {
                    "id": user.id,
                    "username": user.username,
                    "password_hash": user.password_hash,
                    "role": user.role,
                    "created_at": user.created_at.isoformat(),
                }
            return None
        except SQLAlchemyError as e:
            logger.error(f"Error getting user: {e}")
            return None
        finally:
            session.close()

    def get_user_by_id(self, user_id: int) -> dict:
        """Get user by ID"""
        session = self.get_session()
        try:
            user = session.query(User).filter_by(id=user_id).first()
            if user:
                return {
                    "id": user.id,
                    "username": user.username,
                    "role": user.role,
                    "created_at": user.created_at.isoformat(),
                }
            return None
        except SQLAlchemyError as e:
            logger.error(f"Error getting user: {e}")
            return None
        finally:
            session.close()

    def verify_password(self, stored_hash: bytes, password: str) -> bool:
        """Verify password against hash"""
        try:
            # Handle both string and bytes
            if isinstance(stored_hash, str):
                stored_hash = stored_hash.encode("utf-8")
            return bcrypt.checkpw(password.encode("utf-8"), stored_hash)
        except Exception as e:
            logger.error(f"Error verifying password: {e}")
            return False

    def user_exists(self, username: str) -> bool:
        """Check if user exists"""
        session = self.get_session()
        try:
            user = session.query(User).filter_by(username=username).first()
            return user is not None
        except SQLAlchemyError as e:
            logger.error(f"Error checking user existence: {e}")
            return False
        finally:
            session.close()


# Initialize global database instance
db = Database()
