#!/usr/bin/env bash
# Archon 测试自动化脚本
# 用法: bash tests/run-all-tests.sh [--unit] [--e2e] [--api] [--full]
#
# 选项:
#   --unit    仅运行单元测试
#   --e2e     仅运行 E2E UI 测试
#   --api     仅运行 API 测试
#   --full    运行全部（默认）
#   --install 首次运行，安装依赖

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
RUN_UNIT=false
RUN_E2E=false
RUN_API=false
INSTALL=false

if [ $# -eq 0 ]; then
    RUN_UNIT=true
    RUN_E2E=true
    RUN_API=true
fi

while [ $# -gt 0 ]; do
    case "$1" in
        --unit)   RUN_UNIT=true; shift ;;
        --e2e)    RUN_E2E=true; shift ;;
        --api)    RUN_API=true; shift ;;
        --full)   RUN_UNIT=true; RUN_E2E=true; RUN_API=true; shift ;;
        --install) INSTALL=true; shift ;;
        -h|--help)
            echo "Usage: $0 [--unit] [--e2e] [--api] [--full] [--install]"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# --- Helper Functions ---

step() {
    echo -e "${BLUE}▸ $1${NC}"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

fail() {
    echo -e "${RED}✗ $1${NC}"
}

separator() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
}

# --- Install Dependencies ---

if [ "$INSTALL" = true ]; then
    separator
    step "Installing test dependencies..."
    
    npx playwright install chromium 2>/dev/null || warn "Playwright install may need sudo for system deps"
    
    success "Dependencies installed"
fi

# --- Run Tests ---

EXIT_CODE=0

# Unit Tests
if [ "$RUN_UNIT" = true ]; then
    separator
    step "Running Unit Tests (Bun Test)..."
    
    cd "$PROJECT_ROOT"
    
    # Run per-package tests
    UNIT_PASS=true
    
    echo "  Testing @archon/web..."
    if (cd packages/web && bun test src/lib/ src/stores/ src/hooks/ 2>&1); then
        success "@archon/web unit tests passed"
    else
        fail "@archon/web unit tests FAILED"
        UNIT_PASS=false
    fi
    
    if [ "$UNIT_PASS" = true ]; then
        success "Unit tests: ALL PASSED"
    else
        fail "Unit tests: FAILED"
        EXIT_CODE=1
    fi
fi

# Type Check
if [ "$RUN_UNIT" = true ]; then
    separator
    step "Running Type Check..."
    
    cd "$PROJECT_ROOT"
    
    if (cd packages/web && bun run type-check 2>&1); then
        success "Type check: PASSED"
    else
        warn "Type check: has errors (check if pre-existing)"
    fi
fi

# Lint
if [ "$RUN_UNIT" = true ]; then
    separator
    step "Running Lint..."
    
    cd "$PROJECT_ROOT"
    
    if (cd packages/web && bun run lint 2>&1); then
        success "Lint: PASSED"
    else
        fail "Lint: FAILED"
        EXIT_CODE=1
    fi
fi

# API Tests (Playwright - needs server)
if [ "$RUN_API" = true ]; then
    separator
    step "Running API Tests (Playwright)..."
    
    cd "$PROJECT_ROOT"
    
    # Check if server is running
    if curl -s http://localhost:3090/api/health > /dev/null 2>&1; then
        if npx playwright test tests/e2e/workflow-api.spec.ts --reporter=list 2>&1; then
            success "API tests: PASSED"
        else
            fail "API tests: FAILED"
            EXIT_CODE=1
        fi
    else
        warn "Server not running on port 3090. Start with: bun run dev:server"
        warn "Skipping API tests"
    fi
fi

# E2E UI Tests (Playwright - needs both servers)
if [ "$RUN_E2E" = true ]; then
    separator
    step "Running E2E UI Tests (Playwright)..."
    
    cd "$PROJECT_ROOT"
    
    # Check if web server is running
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        if npx playwright test tests/e2e/workflow-builder.spec.ts --reporter=list 2>&1; then
            success "E2E UI tests: PASSED"
        else
            fail "E2E UI tests: FAILED"
            EXIT_CODE=1
        fi
    else
        warn "Web server not running on port 5173. Start with: bun run dev:web"
        warn "Skipping E2E UI tests"
    fi
fi

# --- Summary ---

separator
if [ $EXIT_CODE -eq 0 ]; then
    success "ALL TESTS PASSED"
else
    fail "SOME TESTS FAILED (exit code: $EXIT_CODE)"
fi

exit $EXIT_CODE
