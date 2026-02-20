#!/bin/bash
# Phase 3: as any → query() 헬퍼 일괄 전환 스크립트
# Group A: auth 호출 없는 파일 — supabase 변수 완전 제거, query() 사용

GROUP_A=(
  "src/app/admin/memberships/page.tsx"
  "src/app/coach/schedule/page.tsx"
  "src/app/coach/dashboard/page.tsx"
  "src/app/coach/profile/page.tsx"
  "src/app/coach/layout.tsx"
  "src/app/coach/race/page.tsx"
  "src/app/coach/members/page.tsx"
  "src/app/class/wod/page.tsx"
  "src/app/class/leaderboard/page.tsx"
  "src/app/class/live/page.tsx"
  "src/app/kiosk/success/page.tsx"
  "src/app/kiosk/scan/page.tsx"
  "src/app/apps/coaches/page.tsx"
  "src/app/apps/profile/settings/page.tsx"
)

for f in "${GROUP_A[@]}"; do
  echo "Processing: $f"
  
  # 1. import 추가 (createClient import 라인 다음에)
  # 기존 createClient import가 있으면 query import를 추가
  if grep -q "from '@/lib/supabase/client'" "$f"; then
    # query import가 없으면 추가
    if ! grep -q "from '@/lib/supabase/query'" "$f"; then
      sed -i '' "/from '@\/lib\/supabase\/client'/a\\
import { query, rpc } from '@\/lib\/supabase\/query';
" "$f"
    fi
  fi
  
  # 2. `const supabase: any = createClient();` → 제거 (완전히 삭제)
  sed -i '' '/const supabase: any = createClient();/d' "$f"
  
  # 3. `supabase.from('xxx')` → `query('xxx')`
  sed -i '' "s/supabase\.from('/query('/g" "$f"
  
  # 4. `supabase.rpc(` → `rpc(`
  sed -i '' "s/supabase\.rpc(/rpc(/g" "$f"
  
  # 5. 사용하지 않는 createClient import 제거 (다른 용도가 없으면)
  # supabase 변수가 더 이상 없으면 createClient import도 불필요
  if ! grep -q "createClient" "$f" || ! grep -q "supabase" "$f"; then
    # createClient만 import하고 다른 용도가 없으면 라인 제거
    :
  fi
  
done

echo ""
echo "=== Group A 처리 완료 ==="
echo "처리된 파일 수: ${#GROUP_A[@]}"
