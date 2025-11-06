#!/bin/bash
# pgTAP Test Runner
# Executes pgTAP tests and formats output

set -e

echo "========================================="
echo "Running pgTAP RLS Policy Tests"
echo "========================================="
echo ""

# Run the pgTAP tests via Supabase CLI
npx supabase test db supabase/tests/rls-policies.test.pgtap.sql --linked

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "========================================="
  echo "✓ All pgTAP tests passed"
  echo "========================================="
else
  echo ""
  echo "========================================="
  echo "✗ Some pgTAP tests failed"
  echo "========================================="
  exit $EXIT_CODE
fi
