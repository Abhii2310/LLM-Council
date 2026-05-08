PYTHON ?= python3
BACKEND_DIR ?= backend
PREDEPLOY_URL ?= http://127.0.0.1:8000

.PHONY: predeploy predeploy-readonly

predeploy:
	cd $(BACKEND_DIR) && $(PYTHON) scripts/predeploy_check.py --base-url $(PREDEPLOY_URL)

predeploy-readonly:
	cd $(BACKEND_DIR) && $(PYTHON) scripts/predeploy_check.py --base-url $(PREDEPLOY_URL) --no-feedback-write
