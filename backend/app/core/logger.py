from __future__ import annotations

import logging
import sys
from pythonjsonlogger import jsonlogger
from app.config import settings


def setup_logger() -> logging.Logger:
    logger = logging.getLogger("workspace")
    logger.setLevel(settings.log_level)
    
    # Prevent duplicate logs if initialized multiple times
    if logger.handlers:
        return logger

    handler = logging.StreamHandler(sys.stdout)
    
    if settings.environment == "production":
        formatter = jsonlogger.JsonFormatter(
            fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%SZ"
        )
    else:
        # Clean colored console output for local development
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)-7s | [%(name)s] %(message)s",
            datefmt="%H:%M:%S"
        )
        
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger

logger = setup_logger()
