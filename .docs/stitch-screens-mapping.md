# BCL Portal - Stitch Screen Mapping

이 문서는 StitchMCP에서 생성된 **디자인 참조 화면**의 ID와 용도를 매핑합니다.

⚠️ **중요**: Stitch는 전체 화면 생성 도구가 아닌 **디자인 참조 생성 도구**입니다.
- 디자인 시스템, 핵심 레이아웃 템플릿만 생성
- 실제 UI 개발은 코드로 구현 (일관성 유지)
- 필요 시에만 새로운 참조 화면 생성

**통합 가이드**: [`.antigravity/STITCH_INTEGRATION.md`](../.antigravity/STITCH_INTEGRATION.md)


---

## 📋 Phase 1: Design System Foundation

### 1-1. Design System (Dark Mode)
- **Screen ID**: `b2ddc51f0287441e9b1fda66e40d038e`
- **Title**: BCL Portal Design Tokens Guide
- **Purpose**: 색상, 타이포그래피, 간격, 컴포넌트, 로고 정의 (다크모드)
- **Reference**: 모든 다크모드 화면에서 참조
- **Screenshot**: [View](https://lh3.googleusercontent.com/aida/AOfcidV76cNxXnE8zEwKezu9ClckidrOEb1tBW4ROsGrgzMERigVjRZHGwfWB0iN_938l2cjjodTodF8kpNpCEJh9sWu_Ge7V0TLTwDnER2EZQsmv3EIQsNFMdQI8HyIs5Ept98FFpzRe0QWDppRUBPNpOkVfWG18A6Gqr5AF-kyFE22QZy5VjMJ5eWUCkyR10r-6e4jj0PgHNIDTN9u707FyK9nAwdumCyfZWvYxTWihs3cNzdvb8bnSsfxAA)

### 1-2. Design System (Light Mode)
- **Screen ID**: `4d1547c666494965bdac8b3a144e24a5`
- **Title**: BCL Portal Light Tokens Guide
- **Purpose**: 색상, 타이포그래피, 간격, 컴포넌트, 로고 정의 (라이트모드)
- **Reference**: 모든 라이트모드 화면에서 참조
- **Screenshot**: [View](https://lh3.googleusercontent.com/aida/AOfcidW8eqNnE-C62pecQkBhG_-CprVpI9cp3WaCVT3_C07nY962bAKH1GLCyJwi83zbHxlWlhDfQEBcuCevSKoiUUyWvaTlENMqyuyUTpJ1dxxLyDH7k2Xnqqr7bewzbq45ypag8J_rMSeQhCUHL0p8xXAGjnt8VkrTw0SjR5oZNI61zI71zPIe7XF1Kn_rtEYdteOgKCsx3WT_MB0yylKPOtOu_pQfXwvP4zAxSefvrFjr6xrM6WORxbx-xw)

### 1-3. **Design Specifications (공식 디자인 시스템)** ⭐
- **Screen ID**: `95b2195d8ffb4e99af97d0da938f24ff`
- **Title**: BCL Portal Design Specifications
- **Purpose**: **공식 디자인 시스템 - 모든 UI 개발 시 필수 참조**
- **Device**: MOBILE (780x4368)
- **Reference**: 색상, 타이포그래피, 컴포넌트, 간격, 그림자, 애니메이션 등 모든 디자인 요소 정의
- **Screenshot**: [View](https://lh3.googleusercontent.com/aida/AOfcidVwih63roj86ClbGe12IOFrCSBJJ-GzohWrGS72_8O_lQf0AT8kTdgL6sveHwM1hMfkv7vF1XoYyMRWEErZeyxBvvvD8oXWKBltWKMQdC9laZC9SDjoXczrhU7vGXH4hzRHHj2wQiroOK-ZekCLLMtmDBlAaNrh79BTv-H1GJ1z3WjPuOCA8k0QZX1wh2FFV_Q2pCrf9DQWhEB8YhdeZ2bfDOvE8bWikOpCgwOBtWsYUm8rpqjhLSpVEg)
- **HTML Code**: [Download](https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sX2VmNmE5NGNiOGQzMzRmODViYTg1NzE0YTlmZGZkZmViEgsSBxCR3fCnzAoYAZIBIgoKcHJvamVjdF9pZBIUQhI0MzI1NTcwNTMwNzYzMjAzODA&filename=&opi=89354086)
- **사용 용도**:
  - ✅ CSS 변수 정의 시 참조
  - ✅ 컴포넌트 스타일링 가이드
  - ✅ 디자인 토큰 추출
  - ✅ 개발-디자인 간 소통 도구



---

## 📐 Phase 2: Layout Templates

### 2-1. Mobile Bottom Tab Layout (Dark)
- **Screen ID**: `d97f6e555b434791906bb1203c9b48f6`
- **Title**: BCL Portal Mobile App Template
- **Device**: MOBILE
- **Purpose**: User/Coach 앱의 기본 레이아웃 (다크모드)
- **Usage**: Home, Schedule, Check-in, Facilities, Profile 등
- **Screenshot**: [View](https://lh3.googleusercontent.com/aida/AOfcidUeOYef5BUWbpJaYa-yScldHW9PDR_75ZvovteIM98y72c8QP35h58vcMNtaMmZOOh8-xDUILJmm_ZPMVqs4n6w39jDPnmvPDNHTBHiBxzRCdEdBFIDRWS41tmzQmFKX8UZdnxOQXVyxnReCqWUvAmYQEC80HNWRMlhp-PyarJttmW-BipMC2QBPetTs6whf9LCoxV18d9Lbx3Bby17QFXd9HChWp7ZOuc7UkuPrTEt2AbfXkSgNIdO0w)

### 2-2. Mobile Bottom Tab Layout (Light)
- **Screen ID**: `a524634378564466874b668ad75385a2`
- **Title**: BCL Portal Light App Template
- **Device**: MOBILE
- **Purpose**: User/Coach 앱의 기본 레이아웃 (라이트모드)
- **Screenshot**: [View](https://lh3.googleusercontent.com/aida/AOfcidW3H-ZlevGTS9pNSiTgESFY2WvKyW4YHrY6-HRbJZj3kH-5A0d9jzn5cKV1a33AVcO6_JCaFGwLXjywhSFew15V1_UD2aq8GFHD7ugYTGgwNtnRWkp7gQApErBkSjEhY6dG2D5YZIoI4rA6slLM24ArX5gqyjrcuFGgjJztmdflmOag9ML1RIpFQLZDS58CQ9EvsrY76w56JiYPobTvRHHvSM6Bw_JUfbO9JiTpM1K3u5D7fSd3vEUBIQ)

### 2-3. Desktop Sidebar Layout (Dark)
- **Screen ID**: `59fa62844a9449459c2678c734be4d1a`
- **Title**: BCL Admin Portal Dark Template
- **Device**: DESKTOP
- **Purpose**: 관리자 포털의 기본 레이아웃 (다크모드)
- **Usage**: Dashboard, Members, Schedule, Bookings, Finance 등
- **Screenshot**: [View](https://lh3.googleusercontent.com/aida/AOfcidVUqCpbwQXikEyPWWY75cdCFf1ufAODuhU5FLG77HBheMJ0fmc9vpBDlo_Hqk_XffD5cDwW3vZ5CKZ0RF8z3x9E5h3aCYfXE6duAk9bTg60fpCcAiXrk4bvZ4QZikgfb6d_9fzfeUft0K3L2jPooWz5XoKhnNA5_zJPXqrMXJGrgyibHzoWtua_6DXNct1mlQDYnsx6K46YGW4WUVtRPS_I0vIW2FD0jP8HkBSKcuxersHq7HqfoWR0mA)

### 2-4. Desktop Sidebar Layout (Light)
- **Screen ID**: `1c7255e315ad4ee4a29e6b2113ca47f1`
- **Title**: BCL Admin Portal Light Template
- **Device**: DESKTOP
- **Purpose**: 관리자 포털의 기본 레이아웃 (라이트모드)
- **Screenshot**: [View](https://lh3.googleusercontent.com/aida/AOfcidWYGuY1XD-m3cKeWrWvWP9oMNeOBnrWhB_METcjxmiL4HRoghPkpFXSY194MowtoVCjIe9JzwVA7s2VTmxjiKXvTe2qdMuP36V-hRIl_Vstowfg4swLmgDwnT-5i5VObY7_gOkmTtvWDSvn7Up_2wCrzRXy-kIxy2CaaMXyjWryQb-Tpu8UFXVE6XPGFTvf61hzC9tojP-gmrulDfr6YGyxgRFJ2TofDZZEd98o-6alVu-YrYRo9pNX)

### 2-5. Auth Centered Card Layout (Dark)
- **Screen ID**: `f135d9e6a7c346a69bb25aac647f67f8`
- **Title**: BCL Auth Layout Dark Template
- **Device**: MOBILE
- **Purpose**: 인증 화면의 기본 레이아웃 (다크모드)
- **Usage**: Login, Signup, Password Reset, Email Verify
- **Screenshot**: [View](https://lh3.googleusercontent.com/aida/AOfcidXIDQ5_PmKK3p8oBa8AVRq0o7V_43lv0GlrxKBX1VIY57uMRwKlH2iC6zDYBtuBkXBJTaJCBTsd7w5toGdUDm_JRbqrBOuBOBuAkJ2-FrsG-OA9XTRs4_3FA2SXQhWq625PxueKdFrlrmbkESJtZVwHVqRXI23a0TsroIubFg1ZvtlrQlbfGBTFvMP0uIKO SwkyM2GPg8Ne8fidwwHhX_J-UTZQktY-yDyZYJC4G_N7e3ZY0Rxc74EO)

### 2-6. Auth Centered Card Layout (Light)
- **Screen ID**: `99ebe63934c34d8cb4973f9547bf8de7`
- **Title**: BCL Auth Layout Light Template
- **Device**: MOBILE
- **Purpose**: 인증 화면의 기본 레이아웃 (라이트모드)
- **Screenshot**: [View](https://lh3.googleusercontent.com/aida/AOfcidXZ0kn1r0brj6vPoZcw2Aab9PyUQAVL5k_82ZjdpoVJ6V_x2dlRdBa6B4Re_FmUR5MLsauR9TSAeU6euXcfvTjiMazc_vFPWaG3QVpXswyBFyY1Wkrx7O-DZuQ4FQwqfGvwFhO8DTEFXqVjVOILAEMFRxAkOi1fooessQ0-778fCwRT6KH9tu22TDyD5YBe5k_u6ovExQjsmw250XudPuYJD2sucCO8gZEbONg7uPnIy73yb2DlZxUGtA)

### 2-7. Fullscreen Display Layout (Dark)
- **Screen ID**: `a5902b8e809644f08fcb79e62d4157e5`
- **Title**: BCL Fullscreen Display Template
- **Device**: DESKTOP/TABLET
- **Purpose**: TV/Kiosk 화면의 기본 레이아웃 (다크모드)
- **Usage**: Leaderboard, Timer, WOD Board, Kiosk
- **Screenshot**: [View](https://lh3.googleusercontent.com/aida/AOfcidUWybuPmMMP7EXsoAqVaEuNX95tQiJ1IJpNfeb9YOS4HA-BqV0_mSJk5eAaXEohvMoB8QbyENV1Ay9lBPxomsvAa9I5dCu6ANrhjzR19t2xrFsxQB8hLM0RbbvNUUX_byZXJt-aYoj1k9MQpdKzHqFo3Wh1ecYF7PfYwlY8WbgzrRZPXaQyMMeIOLQsJXESChh9atXDRthUyR9jsqm5siIubWagmSSgBvofK0Of0T9kgyVG12qQFzFH9w)

### 2-8. Fullscreen Display Layout (Light)
- **Screen ID**: `a51e1c4e97af41a6ad3aa664a9102d49`
- **Title**: BCL Light Fullscreen Template
- **Device**: DESKTOP/TABLET
- **Purpose**: TV/Kiosk 화면의 기본 레이아웃 (라이트모드)
- **Screenshot**: [View](https://lh3.googleusercontent.com/aida/AOfcidWHkHThrdqlx3wuPheL-9ESulhXfPV-KG-HCQ7OrMDFnqVY514Ko1cQxpHTaiGtW3tOFmRiYkI1eJbVs6WIH5LxA95tRQlYNons2KP5LH5A6jSitlXbdRSf-uAU2G2g0z6_lf579HkmLMFsXnip9LrFu1bNd39fdwNypMaytpJgNVBGGahQan_83gsovJg4bNqgQV87KAbMvMdF2rj8m-W-F7o3FOivmn4vjzl2F9_k2MMwbqWcjwEekA)


---

## 🎯 Phase 3: Content Screens (미정)

_Phase 2 완료 후 각 템플릿 기반으로 실제 화면 생성_

---

## 📊 생성 현황

- ✅ Phase 1: Design Systems (2/2) - **완료**
- ✅ Phase 2: Layout Templates (8/8) - **완료**
- ⏳ Phase 3: Content Screens (0/TBD)

**Total**: 10/10 foundation screens (100%)
**Next Step**: Phase 3 - 레이아웃 기반 실제 화면 생성


---

**최종 업데이트**: 2026-02-17 00:46 KST
