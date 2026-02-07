# Database Connection Troubleshooting Guide

## 개요
본 문서는 BCL Portal 개발 및 배포 과정에서 발생할 수 있는 데이터베이스(Supabase) 연결 관련 이슈와 그에 대한 해결 방법을 정리한다.

## 1. 환경 변수 (Environment Variables)
### 이슈: `Supabase URL or Anon Key is missing` 경고 발생
- **원인**: `.env.local` 파일이 없거나, 변수명이 `NEXT_PUBLIC_`으로 시작하지 않아 브라우저에서 접근하지 못함.
- **해결**: 
  - 프로젝트 루트에 `.env.local` 파일이 있는지 확인한다.
  - 변수명이 정확히 `NEXT_PUBLIC_SUPABASE_URL` 및 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 인지 확인한다.

## 2. Supabase API Key 호환성
### 이슈: `Invalid Key` 또는 `JWT Secret` 오류
- **원인**: 최신 Supabase 프로젝트는 `sb_publishable_...` 형식을 사용하나, 일부 레거시 라이브러리나 서버측 모듈에서 `anon` JWT 형식을 기대할 수 있음.
- **해결**:
  - `lib/supabase.js`에서 키를 제대로 읽어오는지 확인한다.
  - 로그인 세션이 유지되지 않을 경우, Supabase Dashboard의 **API Settings**에서 키가 활성화(Enabled) 상태인지 확인한다.

## 3. Docker 빌드 시 환경 변수 누락
### 이슈: 로컬에선 잘 되는데 도커 배포 후 DB 연결 안 됨
- **원인**: Next.js의 `output: 'export'`(정식 빌드) 방식은 빌드 타임에 환경 변수를 정적으로 주입한다. 런타임에 `.env`를 읽지 않는다.
- **해결**:
  - `Dockerfile` 내부에 `ARG`와 `ENV` 설정을 통해 빌드 타임에 변수를 전달해야 한다.
  - `docker-compose.yml`의 `args` 항목에 `${NEXT_PUBLIC_...}` 변수가 정의되어 있는지 확인한다.
  - `docker-compose up --build` 명령어로 빌드 시점에 환경 변수가 주입되도록 한다.

## 4. 인증 및 프로필 자동 생성 (Triggers)
### 이슈: 유저는 생성되는데 `public.profiles` 테이블이 비어 있음
- **원인**: `auth.users`에 신규 행 생성 시 `public.profiles`에 자동으로 데이터를 넣어주는 DB 트리거가 누락되었거나 오류가 발생함.
- **해결**:
  - Supabase SQL Editor에서 트리거 함수가 정상적으로 작동하는지 확인한다.
  - `profiles` 테이블의 RLS(Row Level Security) 정책이 설정되어 있는지 확인한다 (누락 시 `anon` 권한으로 조회 불가).

## 5. RLS (Row Level Security) 정책
### 이슈: 데이터가 존재하는데 API 호출 결과가 빈 배열(`[]`)임
- **원인**: RLS가 활성화되어 있으나, 해당 데이터를 조회할 수 있는 'Policy'가 정의되지 않음.
- **해결**: 
  - Supabase Dashboard -> Authentication -> Policies에서 `public.profiles` 등 대상 테이블에 대해 `SELECT` 권한 정책(예: `true` 또는 `auth.uid() = id`)을 추가한다.
