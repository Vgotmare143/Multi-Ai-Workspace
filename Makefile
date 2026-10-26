.PHONY: install dev-frontend test-frontend typecheck

install:
	npm install

dev-frontend:
	npm run dev:frontend

test-frontend:
	npm run test:frontend

typecheck:
	npm run typecheck
