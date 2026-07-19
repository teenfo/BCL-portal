'use client';

// three.js 스테이지 렌더러 — 수영장 아레나(CSS 배경) 위 캐릭터/이펙트를 WebGL로 합성.
//   구도는 poolLaneX/POOL(% 지오메트리)을 정사영 카메라 스크린 공간으로 1:1 사상 —
//   배경 이미지 정렬·상단 출발→하단 피니시·원근 스케일 규칙은 DOM 구현과 동일(docs/15 R-3).
//   프레임 갱신은 자체 rAF + 검증 LERP 계수(§5b.6) — React 리렌더 우회.
//   포즈: wait(로비·카운트다운) → race(SPM 동기 로킹) → finish(원시 샘플 d ≥ target-1).
//   비-rower 기기는 글리프(이모지) 텍스처 폴백. WebGL 미지원 TV는 콘솔 경고 후 빈 스테이지(HUD는 동작).
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  poolLaneX,
  POOL,
  characterForDevice,
  animationDurationSec,
  type RowerPose,
} from './device-theme';
import type { LaneMeta, RawSample, LobbyStatus } from './useRaceRealtime';
import type { DeviceType } from '@/features/race-admin/types';
import styles from './race.module.css';

const LERP_X = 0.08;
const LERP_SPM = 0.1;
const IDLE_MS = 2000; // 샘플 미수신 시 모션 연출 정지
const TAU = Math.PI * 2;
/** 오어 손 추종 IK 계산용 재사용 벡터(프레임당 할당 방지) + 리거 튜브 정렬 기준축 */
const IK_V = new THREE.Vector3();
const IK_UP = new THREE.Vector3(0, 1, 0);

interface Props {
  lanes: LaneMeta[];
  samplesRef: React.MutableRefObject<Map<string, RawSample>>;
  target: number | null;
  lobbyStatus: LobbyStatus;
  defaultDevice: DeviceType;
  /** 도착 순서(serial 배열, RaceView 판정) — 인덱스+1 = 등수 */
  finishOrder: string[];
}

/** CSS 변수 → 실색 (캔버스 텍스처는 var() 미해석) */
function cssColor(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

function makeChipTexture(name: string, teamColor: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d')!;
  g.font = '700 44px Lexend, Pretendard, sans-serif';
  const tw = Math.min(440, g.measureText(name).width);
  const w = tw + 56;
  const x = (c.width - w) / 2;
  g.fillStyle = 'rgba(0,0,0,0.62)';
  g.strokeStyle = teamColor;
  g.lineWidth = 4;
  g.beginPath();
  g.roundRect(x, 14, w, 68, 14);
  g.fill();
  g.stroke();
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(name, c.width / 2, 50, 440);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 등수 배지("N위") — 1·2·3위 메달 톤, 이후 중립. 색은 토큰에서 해석 */
function makePlaceTexture(place: number): THREE.CanvasTexture {
  const medal =
    place === 1
      ? cssColor('--bcl-warning', '#f5a623')
      : place === 2
        ? cssColor('--bcl-text-muted', '#9e9e9e')
        : place === 3
          ? cssColor('--bcl-accent', '#ff6a00')
          : cssColor('--bcl-info', '#4da3ff');
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = medal;
  g.beginPath();
  g.roundRect(28, 18, 200, 92, 24);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 6;
  g.stroke();
  g.fillStyle = place <= 3 ? 'rgba(20,20,20,0.92)' : '#ffffff';
  g.font = '800 60px Lexend, Pretendard, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(`${place}위`, 128, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeGlyphTexture(glyph: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.font = '200px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(glyph, 128, 140);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 방사형 그라디언트(글로우/링/스트릭 공용 원판) */
function makeRadialTexture(inner: string, outer: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 수직 페이드 스트릭(위로 갈수록 투명) */
function makeStreakTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(32, 128, 26, 128, 0, 0, TAU);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Rig {
  serial: string;
  index: number;
  deviceType: DeviceType;
  group: THREE.Group;
  char: THREE.Mesh;
  charMat: THREE.MeshBasicMaterial;
  chip: THREE.Mesh;
  /** 칩에 그려진 이름 — member_name 지연 병합(RPC/broadcast) 시 재생성 판별 */
  chipName: string;
  glow: THREE.Mesh;
  streak: THREE.Mesh;
  streakMat: THREE.MeshBasicMaterial;
  ring: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  aspect: number;
  texKey: string;
  d: number;
  spm: number;
  /** 부스터 — 속도 빠른/느린 EMA(m/s)·발동/종료 시각. 급가속 감지 시 ~2s 연출.
      velF: 표시좌표 미분은 샘플 틱마다 톱니 스파이크 → ~0.4s EMA로 평활 후 비교 */
  velF: number;
  velS: number;
  boostAt: number;
  boostUntil: number;
  place: THREE.Mesh;
  placeMat: THREE.MeshBasicMaterial;
  /** 표시 중 등수(0=비표시) + 팝인 시작 시각 */
  placeNo: number;
  placeAt: number;
  /** 3파트 조립 모델(보트+캐릭터+오어 ×2) — 로드 완료 후 부착. 절차 애니메이션 참조 포함 */
  model: THREE.Group | null;
  parts: {
    inner: THREE.Group;
    waist: THREE.Object3D | null;
    upperL: THREE.Object3D | null;
    upperR: THREE.Object3D | null;
    foreL: THREE.Object3D | null;
    foreR: THREE.Object3D | null;
    thighL: THREE.Object3D | null;
    thighR: THREE.Object3D | null;
    calfL: THREE.Object3D | null;
    calfR: THREE.Object3D | null;
    handL: THREE.Object3D | null;
    handR: THREE.Object3D | null;
    neck: THREE.Object3D | null;
    charG: THREE.Group;
    oarL: THREE.Group;
    oarR: THREE.Group;
    rest: Map<THREE.Object3D, THREE.Euler>;
    /** 스트로크 누적 위상(0..1)·피니시 진입 시각·본별 현재 델타(지수 스무딩 상태) */
    phase: number;
    finAt: number;
    cur: Map<THREE.Object3D, { x: number; y: number; z: number }>;
  } | null;
}

/** 3파트 조립 상수 — 스크래치 조립 하네스(assembly.html)에서 실측 확정.
    싱글 스컬 헐(Tripo racing shell): 길이축=Z export → Y축 270° 회전으로 진행=+X(선수 +X) 정렬,
    1.6× 스케일(정규화 후 1.57×0.20×0.18). 정규화 좌표계: 진행=+X, 상=Y.
    캐릭터는 정준 스켈레톤 이식본(rig-transplant + auto-skin2) — 전 캐릭터 동일 본 프레임/체격(h 0.98). */
const ASM = {
  boatYawFix: Math.PI * 1.5, // boatFix.rotation.y — 선수(+X) 정렬
  boatScale: 1.6,
  charScale: 0.68,
  charPos: [-0.05, -0.02, 0] as const, // 콕핏 시트 (그립-손 오차 1.5cm 실측)
  oarlock: { x: -0.12, y: 0.14, z: 0.42 }, // 오어락 피벗(윙 리거 끝) — 후향 착석 손 위치 정합
  oarScale: 0.8,
  oarShift: 0.12, // 피벗 기준 샤프트 외측 이동
  oarTilt: 0.46, // 기본 딥(블레이드 물 쪽) — 그립(인보드 끝)이 손 높이로 올라오는 각
} as const;
/** 레인별 스컬 색상 로테이션 — 팀 컬러 순(orange/blue/green/amber/purple/pink), index % N 배정 */
const BOAT_URLS = [
  '/race/parts/scull-orange.glb',
  '/race/parts/scull-blue.glb',
  '/race/parts/scull-green.glb',
  '/race/parts/scull-amber.glb',
  '/race/parts/scull-purple.glb',
  '/race/parts/scull-pink.glb',
] as const;
/** 레인별 캐릭터 로테이션 — public/race/parts/ 정준 처리본(index % N 배정) */
const CHAR_URLS = [
  '/race/parts/blacl-man.glb',
  '/race/parts/greencap-man.glb',
  '/race/parts/headband-man.glb',
  '/race/parts/orangecap-girl.glb',
  '/race/parts/redhelmet-boy.glb',
  '/race/parts/heavy-boy.glb',
  '/race/parts/bluecap-boy.glb',
  '/race/parts/redcap-man.glb',
  '/race/parts/green-boy.glb',
] as const;
/** 착석 포즈 — 정준 스켈레톤(월드축 본 프레임): z=좌우축(전후 굽힘), y=수직축(수평 스윙), x=전후축(팔 내림).
    좌우는 부호 미러로 정확히 대칭. 손-그립 정합은 월드 좌표 프로브로 실측(오차 4cm 이내). */
const SEAT_POSE: ReadonlyArray<readonly [string, 'x' | 'y' | 'z', number]> = [
  ['L_Thigh', 'z', 1.35], ['R_Thigh', 'z', 1.35],
  ['L_Thigh', 'x', -0.3], ['R_Thigh', 'x', 0.3], // 무릎 모음(내전) — 좁은 스컬 헐 밖 관통 방지
  ['L_Calf', 'z', -1.05], ['R_Calf', 'z', -1.05],
  ['Waist', 'z', -0.25],
  ['NeckTwist01', 'z', 0.08], // 시선 전방(상체 전경 보상)
  ['L_Upperarm', 'y', -0.42], ['R_Upperarm', 'y', 0.42],
  ['L_Upperarm', 'x', -0.9], ['R_Upperarm', 'x', 0.9],
];
/** 슬라이딩 시트 왕복폭(보트 로컬 X, ±) — 다리 드라이브 가시화의 핵심 */
const SLIDE_AMP = 0.09;
/** 드라이브 구간 비율(캐치→피니시) — 짧을수록 드라이브가 punchy, 리커버리 대비 대비감↑ */
const DRIVE_FRAC = 0.3;
/** 부스터 — 표시속도(rig.d 미분)가 느린 EMA 기준선 대비 급증하면 2s 연출(스트릭 연장·링 플래시·선수 들림).
    스타트 가속 오발동 방지를 위해 15m 이후만, 종료 후 1.5s 쿨다운 */
const BOOST_MS = 2000;
const BOOST_COOLDOWN_MS = 1500;
const BOOST_RATIO = 1.18; // 기준선 대비 배율 임계(스퍼트 감지)
const BOOST_MIN_GAIN = 0.25; // 절대 여유(m/s) — 저속 노이즈 오발동 방지
/** 승선 연출 — 로비: 보트 뒤(스타트 펜 쪽) 기립 대기 → 카운트다운 진입 후 BOARD_MS 내 점프 탑승·착석.
    본 스무딩 트레일(~0.4s) 포함 "1" 표시(+2s) 시점에 착석 완료되도록 1.7s(서버 카운트다운이 더 길어도 안전) */
const BOARD_BACK_X = -0.95; // 기립 위치(보트 로컬, 선미 뒤)
const DISMOUNT_FRONT_X = 1.05; // 하선 착지(보트 로컬, 선수 앞 — 카메라 쪽)
/** 오어 전후 스윕 게인 — 손 추종 각도의 편차를 증폭해 캐치↔피니시 블레이드 이동을 과장(±1.05rad 캡) */
const OAR_SWEEP_GAIN = 1.45;
const BOARD_MS = 1700;
/** 기립 자세 — 착석 rest 기준 역델타(다리 펴기·상체 세우기·팔 내리기) */
const STAND_DELTA = {
  thigh: -1.35,
  calf: 1.05,
  waist: 0.25,
  neck: -0.08,
  upperY: 0.42, // L +, R − (전방 모음 해제)
  upperX: -0.3, // L −, R + (팔 옆으로 내림)
} as const;
/** 모델 기본 자세 — 피치(데크가 살짝 보이게) + 요(+X 뱃머리 → 카메라 방향) */
const MODEL_PITCH = 0.3;
/** 정면 −90°에서 +0.35rad 틀어 3/4 뷰 — 스컬 헐의 길이감·샤프함이 화면에 드러나는 각 */
const MODEL_YAW = -Math.PI / 2 + 0.35;

export function RaceStage3D({ lanes, samplesRef, target, lobbyStatus, defaultDevice, finishOrder }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  // 렌더 루프가 최신 props를 읽도록 ref 경유(재초기화 없이 갱신)
  const propsRef = useRef({ lanes, target, lobbyStatus, defaultDevice, finishOrder });
  useEffect(() => {
    propsRef.current = { lanes, target, lobbyStatus, defaultDevice, finishOrder };
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (e) {
      console.warn('[RaceStage3D] WebGL 미지원 — 스테이지 렌더 생략(HUD는 동작)', e);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // near/far — 3D 모델(보트 길이×스케일) 깊이 수용
    const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -4000, 4000);

    let W = 1;
    let H = 1;
    const resize = () => {
      W = Math.max(1, host.clientWidth);
      H = Math.max(1, host.clientHeight);
      renderer.setSize(W, H);
      camera.right = W;
      camera.bottom = -H;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // ── 공유 텍스처/로더 ──
    const texLoader = new THREE.TextureLoader();
    const charTexCache = new Map<string, { tex: THREE.Texture; aspect: number }>();
    const glowColor = cssColor('--bcl-race-glow', '#35d6ff');
    const glowTex = makeRadialTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
    const ringTex = makeRadialTexture('rgba(255,255,255,0)', 'rgba(255,255,255,0)');
    {
      // 링: 도넛형 물결(중심 투명 → 링 밝음 → 바깥 투명)
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const g = c.getContext('2d')!;
      const grad = g.createRadialGradient(128, 128, 60, 128, 128, 128);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.62, 'rgba(255,255,255,0.75)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 256);
      ringTex.image = c;
      ringTex.needsUpdate = true;
    }
    const streakTex = makeStreakTexture();
    const placeTexCache = new Map<number, THREE.CanvasTexture>();

    // ── 3파트 GLB(Draco) — 1회 로드 후 레인별 조립(보트/오어=clone, 캐릭터=SkeletonUtils.clone) ──
    const draco = new DRACOLoader().setDecoderPath('/draco/');
    const gltfLoader = new GLTFLoader().setDRACOLoader(draco);
    // 보트 템플릿 — 색상별 정규화 래퍼(하단 중앙 원점), 레인 index % N 배정
    const boatTpls: Array<THREE.Group | null> = BOAT_URLS.map(() => null);
    const charTpls: Array<{ scene: THREE.Group; offset: THREE.Vector3 } | null> = CHAR_URLS.map(() => null);
    let oarTpl: THREE.Group | null = null;
    let oarOffset = new THREE.Vector3();
    BOAT_URLS.forEach((url, bi) => {
      gltfLoader.load(url, (g) => {
        const fix = new THREE.Group();
        g.scene.scale.setScalar(ASM.boatScale);
        fix.rotation.y = ASM.boatYawFix;
        fix.add(g.scene);
        const bb = new THREE.Box3().setFromObject(fix, true);
        const c = bb.getCenter(new THREE.Vector3());
        fix.position.set(-c.x, -bb.min.y, -c.z);
        boatTpls[bi] = fix;
      }, undefined, (e) => console.warn(`[RaceStage3D] ${url} 로드 실패`, e));
    });
    CHAR_URLS.forEach((url, ci) => {
      gltfLoader.load(url, (g) => {
        const bb = new THREE.Box3().setFromObject(g.scene);
        const c = bb.getCenter(new THREE.Vector3());
        charTpls[ci] = { scene: g.scene, offset: new THREE.Vector3(-c.x, -bb.min.y, -c.z) }; // 발바닥 원점
      }, undefined, (e) => console.warn(`[RaceStage3D] ${url} 로드 실패`, e));
    });
    gltfLoader.load('/race/parts/oar-red.glb', (g) => {
      const bb = new THREE.Box3().setFromObject(g.scene);
      const c = bb.getCenter(new THREE.Vector3());
      oarOffset = new THREE.Vector3(-c.x, -c.y, -c.z + ASM.oarShift);
      oarTpl = g.scene;
    }, undefined, (e) => console.warn('[RaceStage3D] oar-red.glb 로드 실패', e));
    // 스킨 모델 라이팅(스탠다드 머티리얼)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899bb, 1.15));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(0.4, 1, 0.8);
    scene.add(keyLight);

    // 앵커 = 하단 중앙(레인 접점) — 지오메트리를 +0.5y 이동
    const anchoredPlane = () => {
      const geo = new THREE.PlaneGeometry(1, 1);
      geo.translate(0, 0.5, 0);
      return geo;
    };
    const centerPlane = new THREE.PlaneGeometry(1, 1);

    const rigs = new Map<string, Rig>();

    const teamColorOf = (index: number) =>
      cssColor(`--bcl-race-team-${(index % 8) + 1}`, '#ff6a00');

    function ensureCharTexture(rig: Rig, key: string, url: string | null, glyph: string) {
      if (rig.texKey === key) return;
      rig.texKey = key;
      const cached = charTexCache.get(key);
      if (cached) {
        rig.charMat.map = cached.tex;
        rig.charMat.needsUpdate = true;
        rig.aspect = cached.aspect;
        return;
      }
      if (!url) {
        const tex = makeGlyphTexture(glyph);
        charTexCache.set(key, { tex, aspect: 1 });
        rig.charMat.map = tex;
        rig.charMat.needsUpdate = true;
        rig.aspect = 1;
        return;
      }
      texLoader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        const img = tex.image as { width: number; height: number };
        const aspect = img.width / img.height;
        charTexCache.set(key, { tex, aspect });
        // 로드 완료 시점에도 해당 키가 유효할 때만 반영(빠른 포즈 전환 레이스 대비)
        if (rig.texKey === key) {
          rig.charMat.map = tex;
          rig.charMat.needsUpdate = true;
          rig.aspect = aspect;
        }
      });
    }

    function buildRig(meta: LaneMeta, index: number): Rig {
      const group = new THREE.Group();
      const teamColor = teamColorOf(index);

      const charMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
      const char = new THREE.Mesh(anchoredPlane(), charMat);

      const glowMat = new THREE.MeshBasicMaterial({
        map: glowTex,
        color: new THREE.Color(glowColor),
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      });
      const glow = new THREE.Mesh(centerPlane, glowMat);
      glow.renderOrder = 402;

      const streakMat = new THREE.MeshBasicMaterial({
        map: streakTex,
        color: new THREE.Color(teamColor),
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      });
      const streak = new THREE.Mesh(anchoredPlane(), streakMat);
      streak.renderOrder = 401;

      const ringMat = new THREE.MeshBasicMaterial({
        map: ringTex,
        color: new THREE.Color(cssColor('--bcl-race-trail', '#dff2ff')),
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      });
      const ring = new THREE.Mesh(centerPlane, ringMat);
      ring.renderOrder = 400;

      const chipName = meta.member_name ?? `레인 ${meta.lane || index + 1}`;
      const chipTex = makeChipTexture(chipName, teamColor);
      const chipMat = new THREE.MeshBasicMaterial({
        map: chipTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });
      const chip = new THREE.Mesh(centerPlane, chipMat);
      chip.renderOrder = 500;

      const placeMat = new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0,
      });
      const place = new THREE.Mesh(centerPlane, placeMat);
      place.renderOrder = 501;

      group.add(glow, ring, streak, char, chip, place);
      scene.add(group);
      return {
        serial: meta.serial,
        index,
        deviceType: propsRef.current.defaultDevice,
        group,
        char,
        charMat,
        chip,
        chipName,
        place,
        placeMat,
        placeNo: 0,
        placeAt: 0,
        model: null,
        parts: null,
        glow,
        streak,
        streakMat,
        ring,
        ringMat,
        aspect: 1,
        texKey: '',
        d: 0,
        spm: 0,
        velF: 0,
        velS: 0,
        boostAt: 0,
        boostUntil: 0,
      };
    }

    let raf = 0;
    // 승선 타이밍 — 카운트다운 진입 시각(전 레인 공유)
    let prevStatus: LobbyStatus | null = null;
    let countdownAt = 0;
    let lastLoopT = performance.now();
    const loop = () => {
      const { lanes: curLanes, target: tgt, lobbyStatus: status, defaultDevice: defDev, finishOrder: order } = propsRef.current;
      const now = Date.now();
      const t = performance.now();
      // 프레임 간격(ms) — 모든 보간·위상 누적의 시간 기준. 탭 복귀 등 장공백만 1s 캡
      //   (저프레임 기기에서도 스트로크율이 SPM 실측과 어긋나지 않도록 프레임률 독립 유지)
      const dtF = Math.min(1000, t - lastLoopT);
      lastLoopT = t;
      // 프레임당 고정 계수 LERP는 저프레임에서 수렴 지연 → 60fps 기준 계수를 dt로 환산
      const aX = 1 - Math.pow(1 - LERP_X, dtF / 16.7);
      const aSpm = 1 - Math.pow(1 - LERP_SPM, dtF / 16.7);
      const samples = samplesRef.current;
      const n = Math.max(1, curLanes.length);

      // 승선 진행도 — lobby 0(기립) → countdown 진입 후 BOARD_MS에 걸쳐 1(착석), racing 이후 1
      if (status !== prevStatus) {
        if (status === 'countdown') countdownAt = t;
        prevStatus = status;
      }
      const boardRaw =
        status === 'lobby' ? 0 : status === 'countdown' ? Math.min(1, (t - countdownAt) / BOARD_MS) : 1;
      const boardE = boardRaw * boardRaw * (3 - 2 * boardRaw); // smoothstep

      // 편성 동기화 — 새 레인 rig 생성, 사라진 레인 정리
      const liveSerials = new Set(curLanes.map((l) => l.serial));
      for (const [serial, rig] of rigs) {
        if (!liveSerials.has(serial)) {
          scene.remove(rig.group);
          rigs.delete(serial);
        }
      }
      curLanes.forEach((meta, index) => {
        if (!rigs.has(meta.serial)) rigs.set(meta.serial, buildRig(meta, index));
      });

      // 선두 산정(글로우) — 원시 샘플 기준
      let leadSerial: string | null = null;
      let leadD = -1;
      for (const meta of curLanes) {
        const d = samples.get(meta.serial)?.d ?? 0;
        if (d > leadD) {
          leadD = d;
          leadSerial = meta.serial;
        }
      }
      const dynamicMax = tgt && tgt > 0 ? tgt : Math.max(1, leadD);

      curLanes.forEach((meta, index) => {
        const rig = rigs.get(meta.serial);
        if (!rig) return;
        rig.index = index;
        const s = samples.get(meta.serial);
        const rawD = s?.d ?? 0;
        // LERP 보간(샘플 없으면 출발선으로 복귀 — race_reset)
        const dPrev = rig.d;
        rig.d += ((s ? s.d : 0) - rig.d) * aX;
        rig.spm += ((s ? s.spm : 0) - rig.spm) * aSpm;
        const idle = !s || now - s.lastAt > IDLE_MS || rig.spm < 6;

        const deviceType = meta.device_type ?? defDev;
        const waiting = status === 'lobby' || status === 'countdown';
        const finished = !!tgt && rawD >= tgt - 1;
        const pose: RowerPose = waiting ? 'wait' : finished ? 'finish' : 'race';

        // 부스터 감지 — 평활 속도(velF)가 기준선(velS, 느린 EMA) 대비 급증하면 발동
        const vel = dtF > 0 ? ((rig.d - dPrev) * 1000) / dtF : 0;
        rig.velF += (vel - rig.velF) * (1 - Math.pow(0.96, dtF / 16.7));
        rig.velS += (rig.velF - rig.velS) * (1 - Math.pow(0.995, dtF / 16.7));
        if (
          pose === 'race' &&
          !idle &&
          rig.d > 15 &&
          rig.velF > rig.velS * BOOST_RATIO + BOOST_MIN_GAIN &&
          t >= rig.boostUntil + BOOST_COOLDOWN_MS
        ) {
          rig.boostAt = t;
          rig.boostUntil = t + BOOST_MS;
        }
        if (pose !== 'race') rig.boostUntil = 0; // 대기·피니시 전환 시 즉시 해제
        // 엔벨로프: 150ms 어택 → 유지 → 400ms 릴리즈
        const boostE =
          t < rig.boostUntil
            ? Math.min(1, (t - rig.boostAt) / 150) * Math.min(1, (rig.boostUntil - t) / 400)
            : 0;
        if (deviceType === 'rower') {
          // 3파트 조립 경로 — 로드 전엔 스프라이트 없이 대기(칩/배지만), 로드 완료 프레임에 부착
          rig.char.visible = false;
          const charTpl = charTpls[index % CHAR_URLS.length];
          const boatTpl = boatTpls[index % BOAT_URLS.length];
          if (!rig.model && boatTpl && charTpl && oarTpl) {
            const boatG = new THREE.Group();
            boatG.add(boatTpl.clone(true));
            // 캐릭터 착석 + 포즈(포즈 적용 후 rest 캡처 — 애니메이션 기준자세)
            const char = cloneSkinned(charTpl.scene) as THREE.Group;
            char.position.copy(charTpl.offset);
            const charG = new THREE.Group();
            charG.add(char);
            charG.scale.setScalar(ASM.charScale);
            charG.position.set(...ASM.charPos);
            charG.rotation.y = Math.PI; // 후향 착석(실제 로잉 — 진행 방향을 등짐). 승선 중엔 boardE로 회전
            boatG.add(charG);
            for (const [bn, ax, rad] of SEAT_POSE) {
              const b = char.getObjectByName(bn);
              if (b) b.rotation[ax] += rad;
            }
            // 오어 ×2 — 오어락 피벗(우현 +Z 기준, 좌현은 y=π 미러)
            //   윙 리거(노 거치대)는 절차 생성 — 헐 모델 교체와 무관하게 피벗 위치와 항상 정합
            const riggerGeo = new THREE.CylinderGeometry(0.016, 0.016, 1, 8);
            const riggerMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(cssColor('--bcl-text-muted', '#9e9e9e')),
              metalness: 0.75,
              roughness: 0.35,
            });
            const addRiggerTube = (from: THREE.Vector3, to: THREE.Vector3) => {
              const dir = to.clone().sub(from);
              const len = dir.length();
              const tube = new THREE.Mesh(riggerGeo, riggerMat);
              tube.scale.y = len;
              tube.position.copy(from).addScaledVector(dir, 0.5);
              tube.quaternion.setFromUnitVectors(IK_UP, dir.normalize());
              boatG.add(tube);
            };
            const mountOar = (mirror: boolean) => {
              const pz = mirror ? -ASM.oarlock.z : ASM.oarlock.z;
              const pivot = new THREE.Group();
              pivot.position.set(ASM.oarlock.x, ASM.oarlock.y, pz);
              const o = oarTpl!.clone(true);
              o.position.copy(oarOffset);
              o.scale.setScalar(ASM.oarScale);
              if (mirror) pivot.rotation.y = Math.PI;
              pivot.rotation.x += mirror ? -ASM.oarTilt : ASM.oarTilt;
              pivot.add(o);
              boatG.add(pivot);
              // 윙 리거: 데크 접점 2개(거널 높이) → 오어락 피벗 V자 튜브 + 오어락 핀
              const zIn = mirror ? -0.08 : 0.08;
              const pivotPos = new THREE.Vector3(ASM.oarlock.x, ASM.oarlock.y - 0.015, pz);
              addRiggerTube(new THREE.Vector3(ASM.oarlock.x + 0.14, ASM.oarlock.y + 0.045, zIn), pivotPos);
              addRiggerTube(new THREE.Vector3(ASM.oarlock.x - 0.14, ASM.oarlock.y + 0.045, zIn), pivotPos);
              const post = new THREE.Mesh(riggerGeo, riggerMat);
              post.scale.set(1.5, 0.06, 1.5);
              post.position.set(ASM.oarlock.x, ASM.oarlock.y - 0.005, pz);
              boatG.add(post);
              return pivot;
            };
            const oarR = mountOar(false);
            const oarL = mountOar(true);
            const inner = new THREE.Group();
            const yawG = new THREE.Group();
            yawG.rotation.y = MODEL_YAW;
            yawG.add(boatG);
            inner.add(yawG);
            inner.rotation.x = MODEL_PITCH;
            const find = (n: string) => char.getObjectByName(n) ?? null;
            const parts = {
              inner,
              waist: find('Waist'),
              upperL: find('L_Upperarm'),
              upperR: find('R_Upperarm'),
              foreL: find('L_Forearm'),
              foreR: find('R_Forearm'),
              thighL: find('L_Thigh'),
              thighR: find('R_Thigh'),
              calfL: find('L_Calf'),
              calfR: find('R_Calf'),
              handL: find('L_Hand'),
              handR: find('R_Hand'),
              neck: find('NeckTwist01'),
              charG,
              oarL,
              oarR,
              rest: new Map<THREE.Object3D, THREE.Euler>(),
              phase: (index * 0.37) % 1, // 레인별 위상 오프셋(제자리 합창 방지)
              finAt: 0, // 피니시 진입 시각 — 하선 세리머니 진행도 기준
              cur: new Map<THREE.Object3D, { x: number; y: number; z: number }>(),
            };
            // 오어 피벗은 rest/스무딩 대상에서 제외 — 손 추종 IK가 직접 제어
            for (const b of [parts.waist, parts.neck, parts.upperL, parts.upperR, parts.foreL, parts.foreR, parts.thighL, parts.thighR, parts.calfL, parts.calfR]) {
              if (b) parts.rest.set(b, b.rotation.clone());
            }
            rig.model = inner;
            rig.parts = parts;
            rig.group.add(inner);
          }
        } else {
          rig.char.visible = true;
          const glyph = characterForDevice(deviceType).glyph;
          ensureCharTexture(rig, `glyph:${glyph}`, null, glyph);
        }

        const prog = Math.min(1, rig.d / dynamicMax);
        const { xt, xb } = poolLaneX(index, n);
        const xPct = xt + (xb - xt) * prog;
        const yPct = POOL.yTop + (POOL.yBottom - POOL.yTop) * prog;
        const scl = POOL.sTop + (POOL.sBottom - POOL.sTop) * prog;
        const x = (xPct / 100) * W;
        const yPx = (yPct / 100) * H;
        const bob = Math.sin(t / 2800 * TAU + index * 1.3) * 5 * scl;

        rig.group.position.set(x, -yPx + bob, 0);
        rig.group.renderOrder = Math.round(prog * 100);

        const charH = Math.min(0.29 * H, 258) * scl;
        let drivePulse = 0; // 드라이브 임팩트(0..1) — 모델 경로에서 산출, 이펙트 동기용
        if (rig.model && rig.parts) {
          // 3파트 조립 — 화면 높이 환산 스케일 + 절차 스트로크(SPM 동기)
          //   rest = 착석 기본자세(포즈 적용 후 캡처) — 델타만 가감
          //   위상은 누적(phase += dt/dur) — t/dur 방식은 SPM 변동 시 위상 점프(모션 널뜀)
          const ms = charH * 0.65;
          rig.model.scale.set(ms, ms, ms);
          const b = rig.parts;
          const stroke = pose === 'race' && !idle;
          const dur = animationDurationSec(deviceType, rig.spm) * 1000;
          if (stroke) b.phase = (b.phase + dtF / dur) % 1;
          // 피니시 하선 타이밍 — 진입 시각 기록(레인별), 리셋 시 해제
          if (pose === 'finish') {
            if (!b.finAt) b.finAt = t;
          } else if (b.finAt) b.finAt = 0;
          // 비대칭 스트로크: 드라이브 30%(캐치→피니시, 힘참) / 리커버리 70%(느긋한 복귀)
          //   s(-1=캐치 전경 ↔ +1=피니시 후경), 관절별 위상 지연(다리→허리→팔)
          const sAt = (lag: number) => {
            const q = ((b.phase - lag) % 1 + 1) % 1;
            return q < DRIVE_FRAC
              ? -Math.cos(Math.PI * (q / DRIVE_FRAC))
              : Math.cos(Math.PI * ((q - DRIVE_FRAC) / (1 - DRIVE_FRAC)));
          };
          // 리커버리 중 블레이드 리프트 험프(0→1→0)
          const lift =
            b.phase < DRIVE_FRAC ? 0 : Math.sin(Math.PI * ((b.phase - DRIVE_FRAC) / (1 - DRIVE_FRAC)));
          // 드라이브 임팩트(0→1→0, 드라이브 구간만) — 선체 침하·이펙트 펄스 공유
          drivePulse = stroke && b.phase < DRIVE_FRAC ? Math.sin(Math.PI * (b.phase / DRIVE_FRAC)) : 0;
          // 프레임 타깃 계산 → 지수 스무딩 적용(시작/정지/피니시 전환 스냅 제거)
          const tgt = new Map<THREE.Object3D, { x: number; y: number; z: number }>();
          const setT = (o: THREE.Object3D | null, ax: 'x' | 'y' | 'z', delta: number) => {
            if (!o) return;
            let e = tgt.get(o);
            if (!e) {
              e = { x: 0, y: 0, z: 0 };
              tgt.set(o, e);
            }
            e[ax] += delta;
          };
          // 정준 스켈레톤 축: z=좌우축(전후 굽힘, −=전경) · y=수직축(수평 스윙, L−/R+ = 전방) · x=전후축(팔 하강, L−/R+)
          let slideX = 0; // 슬라이딩 시트 목표(보트 로컬 X 오프셋)
          if (pose === 'finish') {
            // 세리머니 — 하선(unE) 후 기립 + 등수별 포즈(1위 만세·2위 주먹 펌프·3위 두 손 허리·4위+ 인사)
            const unE = b.finAt ? Math.min(1, (t - b.finAt) / 1200) : 0;
            const su = unE * unE * (3 - 2 * unE); // smoothstep — 기립 전개
            setT(b.thighL, 'z', STAND_DELTA.thigh * su);
            setT(b.thighR, 'z', STAND_DELTA.thigh * su);
            setT(b.calfL, 'z', STAND_DELTA.calf * su);
            setT(b.calfR, 'z', STAND_DELTA.calf * su);
            const fRank = order.indexOf(meta.serial); // 0=1위 (-1=집계 전 — 만세 폴백)
            if (fRank <= 0) {
              // 1위 — 만세(팔 V자) + 상체 뒤로 (점프는 배치부)
              setT(b.waist, 'z', STAND_DELTA.waist * su + 0.15 * su);
              setT(b.neck, 'z', STAND_DELTA.neck * su + 0.14 * su);
              setT(b.upperL, 'x', 1.5);
              setT(b.upperR, 'x', -1.5);
              setT(b.upperL, 'y', 0.42);
              setT(b.upperR, 'y', -0.42);
            } else if (fRank === 1) {
              // 2위 — 오른팔 주먹 하늘로 펌프(리듬), 왼팔 내림
              const pump = 0.15 * Math.sin(t / 260);
              setT(b.waist, 'z', STAND_DELTA.waist * su + 0.08 * su);
              setT(b.neck, 'z', STAND_DELTA.neck * su + 0.1 * su);
              setT(b.upperR, 'x', -(1.6 + pump));
              setT(b.upperR, 'y', -0.12);
              setT(b.foreR, 'y', 0.5);
              setT(b.upperL, 'x', -0.32);
              setT(b.upperL, 'y', 0.25);
            } else if (fRank === 2) {
              // 3위 — 두 손 허리(당당), 고개 살짝 들기
              setT(b.waist, 'z', STAND_DELTA.waist * su);
              setT(b.neck, 'z', STAND_DELTA.neck * su + 0.08 * su);
              setT(b.upperL, 'x', -0.55);
              setT(b.upperR, 'x', 0.55);
              setT(b.upperL, 'y', 0.15);
              setT(b.upperR, 'y', -0.15);
              setT(b.foreL, 'y', -1.25);
              setT(b.foreR, 'y', 1.25);
            } else {
              // 4위 이하 — 팔 내리고 가벼운 목례(수고)
              setT(b.waist, 'z', STAND_DELTA.waist * su - 0.18 * su);
              setT(b.neck, 'z', STAND_DELTA.neck * su - 0.12 * su);
              setT(b.upperL, 'x', -0.35);
              setT(b.upperR, 'x', 0.35);
              setT(b.upperL, 'y', 0.2);
              setT(b.upperR, 'y', -0.2);
            }
          } else if (stroke) {
            const sLeg = sAt(0);
            const sBack = sAt(0.05);
            const sArm = sAt(0.12);
            const pull = Math.max(0, sAt(0.16)); // 팔꿈치 당김은 드라이브 후반에만
            // 로잉 시퀀스: 슬라이드+다리(선행) → 상체 스윙(레이백까지) → 팔꿈치 당김(마무리)
            slideX = SLIDE_AMP * sLeg; // 후향 착석: 캐치=선미 쪽(−X, 무릎 압축) ↔ 드라이브=선수 쪽
            setT(b.thighL, 'z', -0.3 * sLeg);
            setT(b.thighR, 'z', -0.3 * sLeg);
            setT(b.calfL, 'z', 0.38 * sLeg);
            setT(b.calfR, 'z', 0.38 * sLeg);
            // 상체: 캐치 전경 ↔ 피니시 레이백 (rest −0.25 기준 ±0.55 — 다이나믹 스윙)
            setT(b.waist, 'z', 0.55 * sBack);
            setT(b.neck, 'z', -0.28 * sBack); // 시선 전방 유지(상체 보상)
            setT(b.upperL, 'y', 0.36 * sArm);
            setT(b.upperR, 'y', -0.36 * sArm);
            setT(b.upperL, 'x', -0.12 * pull); // 드라이브 때 어깨로 끌어내리는 파워 감
            setT(b.upperR, 'x', 0.12 * pull);
            setT(b.foreL, 'y', -(0.12 * sArm + 0.65 * pull));
            setT(b.foreR, 'y', 0.12 * sArm + 0.65 * pull);
            // 뒤돌아보기 — 몸은 고정, 목만 왼쪽 어깨 너머로 돌려 진행 방향 확인(주기 7.5s, 레인별 위상)
            const gIn = (t / 1000 + index * 3.1) % 7.5;
            const glanceE = gIn < 1.8 ? Math.sin(Math.PI * (gIn / 1.8)) : 0;
            if (glanceE > 0.001) setT(b.neck, 'y', 1.3 * glanceE);
          } else {
            // 대기/승선 — 기립(역델타 × 미승선분) + 미세 호흡(상체·목, 레인별 위상 분산)
            const su = 1 - boardE;
            if (su > 0.001) {
              setT(b.thighL, 'z', STAND_DELTA.thigh * su);
              setT(b.thighR, 'z', STAND_DELTA.thigh * su);
              setT(b.calfL, 'z', STAND_DELTA.calf * su);
              setT(b.calfR, 'z', STAND_DELTA.calf * su);
              setT(b.waist, 'z', STAND_DELTA.waist * su);
              setT(b.neck, 'z', STAND_DELTA.neck * su);
              setT(b.upperL, 'y', STAND_DELTA.upperY * su);
              setT(b.upperR, 'y', -STAND_DELTA.upperY * su);
              setT(b.upperL, 'x', STAND_DELTA.upperX * su);
              setT(b.upperR, 'x', -STAND_DELTA.upperX * su);
            }
            const breath = Math.sin(t / 1400 + index * 1.7);
            setT(b.waist, 'z', 0.03 * breath);
            setT(b.neck, 'z', -0.02 * breath);
          }
          const AX: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
          const k = 1 - Math.pow(0.88, dtF / 16.7); // 프레임률 독립 스무딩 계수
          for (const [o, rest] of b.rest) {
            const e = tgt.get(o);
            let c = b.cur.get(o);
            if (!c) {
              c = { x: 0, y: 0, z: 0 };
              b.cur.set(o, c);
            }
            for (const ax of AX) {
              c[ax] += ((e ? e[ax] : 0) - c[ax]) * k;
              o.rotation[ax] = rest[ax] + c[ax];
            }
          }
          // 캐릭터 그룹 배치 — 승선(선미 뒤→시트)·하선(시트→선수 앞) 보간 + 포물선 점프 아크
          const unRaw = b.finAt ? Math.min(1, (t - b.finAt) / 1200) : 0;
          const unE = unRaw * unRaw * (3 - 2 * unRaw);
          const seatE = boardE * (1 - unE);
          const seatX = ASM.charPos[0] + slideX;
          let bx: number;
          let by: number;
          if (unE > 0) {
            // 하선 — 선수(뱃머리) 앞쪽으로 점프해 내려 카메라를 향해 만세. 1위는 승리 점프 반복
            bx = seatX + (DISMOUNT_FRONT_X - seatX) * unE;
            by = ASM.charPos[1] * (1 - unE) + Math.sin(Math.PI * unE) * 0.26;
            if (order.indexOf(meta.serial) === 0) by += Math.abs(Math.sin(t / 190)) * 0.13 * unE;
          } else {
            bx = BOARD_BACK_X + (seatX - BOARD_BACK_X) * boardE;
            by = ASM.charPos[1] * boardE + Math.sin(Math.PI * boardE) * 0.26;
          }
          b.charG.position.x += (bx - b.charG.position.x) * k;
          b.charG.position.y = by;
          // 승선/하선 회전 — 기립(선수 쪽 바라봄, 0) ↔ 착석(후향, π)
          b.charG.rotation.y = Math.PI * seatE;
          // 선체 피치 서지(드라이브 반동) + 드라이브 침하(헤브)·전진 런지 + 부스터 선수 들림
          b.inner.rotation.x = MODEL_PITCH + (stroke ? 0.085 * sAt(0.1) : 0) - 0.05 * boostE;
          b.inner.position.y = -drivePulse * charH * 0.032 + boostE * charH * 0.012;
          b.inner.position.x = drivePulse * charH * 0.028; // 스트로크당 가속 런지(제로평균 아님·소폭 — 순위 왜곡 없음)
          // ── 오어 = 손 추종 IK — 손과 노가 항상 동기(그립이 손 방향 정렬) ──
          //   피벗 yaw/pitch를 손 벡터로 해석: gripDir = Rx(φ)·Ry(θ)·(0,0,-1)
          //   좌현은 θ≈π로 자연 수렴(미러 특례 불필요). 리커버리엔 블레이드 리프트 가산
          b.inner.updateWorldMatrix(true, true);
          const parked = seatE < 0.9; // 승선 완료 전/하선 후 — 오어는 오어락 거치 자세 고정(손 추종 해제)
          const followOar = (pivot: THREE.Group, hand: THREE.Object3D | null, mirror: boolean) => {
            if (!hand || !pivot.parent) return;
            hand.getWorldPosition(IK_V);
            pivot.parent.worldToLocal(IK_V);
            IK_V.sub(pivot.position);
            const len = IK_V.length() || 1;
            let theta =
              parked || pose === 'finish' ? (mirror ? Math.PI : 0) : Math.atan2(-IK_V.x, -IK_V.z);
            if (!parked && pose !== 'finish') {
              // 전후 스윕 증폭 — 미드(외측 수직) 기준 편차에 게인
              const mid = mirror ? Math.PI : 0;
              const dev = ((theta - mid + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
              theta = mid + Math.max(-1.05, Math.min(1.05, dev * OAR_SWEEP_GAIN));
            }
            const cth = Math.cos(theta);
            const denom = Math.abs(cth) < 0.25 ? (cth < 0 ? -0.25 : 0.25) : cth;
            const sph = Math.max(-0.9, Math.min(0.9, IK_V.y / len / denom));
            let phi = parked
              ? (mirror ? -1 : 1) * ASM.oarTilt
              : pose === 'finish'
                ? (mirror ? -0.5 : 0.5)
                : Math.asin(sph);
            if (!parked && pose !== 'finish') phi += (mirror ? 0.22 : -0.22) * lift * (stroke ? 1 : 0); // 리커버리 블레이드 리프트
            const dy = ((theta - pivot.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI; // ±π 랩 처리
            pivot.rotation.y += dy * k;
            pivot.rotation.x += (phi - pivot.rotation.x) * k;
          };
          // 후향 착석 — 캐릭터 왼손이 우현(+Z) 오어를 잡음(좌우 교차)
          followOar(b.oarR, b.handL, false);
          followOar(b.oarL, b.handR, true);
        } else {
          rig.char.scale.set(charH * rig.aspect, charH, 1);
          // 스트로크 로킹 — 실측 SPM 주기(레이스 포즈만), idle 시 정지
          if (pose === 'race' && !idle) {
            const dur = animationDurationSec(deviceType, rig.spm) * 1000;
            rig.char.rotation.z = Math.sin((t / dur) * TAU) * 0.04;
            rig.char.position.y = Math.abs(Math.sin((t / dur) * TAU)) * -charH * 0.015;
            drivePulse = 0.5 + 0.5 * Math.sin((t / dur) * TAU); // 스프라이트 경로 근사 펄스
          } else {
            rig.char.rotation.z = 0;
            rig.char.position.y = 0;
          }
        }

        // 이펙트 — 전진 중에만(대기·피니시·idle 제외), 드라이브 임팩트에 동기(스트로크 가시화)
        //   부스터(boostE): 급가속 2s — 스트릭 대폭 연장·링 플래시로 스퍼트 강조
        const moving = pose === 'race' && !idle;
        const pulse = 0.5 + 0.5 * Math.sin(t / 260 + index);
        const fxPulse = Math.max(drivePulse, boostE);
        rig.ring.scale.set(
          charH * (0.9 + fxPulse * 0.35 + boostE * 0.25),
          charH * (0.22 + fxPulse * 0.1),
          1,
        );
        rig.ring.position.y = charH * 0.02;
        rig.ringMat.opacity = moving ? 0.14 + drivePulse * 0.34 + boostE * 0.28 : 0;
        // 스트릭 — 캐릭터 위(진행 반대 방향)로 페이드(텍스처 자체가 상단 투명), 드라이브 때 길어짐
        rig.streak.scale.set(
          charH * (0.26 + boostE * 0.14),
          charH * (0.4 + drivePulse * 0.45 + pulse * 0.08 + boostE * 0.8),
          1,
        );
        rig.streak.position.y = charH * (0.55 + boostE * 0.25);
        rig.streakMat.opacity = moving ? 0.08 + drivePulse * 0.22 + boostE * 0.3 : 0;

        // 리더 글로우(흰-시안 아우라)
        const isLead = meta.serial === leadSerial && status !== 'lobby' && status !== 'countdown' && leadD > 0;
        rig.glow.scale.set(charH * 1.7, charH * 1.7, 1);
        rig.glow.position.y = charH * 0.45;
        (rig.glow.material as THREE.MeshBasicMaterial).opacity = isLead
          ? 0.3 + 0.14 * Math.sin(t / 420)
          : 0;

        // 이름 칩 — 캐릭터 하단(원근 스케일 완화 — 가독성). 이름 지연 병합 시 재생성
        const wantName = meta.member_name ?? `레인 ${meta.lane || index + 1}`;
        if (wantName !== rig.chipName) {
          rig.chipName = wantName;
          const mat = rig.chip.material as THREE.MeshBasicMaterial;
          mat.map?.dispose();
          mat.map = makeChipTexture(wantName, teamColorOf(index));
          mat.needsUpdate = true;
        }
        const chipS = Math.max(0.72, scl) * charH;
        rig.chip.scale.set(chipS * 1.35, chipS * 0.25, 1);
        // 캐릭터 머리 위(등수 배지 1.12보다 아래 — 배지와 겹침 방지)
        rig.chip.position.y = rig.model ? charH * 0.88 : chipS * 0.7;

        // 도착 등수 배지 — 머리 위, 팝인(오버슈트) 애니메이션. 리셋 시 소멸
        const placeNo = order.indexOf(meta.serial) + 1;
        if (placeNo !== rig.placeNo) {
          rig.placeNo = placeNo;
          rig.placeAt = t;
          if (placeNo > 0) {
            let tex = placeTexCache.get(placeNo);
            if (!tex) {
              tex = makePlaceTexture(placeNo);
              placeTexCache.set(placeNo, tex);
            }
            rig.placeMat.map = tex;
            rig.placeMat.needsUpdate = true;
          }
        }
        if (rig.placeNo > 0) {
          const age = (t - rig.placeAt) / 1000;
          const pop = age < 0.35 ? 1.25 - 0.25 * (age / 0.35) : 1 + 0.03 * Math.sin(t / 300);
          const pw = charH * 0.62 * pop;
          rig.place.scale.set(pw, pw * 0.5, 1);
          rig.place.position.y = charH * 1.12;
          rig.placeMat.opacity = Math.min(1, age / 0.2);
        } else {
          rig.placeMat.opacity = 0;
        }
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          (mesh.material as THREE.Material).dispose();
          mesh.geometry.dispose();
        }
      });
      for (const { tex } of charTexCache.values()) tex.dispose();
      for (const tex of placeTexCache.values()) tex.dispose();
      glowTex.dispose();
      ringTex.dispose();
      streakTex.dispose();
      host.removeChild(renderer.domElement);
    };
    // 마운트 1회 — 이후 변화는 propsRef 경유로 루프가 소비
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className={styles.stageCanvas} aria-hidden />;
}
