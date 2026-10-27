from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB, BYTEA
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String)
    preferences: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    workspaces: Mapped[List["Workspace"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    ai_accounts: Mapped[List["AIAccount"]] = relationship(back_populates="user", cascade="all, delete-orphan")

class Workspace(Base):
    __tablename__ = "workspaces"
    
    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    settings: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    owner: Mapped["User"] = relationship(back_populates="workspaces")
    projects: Mapped[List["Project"]] = relationship(back_populates="workspace", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"
    
    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    root_path: Mapped[str] = mapped_column(String, unique=True, index=True)
    git_branch: Mapped[str] = mapped_column(String, default="main")
    
    # Active AI Context
    active_provider_slug: Mapped[str] = mapped_column(String, default="claude")
    active_account_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("ai_accounts.id"), nullable=True)
    
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    workspace: Mapped["Workspace"] = relationship(back_populates="projects")
    conversations: Mapped[List["Conversation"]] = relationship(back_populates="project", cascade="all, delete-orphan")

class AIAccount(Base):
    __tablename__ = "ai_accounts"
    
    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    provider_slug: Mapped[str] = mapped_column(String, index=True) # claude, openai, gemini
    account_label: Mapped[str] = mapped_column(String) # e.g., "Claude Account A"
    connection_mode: Mapped[str] = mapped_column(String, default="mock") # mock, web_bridge, api_key
    
    # AES-GCM Encrypted Credentials (Never exposed to UI)
    encrypted_credentials: Mapped[Optional[bytes]] = mapped_column(BYTEA, nullable=True)
    
    priority_order: Mapped[int] = mapped_column(Integer, default=1)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="ai_accounts")

class Conversation(Base):
    __tablename__ = "conversations"
    
    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String)
    
    # Layer B: Structured State (Goal, Task, Pending Work, Modified Files)
    structured_state: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    project: Mapped["Project"] = relationship(back_populates="conversations")
    messages: Mapped[List["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")
    handoffs: Mapped[List["Handoff"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    
    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id"), index=True)
    
    role: Mapped[str] = mapped_column(String) # user, assistant, system, tool
    content: Mapped[str] = mapped_column(Text)
    
    # Context injected during this specific turn (files, errors, diffs)
    context_snapshot: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    
    token_count_input: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    token_count_output: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")

class Handoff(Base):
    """Records the deterministic transition between AI providers or Claude accounts."""
    __tablename__ = "handoffs"
    
    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id"), index=True)
    
    from_provider: Mapped[str] = mapped_column(String)
    from_account_label: Mapped[str] = mapped_column(String)
    to_provider: Mapped[str] = mapped_column(String)
    to_account_label: Mapped[str] = mapped_column(String)
    
    trigger_reason: Mapped[str] = mapped_column(String) # manual_switch, limit_reached, fallback
    markdown_artifact_path: Mapped[str] = mapped_column(String) # e.g., handoffs/claude-session-001.md
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    conversation: Mapped["Conversation"] = relationship(back_populates="handoffs")
