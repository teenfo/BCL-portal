# Design Reference Images

이 디렉토리는 Stitch MCP에서 생성된 **디자인 참조 화면의 스크린샷**을 저장합니다.

## 📁 구조

```
design-references/
├── auth/           # 인증 관련 화면 (로그인, 회원가입 등)
├── user-app/       # 사용자 앱 화면
├── admin/          # 관리자 포털 화면
├── display/        # TV/Kiosk 디스플레이 화면
└── coach/          # 코치 앱 화면
```

## 🎯 사용 목적

- ✅ 실제 UI 개발 시 **디자인 참조용**
- ✅ 디자이너-개발자 간 **소통 도구**
- ✅ 디자인 일관성 **검증 자료**
- ❌ 직접 코드로 사용 (HTML 복사 금지)

## 📝 파일 명명 규칙

```
[화면명]-[테마].png

예시:
- login-dark.png
- home-dashboard-light.png
- admin-members-dark.png
```

## 🔗 매핑 문서

각 이미지의 Stitch Screen ID와 용도는 다음 문서 참조:
- [`.docs/stitch-screens-mapping.md`](../stitch-screens-mapping.md)

---

**참고**: Stitch는 모든 화면을 생성하는 도구가 아닙니다.
특수한 디자인 검증이 필요한 경우에만 선택적으로 생성하세요.

**통합 가이드**: [`.antigravity/STITCH_INTEGRATION.md`](../../.antigravity/STITCH_INTEGRATION.md)
