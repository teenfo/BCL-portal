#!/bin/bash
# Phase 3: Group B — auth 호출이 있는 파일
# supabase.from() → query(), supabase.auth 유지

GROUP_B=(
  "src/app/apps/schedule/page.tsx"
  "src/app/apps/leaderboard/page.tsx"
  "src/app/apps/feedback/page.tsx"
  "src/app/apps/dashboard/page.tsx"
  "src/app/apps/profile/support/page.tsx"
  "src/app/apps/profile/page.tsx"
  "src/app/apps/purchase/page.tsx"
  "src/app/apps/checkin/page.tsx"
)

for f in "${GROUP_B[@]}"; do
  echo "Processing: $f"
  
  # 1. query import 추가
  if grep -q "from '@/lib/supabase/client'" "$f"; then
    if ! grep -q "from '@/lib/supabase/query'" "$f"; then
      sed -i '' "/from '@\/lib\/supabase\/client'/a\\
import { query, rpc } from '@\/lib\/supabase\/query';
" "$f"
    fi
  fi
  
  # 2. `const supabase: any = createClient();` → `const supabase = createClient();`
  # (auth 호출 유지를 위해 supabase 변수는 남기되, : any 제거)
  sed -i '' 's/const supabase: any = createClient();/const supabase = createClient();/g' "$f"
  
  # 3. `supabase.from('xxx')` → `query('xxx')`
  # (supabase.auth는 건드리지 않음)
  sed -i '' "s/supabase\.from('/query('/g" "$f"
  
  # 4. `supabase.rpc(` → `rpc(`
  sed -i '' "s/supabase\.rpc(/rpc(/g" "$f"
  
done

echo ""
echo "=== Group B 처리 완료 ==="
echo "처리된 파일 수: ${#GROUP_B[@]}"
