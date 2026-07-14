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
    oarL: THREE.Group;
    oarR: THREE.Group;
    rest: Map<THREE.Object3D, THREE.Euler>;
    /** 스트로크 누적 위상(0..1)·직전 프레임 시각·본별 현재 델타(지수 스무딩 상태) */
    phase: number;
    lastT: number;
    cur: Map<THREE.Object3D, { x: number; y: number; z: number }>;
  } | null;
}

/** 3파트 조립 상수 — 스크래치 조립 하네스(assembly.html)에서 실측 확정.
    보트 export는 XY 평면 피치 ~40° 틀어짐 → Z축 0.7rad 정규화. 정규화 좌표계: 진행=+X, 상=Y.
    캐릭터 리깅은 IBM 기반 rest 복원 + 자동 스키닝(auto-skin.mjs) 처리본. */
const ASM = {
  boatPitchFix: 0.7, // boatFix.rotation.z — 선체 수평 정규화
  charScale: 0.75,
  charPos: [-0.1, 0.13, 0] as const, // 시트 위 — 스케일업에 맞춰 뒤·아래로 (풋패드 X≈+0.19)
  oarlock: { x: -0.04, y: 0.27, z: 0.42 }, // 오어락 피벗 — 노브 실측 0.45에서 그립이 손에 닿게 3cm 인보드
  oarScale: 0.8,
  oarShift: 0.12, // 피벗 기준 샤프트 외측 이동
  oarTilt: 0.46, // 기본 딥(블레이드 물 쪽) — 그립(인보드 끝)이 손 높이로 올라오는 각
} as const;
/** 착석 포즈 — 본 로컬 축 실측(x+ = 전방: Thigh 굴곡·Upperarm 전방 스윙 동일 부호) */
const SEAT_POSE: ReadonlyArray<readonly [string, 'x' | 'y' | 'z', number]> = [
  ['L_Thigh', 'x', 1.3], ['R_Thigh', 'x', 1.3],
  ['L_Calf', 'x', -1.0], ['R_Calf', 'x', -1.0],
  // 팔 — 손이 오어 그립에 닿는 값(월드 좌표 프로브 실측). y/z는 좌우 본 프레임이 미러라 부호·크기 비대칭
  ['L_Upperarm', 'x', 1.2], ['R_Upperarm', 'x', 1.2],
  ['L_Upperarm', 'y', 0.1], ['R_Upperarm', 'y', -0.15],
  ['L_Upperarm', 'z', -0.95], ['R_Upperarm', 'z', 0.9],
  ['L_Forearm', 'x', 0.05], ['R_Forearm', 'x', 0.05],
  ['Waist', 'x', 0.28],
];
/** 모델 기본 자세 — 피치(데크가 살짝 보이게) + 요(+X 뱃머리 → 카메라 방향) */
const MODEL_PITCH = 0.3;
const MODEL_YAW = -Math.PI / 2;

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
    let boatTpl: THREE.Group | null = null; // 정규화 래퍼 포함(하단 중앙 원점)
    let charTpl: THREE.Group | null = null;
    let charOffset = new THREE.Vector3();
    let oarTpl: THREE.Group | null = null;
    let oarOffset = new THREE.Vector3();
    gltfLoader.load('/race/parts/boat-blue.glb', (g) => {
      const fix = new THREE.Group();
      fix.rotation.z = ASM.boatPitchFix;
      fix.add(g.scene);
      const bb = new THREE.Box3().setFromObject(fix, true);
      const c = bb.getCenter(new THREE.Vector3());
      fix.position.set(-c.x, -bb.min.y, -c.z);
      boatTpl = fix;
    }, undefined, (e) => console.warn('[RaceStage3D] boat-blue.glb 로드 실패', e));
    gltfLoader.load('/race/parts/rower-m1.glb', (g) => {
      const bb = new THREE.Box3().setFromObject(g.scene);
      const c = bb.getCenter(new THREE.Vector3());
      charOffset = new THREE.Vector3(-c.x, -bb.min.y, -c.z); // 발바닥 원점
      charTpl = g.scene;
    }, undefined, (e) => console.warn('[RaceStage3D] rower-m1.glb 로드 실패', e));
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
      };
    }

    let raf = 0;
    const loop = () => {
      const { lanes: curLanes, target: tgt, lobbyStatus: status, defaultDevice: defDev, finishOrder: order } = propsRef.current;
      const now = Date.now();
      const t = performance.now();
      const samples = samplesRef.current;
      const n = Math.max(1, curLanes.length);

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
        rig.d += ((s ? s.d : 0) - rig.d) * LERP_X;
        rig.spm += ((s ? s.spm : 0) - rig.spm) * LERP_SPM;
        const idle = !s || now - s.lastAt > IDLE_MS || rig.spm < 6;

        const deviceType = meta.device_type ?? defDev;
        const waiting = status === 'lobby' || status === 'countdown';
        const finished = !!tgt && rawD >= tgt - 1;
        const pose: RowerPose = waiting ? 'wait' : finished ? 'finish' : 'race';
        if (deviceType === 'rower') {
          // 3파트 조립 경로 — 로드 전엔 스프라이트 없이 대기(칩/배지만), 로드 완료 프레임에 부착
          rig.char.visible = false;
          if (!rig.model && boatTpl && charTpl && oarTpl) {
            const boatG = new THREE.Group();
            boatG.add(boatTpl.clone(true));
            // 캐릭터 착석 + 포즈(포즈 적용 후 rest 캡처 — 애니메이션 기준자세)
            const char = cloneSkinned(charTpl) as THREE.Group;
            char.position.copy(charOffset);
            const charG = new THREE.Group();
            charG.add(char);
            charG.scale.setScalar(ASM.charScale);
            charG.position.set(...ASM.charPos);
            boatG.add(charG);
            for (const [bn, ax, rad] of SEAT_POSE) {
              const b = char.getObjectByName(bn);
              if (b) b.rotation[ax] += rad;
            }
            // 오어 ×2 — 오어락 피벗(우현 +Z 기준, 좌현은 y=π 미러)
            const mountOar = (mirror: boolean) => {
              const pivot = new THREE.Group();
              pivot.position.set(ASM.oarlock.x, ASM.oarlock.y, mirror ? -ASM.oarlock.z : ASM.oarlock.z);
              const o = oarTpl!.clone(true);
              o.position.copy(oarOffset);
              o.scale.setScalar(ASM.oarScale);
              if (mirror) pivot.rotation.y = Math.PI;
              pivot.rotation.x += mirror ? -ASM.oarTilt : ASM.oarTilt;
              pivot.add(o);
              boatG.add(pivot);
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
              oarL,
              oarR,
              rest: new Map<THREE.Object3D, THREE.Euler>(),
              phase: (index * 0.37) % 1, // 레인별 위상 오프셋(제자리 합창 방지)
              lastT: performance.now(),
              cur: new Map<THREE.Object3D, { x: number; y: number; z: number }>(),
            };
            for (const b of [parts.waist, parts.upperL, parts.upperR, parts.foreL, parts.foreR, parts.thighL, parts.thighR, parts.calfL, parts.calfR, parts.oarL, parts.oarR]) {
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

        const charH = Math.min(0.26 * H, 230) * scl;
        if (rig.model && rig.parts) {
          // 3파트 조립 — 화면 높이 환산 스케일 + 절차 스트로크(SPM 동기)
          //   rest = 착석 기본자세(포즈 적용 후 캡처) — 델타만 가감
          //   위상은 누적(phase += dt/dur) — t/dur 방식은 SPM 변동 시 위상 점프(모션 널뜀)
          const ms = charH * 0.65;
          rig.model.scale.set(ms, ms, ms);
          const b = rig.parts;
          const stroke = pose === 'race' && !idle;
          const dur = animationDurationSec(deviceType, rig.spm) * 1000;
          const dt = Math.min(200, t - b.lastT);
          b.lastT = t;
          if (stroke) b.phase = (b.phase + dt / dur) % 1;
          // 비대칭 스트로크: 드라이브 35%(캐치→피니시, 힘참) / 리커버리 65%(느긋한 복귀)
          //   s(-1=캐치 전경 ↔ +1=피니시 후경), 관절별 위상 지연(다리→허리→팔)
          const sAt = (lag: number) => {
            const q = ((b.phase - lag) % 1 + 1) % 1;
            return q < 0.35 ? -Math.cos(Math.PI * (q / 0.35)) : Math.cos(Math.PI * ((q - 0.35) / 0.65));
          };
          // 리커버리 중 블레이드 리프트 험프(0→1→0)
          const lift = b.phase < 0.35 ? 0 : Math.sin(Math.PI * ((b.phase - 0.35) / 0.65));
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
          if (pose === 'finish') {
            // 세리머니 — 상체 뒤로 + 팔 당겨 올림 + 오어 수평
            setT(b.waist, 'x', -0.35);
            setT(b.upperL, 'x', -0.7);
            setT(b.upperR, 'x', -0.7);
            setT(b.foreL, 'x', 0.5);
            setT(b.foreR, 'x', 0.5);
            setT(b.oarL, 'x', 0.2);
            setT(b.oarR, 'x', -0.2);
          } else if (stroke) {
            const sLeg = sAt(0);
            const sBack = sAt(0.05);
            const sArm = sAt(0.12);
            // 다리 드라이브(선행) → 상체 스윙 → 팔 당김(후행) — 로잉 시퀀스
            setT(b.thighL, 'x', -0.12 * sLeg);
            setT(b.thighR, 'x', -0.12 * sLeg);
            setT(b.calfL, 'x', 0.16 * sLeg);
            setT(b.calfR, 'x', 0.16 * sLeg);
            setT(b.waist, 'x', -0.18 * sBack);
            setT(b.upperL, 'x', -0.35 * sArm);
            setT(b.upperR, 'x', -0.35 * sArm);
            setT(b.foreL, 'x', 0.42 * sArm);
            setT(b.foreR, 'x', 0.42 * sArm);
            // 오어: 스윕은 허리와 동기, 리커버리에만 블레이드 리프트
            setT(b.oarR, 'y', 0.45 * sAt(0.05));
            setT(b.oarL, 'y', -0.45 * sAt(0.05));
            setT(b.oarR, 'x', -0.18 * lift);
            setT(b.oarL, 'x', 0.18 * lift);
          }
          const AX: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
          const k = 1 - Math.pow(0.88, dt / 16.7); // 프레임률 독립 스무딩 계수
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
          // 선체 피치 서지(드라이브 반동, 소폭)
          b.inner.rotation.x = MODEL_PITCH + (stroke ? 0.015 * sAt(0.12) : 0);
        } else {
          rig.char.scale.set(charH * rig.aspect, charH, 1);
          // 스트로크 로킹 — 실측 SPM 주기(레이스 포즈만), idle 시 정지
          if (pose === 'race' && !idle) {
            const dur = animationDurationSec(deviceType, rig.spm) * 1000;
            rig.char.rotation.z = Math.sin((t / dur) * TAU) * 0.04;
            rig.char.position.y = Math.abs(Math.sin((t / dur) * TAU)) * -charH * 0.015;
          } else {
            rig.char.rotation.z = 0;
            rig.char.position.y = 0;
          }
        }

        // 이펙트 — 전진 중에만(대기·피니시·idle 제외)
        const moving = pose === 'race' && !idle;
        const pulse = 0.5 + 0.5 * Math.sin(t / 260 + index);
        rig.ring.scale.set(charH * (0.95 + pulse * 0.18), charH * 0.24, 1);
        rig.ring.position.y = charH * 0.02;
        rig.ringMat.opacity = moving ? 0.22 + pulse * 0.18 : 0;
        // 스트릭 — 캐릭터 위(진행 반대 방향)로 페이드(텍스처 자체가 상단 투명)
        rig.streak.scale.set(charH * 0.26, charH * (0.5 + pulse * 0.22), 1);
        rig.streak.position.y = charH * 0.55;
        rig.streakMat.opacity = moving ? 0.14 : 0;

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
        // 3D 모델은 뱃머리가 원점 아래로 나옴 — 칩을 그 아래로
        rig.chip.position.y = rig.model ? -chipS * 0.38 : -chipS * 0.16;

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
