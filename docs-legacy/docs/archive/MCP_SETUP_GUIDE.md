# MCP (Model Context Protocol) 설정 가이드

이 문서는 BCL Portal 프로젝트에서 MCP 서버 연동을 설정하는 방법을 설명합니다.

---

## 📋 목차
- [MCP란?](#mcp란)
- [설정 방법](#설정-방법)
- [Stitch API](#stitch-api)
- [보안 주의사항](#보안-주의사항)

---

## MCP란?

**MCP (Model Context Protocol)**는 AI 시스템과 외부 도구 및 데이터 소스를 연결하는 표준 프로토콜입니다.

### BCL Portal에서의 사용
- **Stitch API**: Google의 Stitch 서비스와 통합
- **데이터 연동**: 외부 데이터 소스 접근
- **AI 기능 확장**: LLM 기반 기능 구현

---

## 설정 방법

### 1. MCP 설정 파일 생성

프로젝트 루트에 `mcp.json` 파일을 생성합니다:

```bash
cp mcp.json.example mcp.json
```

### 2. API 키 설정

`mcp.json` 파일을 열고 API 키를 입력합니다:

```json
{
  "mcpServers": {
    "stitch": {
      "serverUrl": "https://stitch.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "YOUR_ACTUAL_API_KEY"
      }
    }
  }
}
```

### 3. 파일 구조

```
portal/
├── mcp.json              # 실제 API 키 (Git 무시됨)
└── mcp.json.example      # 템플릿 (Git에 포함됨)
```

---

## Stitch API

### 개요
Stitch는 Google의 MCP 서버로, 다양한 데이터 소스와 AI 모델을 연결합니다.

### 기능
- **데이터 통합**: 여러 소스의 데이터 병합
- **실시간 처리**: 스트리밍 데이터 처리
- **AI/ML 통합**: 머신러닝 모델 연동

### 엔드포인트
```
https://stitch.googleapis.com/mcp
```

### 헤더 설정
```json
{
  "X-Goog-Api-Key": "YOUR_API_KEY"
}
```

---

## 보안 주의사항

### ⚠️ 중요
1. **API 키 노출 금지**
   - `mcp.json`은 `.gitignore`에 포함됨
   - 절대 Git에 커밋하지 마세요

2. **환경별 설정**
   - 개발: `mcp.json`
   - 프로덕션: 환경 변수 사용 권장

3. **키 관리**
   - 정기적으로 키 로테이션
   - 불필요한 권한 제거

### Git 확인
```bash
# mcp.json이 무시되는지 확인
git status

# mcp.json이 표시되면 안됨
# mcp.json.example만 표시되어야 함
```

---

## 사용 예시

### TypeScript/JavaScript
```typescript
import fs from 'fs';
import path from 'path';

// MCP 설정 로드
const mcpConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'mcp.json'), 'utf-8')
);

// Stitch API 호출
const response = await fetch(mcpConfig.mcpServers.stitch.serverUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...mcpConfig.mcpServers.stitch.headers,
  },
  body: JSON.stringify({
    // 요청 데이터
  }),
});

const data = await response.json();
console.log(data);
```

### 환경 변수 사용 (프로덕션)
```typescript
// .env
MCP_STITCH_API_KEY=your_api_key

// 코드
const apiKey = process.env.MCP_STITCH_API_KEY;
```

---

## 문제 해결

### Q: API 키 오류
**증상**: `401 Unauthorized` 에러

**해결**:
1. API 키가 올바른지 확인
2. 키에 공백이나 특수문자 없는지 확인
3. 키가 활성화되었는지 확인

### Q: mcp.json 파일을 찾을 수 없음
**증상**: `ENOENT: no such file or directory`

**해결**:
```bash
# 템플릿에서 복사
cp mcp.json.example mcp.json

# API 키 입력
vim mcp.json
```

### Q: Git에 mcp.json이 추가됨
**증상**: `git status`에 mcp.json 표시

**해결**:
```bash
# Git 캐시에서 제거
git rm --cached mcp.json

# .gitignore 확인
cat .gitignore | grep mcp.json

# 커밋
git commit -m "chore: remove mcp.json from git"
```

---

## 추가 MCP 서버

### 서버 추가 방법
```json
{
  "mcpServers": {
    "stitch": {
      "serverUrl": "https://stitch.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "YOUR_API_KEY"
      }
    },
    "custom-server": {
      "serverUrl": "https://custom-mcp-server.com",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  }
}
```

---

## 관련 문서
- [Environment Variables Guide](./ENVIRONMENT_VARIABLES_GUIDE.md)
- [Security Guide](./security/README.md)
- [API Specification](./API_SPECIFICATION.md)

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2026년 2월 16일
