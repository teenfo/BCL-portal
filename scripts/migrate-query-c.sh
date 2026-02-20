#!/bin/bash
# Phase 3: Group C — admin 파일들 (const supabase = createClient(), no auth)

GROUP_C=(
  "src/app/admin/checkins/page.tsx"
  "src/app/admin/crm/content/page.tsx"
  "src/app/admin/crm/feedback/page.tsx"
  "src/app/admin/crm/notifications/page.tsx"
  "src/app/admin/crm/support/page.tsx"
  "src/app/admin/dashboard/page.tsx"
  "src/app/admin/insights/attendance/page.tsx"
  "src/app/admin/insights/feedback/page.tsx"
  "src/app/admin/insights/finance/page.tsx"
  "src/app/admin/members/[id]/page.tsx"
  "src/app/admin/members/page.tsx"
  "src/app/admin/operations/badges/page.tsx"
  "src/app/admin/operations/coaches/page.tsx"
  "src/app/admin/operations/infrastructure/page.tsx"
  "src/app/admin/operations/lockers/page.tsx"
  "src/app/admin/operations/race/page.tsx"
  "src/app/admin/operations/reservations/page.tsx"
  "src/app/admin/operations/roles/page.tsx"
  "src/app/admin/operations/schedule/page.tsx"
  "src/app/admin/plans/page.tsx"
  "src/app/admin/setup/audit/page.tsx"
  "src/app/admin/setup/branch/page.tsx"
  "src/app/admin/setup/system/PGSettings.tsx"
  "src/app/admin/setup/system/page.tsx"
  "src/app/admin/transactions/page.tsx"
)

for f in "${GROUP_C[@]}"; do
  echo "Processing: $f"
  
  # Check auth usage
  AUTH_COUNT=$(grep -c "supabase\.auth" "$f" 2>/dev/null || echo "0")
  
  # 1. query import 추가
  if grep -q "from '@/lib/supabase/client'" "$f"; then
    if ! grep -q "from '@/lib/supabase/query'" "$f"; then
      sed -i '' "/from '@\/lib\/supabase\/client'/a\\
import { query, rpc } from '@\/lib\/supabase\/query';
" "$f"
    fi
  fi
  
  # 2. supabase.from → query
  sed -i '' "s/supabase\.from('/query('/g" "$f"
  
  # 3. supabase.rpc → rpc
  sed -i '' "s/supabase\.rpc(/rpc(/g" "$f"
  
  # 4. auth 호출이 없으면 supabase 변수 라인 삭제
  if [ "$AUTH_COUNT" = "0" ]; then
    sed -i '' '/const supabase = createClient();/d' "$f"
  fi
  
done

echo ""
echo "=== Group C 처리 완료 ==="
echo "처리된 파일 수: ${#GROUP_C[@]}"
