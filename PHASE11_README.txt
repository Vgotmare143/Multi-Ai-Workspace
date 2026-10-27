Phase 11 - Conversation Persistence
1. Append backend/app/db/PHASE11_models_append.txt to backend/app/db/models.py (fix imports as noted).
2. In backend/app/main.py add:
     from app.api.v1 import conversations
     app.include_router(conversations.router)
3. cd backend
   alembic revision --autogenerate -m "Add conversation and messages tables"
   alembic upgrade head
   pytest tests/test_conversation_persistence.py -v
(The test needs a `db_session` fixture in tests/conftest.py.)
