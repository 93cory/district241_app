"""PNPI — Sauvegarde automatisee PostgreSQL vers S3/MinIO.

Usage:
  python scripts/backup_s3.py backup
  python scripts/backup_s3.py list
  python scripts/backup_s3.py restore <filename>

Environment variables:
  PNPI_DATABASE_URL  — PostgreSQL connection string
  PNPI_S3_ENDPOINT   — S3/MinIO endpoint (e.g., https://minio.pnpi-gabon.ga)
  PNPI_S3_BUCKET     — Bucket name (default: pnpi-backups)
  PNPI_S3_ACCESS_KEY — S3 access key
  PNPI_S3_SECRET_KEY — S3 secret key
  PNPI_S3_REGION     — S3 region (default: us-east-1)
  PNPI_BACKUP_RETAIN_DAYS — Days to retain backups (default: 30)
"""
import sys
import os
import subprocess
import gzip
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("pnpi.backup")

try:
    import boto3
    from botocore.config import Config as BotoConfig
except ImportError:
    logger.error("boto3 is required: pip install boto3")
    sys.exit(1)


def get_s3_client():
    endpoint = os.environ.get("PNPI_S3_ENDPOINT", "")
    region = os.environ.get("PNPI_S3_REGION", "us-east-1")
    access_key = os.environ.get("PNPI_S3_ACCESS_KEY", "")
    secret_key = os.environ.get("PNPI_S3_SECRET_KEY", "")

    if not all([endpoint, access_key, secret_key]):
        logger.error("Missing S3 env vars: PNPI_S3_ENDPOINT, PNPI_S3_ACCESS_KEY, PNPI_S3_SECRET_KEY")
        sys.exit(1)

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        region_name=region,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=BotoConfig(signature_version="s3v4"),
    )


def get_bucket():
    return os.environ.get("PNPI_S3_BUCKET", "pnpi-backups")


def parse_db_url():
    url = os.environ.get("PNPI_DATABASE_URL", "")
    if not url:
        logger.error("PNPI_DATABASE_URL is required.")
        sys.exit(1)
    parsed = urlparse(url)
    return {
        "host": parsed.hostname or "localhost",
        "port": str(parsed.port or 5432),
        "user": parsed.username or "pnpi_user",
        "password": parsed.password or "",
        "dbname": parsed.path.lstrip("/") or "pnpi",
    }


def task_backup():
    """Create a compressed PostgreSQL dump and upload to S3."""
    db = parse_db_url()
    now = datetime.now(timezone.utc)
    filename = f"pnpi_{now.strftime('%Y%m%d_%H%M%S')}.sql.gz"
    local_path = f"/tmp/{filename}"

    logger.info(f"Dumping database {db['dbname']}...")

    env = os.environ.copy()
    env["PGPASSWORD"] = db["password"]

    dump_cmd = [
        "pg_dump",
        "-h", db["host"],
        "-p", db["port"],
        "-U", db["user"],
        "-Fc",  # Custom format (compressed)
        db["dbname"],
    ]

    try:
        result = subprocess.run(dump_cmd, capture_output=True, env=env, timeout=600)
        if result.returncode != 0:
            logger.error(f"pg_dump failed: {result.stderr.decode()}")
            sys.exit(1)

        # Gzip the output
        with gzip.open(local_path, "wb") as f:
            f.write(result.stdout)

        size_mb = os.path.getsize(local_path) / (1024 * 1024)
        logger.info(f"Dump complete: {filename} ({size_mb:.1f} MB)")
    except subprocess.TimeoutExpired:
        logger.error("pg_dump timed out after 600s")
        sys.exit(1)

    # Upload to S3
    logger.info(f"Uploading to S3: {get_bucket()}/{filename}...")
    s3 = get_s3_client()
    bucket = get_bucket()

    # Ensure bucket exists
    try:
        s3.head_bucket(Bucket=bucket)
    except Exception:
        logger.info(f"Creating bucket: {bucket}")
        s3.create_bucket(Bucket=bucket)

    s3.upload_file(
        local_path, bucket, filename,
        ExtraArgs={"ContentType": "application/gzip"},
    )
    logger.info(f"Upload complete: s3://{bucket}/{filename}")

    # Cleanup local file
    os.remove(local_path)

    # Retention policy
    retain_days = int(os.environ.get("PNPI_BACKUP_RETAIN_DAYS", "30"))
    cutoff = now - timedelta(days=retain_days)

    response = s3.list_objects_v2(Bucket=bucket, Prefix="pnpi_")
    if "Contents" in response:
        for obj in response["Contents"]:
            if obj["LastModified"].replace(tzinfo=timezone.utc) < cutoff:
                s3.delete_object(Bucket=bucket, Key=obj["Key"])
                logger.info(f"Deleted expired backup: {obj['Key']}")

    logger.info("Backup complete with retention policy applied.")


def task_list():
    """List available backups."""
    s3 = get_s3_client()
    bucket = get_bucket()

    response = s3.list_objects_v2(Bucket=bucket, Prefix="pnpi_")
    if "Contents" not in response:
        logger.info("No backups found.")
        return

    backups = sorted(response["Contents"], key=lambda x: x["LastModified"], reverse=True)
    logger.info(f"Found {len(backups)} backup(s):")
    for obj in backups:
        size_mb = obj["Size"] / (1024 * 1024)
        date = obj["LastModified"].strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"  {obj['Key']}  ({size_mb:.1f} MB)  {date}")


def task_restore(filename: str):
    """Download and restore a backup."""
    db = parse_db_url()
    s3 = get_s3_client()
    bucket = get_bucket()
    local_path = f"/tmp/{filename}"

    logger.info(f"Downloading s3://{bucket}/{filename}...")
    s3.download_file(bucket, filename, local_path)

    logger.info(f"Restoring database {db['dbname']}...")
    env = os.environ.copy()
    env["PGPASSWORD"] = db["password"]

    # Decompress if gzipped
    if filename.endswith(".gz"):
        import tempfile
        with gzip.open(local_path, "rb") as gz:
            dump_data = gz.read()
        tmp = tempfile.NamedTemporaryFile(suffix=".dump", delete=False)
        tmp.write(dump_data)
        tmp.close()
        restore_path = tmp.name
    else:
        restore_path = local_path

    restore_cmd = [
        "pg_restore",
        "-h", db["host"],
        "-p", db["port"],
        "-U", db["user"],
        "-d", db["dbname"],
        "--clean",
        "--if-exists",
        restore_path,
    ]

    result = subprocess.run(restore_cmd, capture_output=True, env=env, timeout=600)
    if result.returncode != 0:
        logger.warning(f"pg_restore warnings: {result.stderr.decode()[:500]}")
    else:
        logger.info("Restore complete.")

    # Cleanup
    os.remove(local_path)
    if filename.endswith(".gz") and restore_path != local_path:
        os.remove(restore_path)


TASKS = {
    "backup": lambda: task_backup(),
    "list": lambda: task_list(),
}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: python {sys.argv[0]} <backup|list|restore <filename>>")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "restore":
        if len(sys.argv) < 3:
            print("Usage: python backup_s3.py restore <filename>")
            sys.exit(1)
        task_restore(sys.argv[2])
    elif cmd in TASKS:
        TASKS[cmd]()
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
