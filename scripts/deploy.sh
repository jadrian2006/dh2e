#!/usr/bin/env bash
# Deploy DH2E system + all data modules to Foundry Docker host
# Usage: ./scripts/deploy.sh [--skip-build] [--system-only]
set -euo pipefail

REMOTE="192.168.100.12"
HOST_BASE="/home/netadmin/foundry/dh2e/Data"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SKIP_BUILD=false
SYSTEM_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    --system-only) SYSTEM_ONLY=true ;;
  esac
done

echo "=== DH2E Deploy ==="

# 1. Build
if [ "$SKIP_BUILD" = false ]; then
  echo "→ Building..."
  (cd "$PROJECT_DIR" && pnpm run build 2>&1 | tail -1)
else
  echo "→ Skipping build"
fi

# 2. Stop Foundry
echo "→ Stopping Foundry..."
ssh "$REMOTE" "cd /home/netadmin/foundry && docker compose stop dh2e" 2>&1 | grep -v "level=warning" || true

# 3. Deploy system
echo "→ Deploying system..."
tar -cf - -C "$PROJECT_DIR/dist/dh2e" . | ssh "$REMOTE" "tar -xf - -C $HOST_BASE/systems/dh2e/"

if [ "$SYSTEM_ONLY" = false ]; then
  # 4. Deploy data module packs
  MODULES=("dh2e-data" "dh2e-enemies-within" "dh2e-enemies-without" "dh2e-enemies-beyond" "dh2e-dark-pursuits")
  for mod in "${MODULES[@]}"; do
    mod_dir="$PROJECT_DIR/$mod"
    [ -d "$mod_dir/packs" ] || continue
    echo "→ Deploying $mod packs..."
    for pack_dir in "$mod_dir"/packs/*/; do
      [ -d "$pack_dir" ] || continue
      name=$(basename "$pack_dir")
      ssh "$REMOTE" "rm -rf $HOST_BASE/modules/$mod/packs/$name && mkdir -p $HOST_BASE/modules/$mod/packs/$name"
      tar -cf - -C "$pack_dir" . | ssh "$REMOTE" "tar -xf - -C $HOST_BASE/modules/$mod/packs/$name/"
    done
    # Deploy data dir if present
    if [ -d "$mod_dir/data" ]; then
      echo "→ Deploying $mod data..."
      for sub in "$mod_dir"/data/*/; do
        [ -d "$sub" ] || continue
        subname=$(basename "$sub")
        ssh "$REMOTE" "mkdir -p $HOST_BASE/modules/$mod/data/$subname"
        tar -cf - -C "$sub" . | ssh "$REMOTE" "tar -xf - -C $HOST_BASE/modules/$mod/data/$subname/"
      done
    fi
  done
fi

# 5. Remove lock + start
echo "→ Removing lock & starting Foundry..."
ssh "$REMOTE" "rm -rf /home/netadmin/foundry/dh2e/Config/options.json.lock"
ssh "$REMOTE" "cd /home/netadmin/foundry && docker compose start dh2e" 2>&1 | grep -v "level=warning" || true

# 6. Verify
sleep 5
STATUS=$(ssh "$REMOTE" "docker ps --filter name=foundry-dh2e-1 --format '{{.Status}}'")
echo "→ Container: $STATUS"
echo "=== Deploy complete ==="
