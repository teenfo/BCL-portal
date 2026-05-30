# Stitch Prompt: Admin Movement Library

**Date**: 2026-05-30
**Session ID**: `10474725662829453547`
**Project ID**: `432557053076320380`
**Target Path**: `/admin/operations/movement-library`

## Prompt

Title: BCL Admin Movement Library Manager
Context: Admin page for managing the movement (exercise) library in the BCL Portal crossfit gym management app. Accessible to admin and coach roles.
Description of the screen: A premium desktop admin page with two-panel master-detail layout. Theme: Deep charcoal background (#0A0A0C) with BCL Orange (#FF6B00) accents, Lexend font, glassmorphism elements with backdrop blur.

Left panel (flex-1, list area):
1. AdminPageHeader at top: category 'OPERATIONS', title 'Movement Library', subtitle 'admin & coach', with orange gradient '+ 운동 추가' action button on the right.
2. Below header: Three KPI stat chips in a row showing: Total count (white), Active count (orange), Inactive count (gray/dimmed). Each chip is a small glassmorphism pill.
3. Filter row: Category tab buttons using .admin-filter-btn class: '전체', '바벨', '체조', '카디오', '덤벨', '케틀벨', '메드볼', '기타기구', '보조운동'. Active tab highlighted in orange. Plus a status dropdown (전체/활성/비활성) and a search input (.admin-search-input) with magnifier icon and 300ms debounce placeholder '동작명 또는 slug 검색...'
4. Movement table with glassmorphism card. Columns: #, Thumbnail (32x32px), 한국어명, 영어명, Category badge (color-coded), Difficulty (orange stars), WOD사용수, Status. Inactive rows opacity-50. Selected row orange border.

Right panel (480px fixed):
Glassmorphism edit panel. Four sections: ① 기본 정보, ② 미디어, ③ 상세 정보, ④ 메타.
Footer: 저장 / 비활성화 / 삭제 (2-step confirm).
