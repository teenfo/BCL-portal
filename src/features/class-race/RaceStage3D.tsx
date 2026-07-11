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
  rowerCharSrc,
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
  /** 3D 로워 모델(rower.glb 클론) — 로드 완료 후 부착. 본 절차 애니메이션용 참조 포함 */
  model: THREE.Group | null;
  bones: {
    inner: THREE.Group;
    torso: THREE.Bone | null;
    oarL: THREE.Bone | null;
    oarR: THREE.Bone | null;
    armR: THREE.Bone | null;
    neck: THREE.Bone | null;
    rest: Map<THREE.Bone, THREE.Euler>;
  } | null;
}

/** rower.glb(UniRig) 본 매핑 — 월드 좌표 분석 기준(스크래치 bones2.json) */
const BONE = {
  torso: 'Bone_005', // 척추 중단 — 전후 스윙
  oarL: 'Bone_017', // 좌측 오어락 피벗(팔+오어 스킨)
  oarR: 'Bone_019', // 우측 오어락 피벗
  armR: 'Bone_021', // 우측 어깨(보조)
  neck: 'Bone_015',
} as const;
/** 모델 기본 자세 — 뱃머리(+z)가 화면 아래(시청자)를 향하도록 피치 */
const MODEL_PITCH = 0.34;
/** 모델 원본 높이(선체~머리, bbox y) — 화면 스케일 환산 기준 */
const MODEL_H = 1.7;

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

    // ── 3D 로워 모델(GLB, Draco) — 1회 로드 후 레인별 SkeletonUtils.clone ──
    const draco = new DRACOLoader().setDecoderPath('/draco/');
    const gltfLoader = new GLTFLoader().setDRACOLoader(draco);
    let modelTemplate: THREE.Group | null = null;
    let modelOffset = new THREE.Vector3();
    gltfLoader.load('/race/rower.glb', (g) => {
      const box = new THREE.Box3().setFromObject(g.scene);
      const c = box.getCenter(new THREE.Vector3());
      // 하단 중앙(수면 접점) 원점 정렬 오프셋
      modelOffset = new THREE.Vector3(-c.x, -box.min.y, -c.z);
      modelTemplate = g.scene;
    });
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
        bones: null,
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
          // 3D 모델 경로 — 템플릿 로드 전에는 2D 컷아웃 폴백(로드 완료 시 교체)
          if (!rig.model && modelTemplate) {
            const model = cloneSkinned(modelTemplate) as THREE.Group;
            const inner = new THREE.Group();
            model.position.copy(modelOffset);
            inner.add(model);
            inner.rotation.x = MODEL_PITCH;
            const find = (n: string) => (model.getObjectByName(n) as THREE.Bone | undefined) ?? null;
            const bones = {
              inner,
              torso: find(BONE.torso),
              oarL: find(BONE.oarL),
              oarR: find(BONE.oarR),
              armR: find(BONE.armR),
              neck: find(BONE.neck),
              rest: new Map<THREE.Bone, THREE.Euler>(),
            };
            for (const b of [bones.torso, bones.oarL, bones.oarR, bones.armR, bones.neck]) {
              if (b) bones.rest.set(b, b.rotation.clone());
            }
            rig.model = inner;
            rig.bones = bones;
            rig.group.add(inner);
            rig.char.visible = false;
          }
          if (!rig.model) {
            ensureCharTexture(rig, `${index % 7}:${pose}`, rowerCharSrc(index, pose), '');
          }
        } else {
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
        if (rig.model && rig.bones) {
          // 3D 모델 — 화면 높이 환산 스케일 + 본 절차 스트로크(SPM 동기)
          const ms = (charH / MODEL_H) * 0.58;
          rig.model.scale.set(ms, ms, ms);
          const b = rig.bones;
          const stroke = pose === 'race' && !idle;
          const dur = animationDurationSec(deviceType, rig.spm) * 1000;
          const ph = (t / dur) * TAU;
          const drive = stroke ? Math.sin(ph) : 0; // +드라이브 / -리커버리
          const dip = stroke ? Math.sin(ph - 1.1) : 0;
          const setD = (bone: THREE.Bone | null, ax: 'x' | 'y' | 'z', delta: number) => {
            if (!bone) return;
            const rest = b.rest.get(bone);
            if (rest) bone.rotation[ax] = rest[ax] + delta;
          };
          // 상체 전후 스윙 + 목 보정
          setD(b.torso, 'x', pose === 'finish' ? -0.22 : 0.2 * drive);
          setD(b.neck, 'x', pose === 'finish' ? -0.1 : -0.08 * drive);
          // 오어 스윕(오어락 피벗, 좌우 미러) + 블레이드 딥
          setD(b.oarL, 'y', 0.32 * drive);
          setD(b.oarR, 'y', -0.32 * drive);
          setD(b.oarL, 'x', 0.12 * dip);
          setD(b.oarR, 'x', 0.12 * dip);
          setD(b.armR, 'y', -0.15 * drive);
          // 선체 피치 서지(드라이브 반동)
          b.inner.rotation.x = MODEL_PITCH + (stroke ? 0.02 * Math.sin(ph - 0.7) : 0);
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
