#!/usr/bin/env bash
# scripts/generate-all-repos.sh
#
# Batch-stamps the shared Playwright framework into all 196 company repos.
# Reads company data from a CSV file and calls generate-repo.sh for each row.
#
# Usage:
#   ./scripts/generate-all-repos.sh <csv-file> <repos-base-dir>
#
# CSV format (header row required):
#   company_name,site_url,repo_directory
#   "Acme Corp","https://acmecorp.com","acme-corp"
#   "TechSuite","https://techsuite.io","techsuite"
#   ...
#
# Arguments:
#   csv-file        Path to the CSV file with company data
#   repos-base-dir  Base directory containing all company repo folders
#
# Example:
#   ./scripts/generate-all-repos.sh companies.csv /repos/phoenix-companies

set -uo pipefail

# ── Argument validation ──────────────────────────────────────────────────────

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <csv-file> <repos-base-dir>"
  echo "Example: $0 companies.csv /repos/phoenix"
  exit 1
fi

CSV_FILE="$1"
REPOS_BASE_DIR="$2"
FRAMEWORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GENERATE_SCRIPT="$FRAMEWORK_DIR/scripts/generate-repo.sh"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="$FRAMEWORK_DIR/generate-all-repos-$(date '+%Y%m%d-%H%M%S').log"

# ── Validate inputs ──────────────────────────────────────────────────────────

if [[ ! -f "$CSV_FILE" ]]; then
  echo "ERROR: CSV file not found: $CSV_FILE"
  exit 1
fi

if [[ ! -d "$REPOS_BASE_DIR" ]]; then
  echo "ERROR: Repos base directory not found: $REPOS_BASE_DIR"
  exit 1
fi

if [[ ! -f "$GENERATE_SCRIPT" ]]; then
  echo "ERROR: generate-repo.sh not found at: $GENERATE_SCRIPT"
  exit 1
fi

chmod +x "$GENERATE_SCRIPT"

# ── Counters ─────────────────────────────────────────────────────────────────

TOTAL=0
SUCCEEDED=0
FAILED=0
SKIPPED=0
declare -a FAILED_COMPANIES=()
declare -a SKIPPED_COMPANIES=()

# ── Logging helper ────────────────────────────────────────────────────────────

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

log "generate-all-repos: Starting batch generation"
log "generate-all-repos: CSV: $CSV_FILE"
log "generate-all-repos: Repos base: $REPOS_BASE_DIR"
log "generate-all-repos: Log file: $LOG_FILE"
echo ""

# ── Process CSV ──────────────────────────────────────────────────────────────

# Skip header row; handle quoted CSV fields
first_line=true

while IFS=',' read -r raw_name raw_url raw_dir || [[ -n "$raw_name" ]]; do
  # Skip header row
  if $first_line; then
    first_line=false
    continue
  fi

  # Strip surrounding whitespace and quotes
  company_name=$(echo "$raw_name" | tr -d '"' | xargs)
  site_url=$(echo "$raw_url" | tr -d '"' | xargs)
  repo_dir=$(echo "$raw_dir" | tr -d '"' | xargs)

  # Skip blank lines
  if [[ -z "$company_name" && -z "$site_url" ]]; then
    continue
  fi

  TOTAL=$((TOTAL + 1))

  log "--- Processing ($TOTAL): $company_name ---"

  # Validate required fields
  if [[ -z "$company_name" || -z "$site_url" || -z "$repo_dir" ]]; then
    log "WARNING: Missing required fields for row $TOTAL (name='$company_name', url='$site_url', dir='$repo_dir'). Skipping."
    SKIPPED=$((SKIPPED + 1))
    SKIPPED_COMPANIES+=("$company_name (missing fields)")
    continue
  fi

  # Resolve repo path
  repo_path="$REPOS_BASE_DIR/$repo_dir"

  if [[ ! -d "$repo_path" ]]; then
    log "WARNING: Repo directory not found: $repo_path. Skipping '$company_name'."
    SKIPPED=$((SKIPPED + 1))
    SKIPPED_COMPANIES+=("$company_name (repo not found: $repo_path)")
    continue
  fi

  # Call generate-repo.sh
  if bash "$GENERATE_SCRIPT" "$repo_path" "$company_name" "$site_url" >> "$LOG_FILE" 2>&1; then
    log "SUCCESS: $company_name stamped into $repo_path"
    SUCCEEDED=$((SUCCEEDED + 1))
  else
    log "FAILED: $company_name — see log for details: $LOG_FILE"
    FAILED=$((FAILED + 1))
    FAILED_COMPANIES+=("$company_name")
  fi

  echo ""

done < "$CSV_FILE"

# ── Summary report ────────────────────────────────────────────────────────────

echo ""
echo "========================================"
echo " generate-all-repos — Batch Complete"
echo "========================================"
echo " Total companies processed : $TOTAL"
echo " Succeeded                 : $SUCCEEDED"
echo " Failed                    : $FAILED"
echo " Skipped                   : $SKIPPED"
echo "========================================"

if [[ ${#FAILED_COMPANIES[@]} -gt 0 ]]; then
  echo ""
  echo "FAILED:"
  for company in "${FAILED_COMPANIES[@]}"; do
    echo "  - $company"
  done
fi

if [[ ${#SKIPPED_COMPANIES[@]} -gt 0 ]]; then
  echo ""
  echo "SKIPPED:"
  for company in "${SKIPPED_COMPANIES[@]}"; do
    echo "  - $company"
  done
fi

echo ""
echo "Full log: $LOG_FILE"
echo ""

# Exit with error if any failed
if [[ $FAILED -gt 0 ]]; then
  exit 1
fi

exit 0
