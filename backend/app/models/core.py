"""PNPI / PNPI · Modeles ORM de base (unites, declarations, utilisateurs, notifications, audit)."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class UnitORM(Base):
    __tablename__ = "units"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    sector: Mapped[str] = mapped_column(String(120), nullable=False)
    capacity: Mapped[float] = mapped_column(Float, nullable=False)
    equipment: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")

    declarations: Mapped[list[DeclarationORM]] = relationship(
        back_populates="unit",
        cascade="all, delete-orphan",
        lazy="joined",
    )


class DeclarationORM(Base):
    __tablename__ = "declarations"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    unit_id: Mapped[str] = mapped_column(ForeignKey("units.id"), nullable=False, index=True)
    month: Mapped[date] = mapped_column(Date, nullable=False)
    volume_tons: Mapped[float] = mapped_column(Float, nullable=False)
    jobs: Mapped[int] = mapped_column(nullable=False)
    validated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    submitted_by: Mapped[str] = mapped_column(String(80), nullable=False)

    unit: Mapped[UnitORM] = relationship(back_populates="declarations")


class TraceBatchORM(Base):
    __tablename__ = "trace_batches"

    batch_id: Mapped[str] = mapped_column(String(24), primary_key=True)
    product: Mapped[str] = mapped_column(String(200), nullable=False)
    origin: Mapped[str] = mapped_column(String(200), nullable=False)
    factory: Mapped[str] = mapped_column(String(200), nullable=False)
    certification: Mapped[str] = mapped_column(String(120), nullable=False)
    quantity_tons: Mapped[float] = mapped_column(Float, nullable=False)
    origin_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    origin_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    factory_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    factory_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    qr_code: Mapped[str] = mapped_column(String(255), nullable=False)


class UserAccountORM(Base):
    __tablename__ = "user_accounts"

    username: Mapped[str] = mapped_column(String(80), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    roles_csv: Mapped[str] = mapped_column(String(120), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    failed_login_attempts: Mapped[int] = mapped_column(nullable=False, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    password_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    totp_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)
    totp_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    totp_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    backup_codes_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    province: Mapped[str | None] = mapped_column(String(60), nullable=True, index=True)


class NotificationORM(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    target_role: Mapped[str | None] = mapped_column(String(40), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(String(1000), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="info")
    notification_key: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class FieldReportORM(Base):
    __tablename__ = "field_reports"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    unit_id: Mapped[str | None] = mapped_column(ForeignKey("units.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    comment: Mapped[str] = mapped_column(String(1500), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_by: Mapped[str] = mapped_column(String(80), nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    photo_path: Mapped[str | None] = mapped_column(String(512), nullable=True)

    unit: Mapped[UnitORM | None] = relationship(lazy="joined")


class AuditEventORM(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    actor: Mapped[str] = mapped_column(String(80), nullable=False)
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    target: Mapped[str | None] = mapped_column(String(120), nullable=True)
    details: Mapped[str] = mapped_column(String(1500), nullable=False, default="")


class NotificationPreferenceORM(Base):
    __tablename__ = "notification_preferences"

    username: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), primary_key=True)
    email_ati_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_ati_rejected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_sla_alert: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_inspection: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_weekly_briefing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    push_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class LoginHistoryORM(Base):
    __tablename__ = "login_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    username: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), nullable=False, index=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    method: Mapped[str] = mapped_column(String(20), nullable=False, server_default="password")
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    failure_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RefreshTokenORM(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    username: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    client_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)


class PushSubscriptionORM(Base):
    __tablename__ = "push_subscriptions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    username: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    endpoint: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    p256dh: Mapped[str] = mapped_column(Text, nullable=False)
    auth: Mapped[str] = mapped_column(Text, nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
