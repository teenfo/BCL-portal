# BCL Portal - Race UI/UX 상세 명세서

> Version: 2.0.0  
> Last Updated: 2026-02-16  
> **기반**: 프로토타입 이미지 분석

---

## 📋 목차
- [화면 구조 분석](#화면-구조-분석)
- [UI 컴포넌트 상세](#ui-컴포넌트-상세)
- [시각 효과 및 애니메이션](#시각-효과-및-애니메이션)
- [반응형 레이아웃](#반응형-레이아웃)
- [구현 가이드](#구현-가이드)

---

## 화면 구조 분석

### 전체 레이아웃
```
┌─────────────────────────────────────────────────────────────┐
│                        RACE (헤더)                           │
├─────────────────────────────────────────────────────────────┤
│  상단 정보 패널 (스코어보드)                                  │
│  ┌────┬────┬────┬────────┬────┬────┬────┬────┬────┐        │
│  │ERG3│ERG1│ERG1│1st RANK│ERG5│ERG1│ERG8│...│      │        │
│  │367m│45m │레벨업│30spm  │25m │28sp│372m│   │      │        │
│  └────┴────┴────┴────────┴────┴────┴────┴────┴────┘        │
├─────────────────────────────────────────────────────────────┤
│  진행 바                                                      │
│  REMAINING 333m ████████████░░░░░░ 500m GOAL              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  메인 레이스 영역 (2.5D View)                                │
│                                                              │
│  ERG2  ERG2  ERG3  ERG3  ERG7  ERG9  ERG9                  │
│  381m  385m  381m  248m  295m  287m                         │
│  🏊   🏊   🏊   🏊   🏊   🏊   🏊                          │
│                                                              │
│  [관중 실루엣 애니메이션]                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## UI 컴포넌트 상세

### 1. 헤더 (Header)
```css
.race-header {
  background: linear-gradient(180deg, #0a0e27 0%, #1a1e3e 100%);
  height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.race-title {
  font-family: 'Bebas Neue', 'Arial Black', sans-serif;
  font-size: 48px;
  font-weight: 900;
  letter-spacing: 12px;
  color: #ffffff;
  text-shadow: 
    0 0 20px rgba(255, 107, 0, 0.8),
    0 0 40px rgba(255, 107, 0, 0.5);
}

/* 좌우 장식 조명 */
.header-lights {
  position: absolute;
  width: 100px;
  height: 40px;
  display: flex;
  gap: 15px;
}

.header-lights.left { left: 40px; }
.header-lights.right { right: 40px; }

.light-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(circle, #ffaa00 0%, #ff6b00 100%);
  box-shadow: 
    0 0 10px #ff6b00,
    0 0 20px #ff6b00,
    0 0 30px rgba(255, 107, 0, 0.5);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}
```

### 2. 스코어보드 (Scoreboard)
```typescript
interface ScoreboardItem {
  ergNumber: number;        // ERG 번호
  distance: number;         // 현재 거리 (m)
  rank: number;            // 순위
  spm: number;             // Strokes Per Minute
  power: number;           // 파워 (W)
  timeElapsed: string;     // 경과 시간
  isLeader: boolean;       // 1등 여부
  isLevelUp: boolean;      // 레벨업 상태
}
```

#### 스코어보드 카드 디자인
```html
<!-- 일반 카드 -->
<div class="scoreboard-card">
  <div class="card-header">
    <span class="erg-label">ERG 3</span>
    <span class="distance">367m</span>
  </div>
  <div class="card-stats">
    <span class="time">4:14</span>
    <span class="spm">24 spm</span>
  </div>
  <div class="card-power">
    <span class="power-icon">⚡</span>
    <span class="power-value">115</span>
    <span class="power-watts">101w</span>
  </div>
</div>

<!-- 1등 카드 (강조) -->
<div class="scoreboard-card leader">
  <div class="card-header leader-header">
    <span class="erg-label">ERG 1</span>
    <span class="rank-badge">
      <span class="rank-arrow">⬆</span>
      <span class="rank-text">1st</span>
    </span>
  </div>
  <div class="card-stats">
    <span class="time">2:15</span>
    <span class="spm">30 spm</span>
  </div>
  <div class="card-power leader-power">
    <span class="power-icon">⚡</span>
    <span class="level-up">LEVEL UP!</span>
    <span class="level-arrow">▼</span>
  </div>
</div>
```

#### CSS 스타일
```css
.scoreboard-card {
  width: 140px;
  height: 120px;
  background: linear-gradient(135deg, 
    rgba(26, 30, 62, 0.9) 0%, 
    rgba(20, 24, 50, 0.9) 100%);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.scoreboard-card:hover {
  transform: translateY(-5px);
  border-color: rgba(255, 107, 0, 0.5);
  box-shadow: 0 8px 20px rgba(255, 107, 0, 0.3);
}

/* 일반 카드 색상 (ERG 번호별) */
.scoreboard-card[data-erg="1"] .card-header { border-left: 3px solid #4ade80; }
.scoreboard-card[data-erg="2"] .card-header { border-left: 3px solid #60a5fa; }
.scoreboard-card[data-erg="3"] .card-header { border-left: 3px solid #f59e0b; }
/* ... 나머지 ERG */

/* 1등 카드 */
.scoreboard-card.leader {
  background: linear-gradient(135deg, 
    rgba(220, 38, 38, 0.3) 0%, 
    rgba(153, 27, 27, 0.3) 100%);
  border: 2px solid rgba(239, 68, 68, 0.6);
  box-shadow: 
    0 0 20px rgba(239, 68, 68, 0.4),
    0 8px 20px rgba(0, 0, 0, 0.3);
  animation: leader-glow 2s ease-in-out infinite;
}

@keyframes leader-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.6); }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.erg-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  text-transform: uppercase;
}

.distance {
  font-size: 20px;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.card-stats {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.time {
  font-weight: 700;
}

.spm {
  font-weight: 600;
}

.card-power {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.power-icon {
  font-size: 16px;
  color: #fbbf24;
}

.power-value {
  font-size: 18px;
  font-weight: 900;
  color: #4ade80;
}

.power-watts {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

/* 레벨업 애니메이션 */
.level-up {
  font-size: 16px;
  font-weight: 900;
  color: #fbbf24;
  text-shadow: 
    0 0 10px rgba(251, 191, 36, 0.8),
    0 0 20px rgba(251, 191, 36, 0.5);
  animation: level-up-flash 1s ease-in-out infinite;
}

@keyframes level-up-flash {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

.rank-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border-radius: 4px;
  font-weight: 900;
  color: #1a1e3e;
}

.rank-arrow {
  animation: bounce-arrow 1s ease-in-out infinite;
}

@keyframes bounce-arrow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
```

### 3. 진행 바 (Progress Bar)
```html
<div class="progress-container">
  <div class="progress-label left">
    REMAINING <span class="remaining-value">333m</span>
  </div>
  
  <div class="progress-bar-wrapper">
    <div class="progress-bar">
      <!-- 거리 마커 -->
      <div class="distance-marker" style="left: 0%">0</div>
      <div class="distance-marker" style="left: 20%">100</div>
      <div class="distance-marker" style="left: 40%">200</div>
      <div class="distance-marker" style="left: 60%">300</div>
      <div class="distance-marker" style="left: 80%">400</div>
      <div class="distance-marker" style="left: 100%">500</div>
      
      <!-- 진행 바 -->
      <div class="progress-fill" style="width: 67%"></div>
      
      <!-- 현재 위치 인디케이터 -->
      <div class="current-position" style="left: 67%">
        <div class="position-marker"></div>
      </div>
    </div>
  </div>
  
  <div class="progress-label right">
    <span class="goal-value">500m</span> GOAL
  </div>
</div>
```

```css
.progress-container {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 40px;
  background: rgba(10, 14, 39, 0.8);
  backdrop-filter: blur(10px);
}

.progress-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.remaining-value,
.goal-value {
  font-size: 24px;
  font-weight: 900;
  color: #ffffff;
  margin: 0 4px;
}

.progress-bar-wrapper {
  flex: 1;
  position: relative;
  height: 40px;
}

.progress-bar {
  position: relative;
  width: 100%;
  height: 20px;
  background: linear-gradient(90deg, 
    rgba(74, 222, 128, 0.2) 0%,
    rgba(59, 130, 246, 0.2) 30%,
    rgba(251, 191, 36, 0.2) 60%,
    rgba(239, 68, 68, 0.2) 100%);
  border-radius: 10px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  overflow: visible;
}

.distance-marker {
  position: absolute;
  top: -25px;
  transform: translateX(-50%);
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, 
    #4ade80 0%,
    #3b82f6 30%,
    #fbbf24 60%,
    #ef4444 100%);
  border-radius: 8px;
  transition: width 0.5s ease-out;
  box-shadow: 
    0 0 10px rgba(74, 222, 128, 0.5),
    0 4px 10px rgba(0, 0, 0, 0.3);
}

.current-position {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  transition: left 0.5s ease-out;
}

.position-marker {
  width: 16px;
  height: 16px;
  background: #ffffff;
  border: 3px solid #ff6b00;
  border-radius: 50%;
  box-shadow: 
    0 0 15px rgba(255, 107, 0, 0.8),
    0 0 25px rgba(255, 107, 0, 0.5);
  animation: marker-pulse 1.5s ease-in-out infinite;
}

@keyframes marker-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}
```

### 4. 메인 레이스 영역 (2.5D Canvas)
```typescript
// Three.js 씬 구성
class RaceVisualization {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  
  constructor(canvas: HTMLCanvasElement) {
    // Scene 설정
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e27);
    this.scene.fog = new THREE.Fog(0x0a0e27, 30, 80);
    
    // Camera 설정 (2.5D 각도)
    this.camera = new THREE.PerspectiveCamera(50, 16/9, 0.1, 200);
    this.camera.position.set(0, 20, 35);
    this.camera.lookAt(0, 0, -10);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(1920, 1080);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    this.setupLighting();
    this.createWaterEnvironment();
    this.createStadiumCrowd();
  }
  
  setupLighting() {
    // 환경광
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambient);
    
    // 주 조명 (위에서)
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(0, 30, 10);
    mainLight.castShadow = true;
    mainLight.shadow.camera.left = -40;
    mainLight.shadow.camera.right = 40;
    mainLight.shadow.camera.top = 40;
    mainLight.shadow.camera.bottom = -40;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    this.scene.add(mainLight);
    
    // 스포트라이트 (각 레인)
    for (let i = 0; i < 9; i++) {
      const spotlight = new THREE.SpotLight(0xff6b00, 0.4);
      spotlight.position.set(0, 15, i * 4 - 16);
      spotlight.angle = Math.PI / 8;
      spotlight.penumbra = 0.5;
      spotlight.decay = 2;
      spotlight.distance = 50;
      this.scene.add(spotlight);
    }
    
    // 후면 림라이트
    const rimLight = new THREE.DirectionalLight(0x4a90e2, 0.3);
    rimLight.position.set(0, 5, -20);
    this.scene.add(rimLight);
  }
  
  createWaterEnvironment() {
    // 물 표면
    const waterGeometry = new THREE.PlaneGeometry(80, 60);
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x0066aa,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.5;
    water.receiveShadow = true;
    this.scene.add(water);
    
    // 레인 구분선
    for (let i = 0; i < 10; i++) {
      const laneGeometry = new THREE.BoxGeometry(80, 0.2, 0.1);
      const laneMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5
      });
      const lane = new THREE.Mesh(laneGeometry, laneMaterial);
      lane.position.set(0, 0, i * 4 - 18);
      this.scene.add(lane);
    }
    
    // 풀 바닥 그리드
    const gridHelper = new THREE.GridHelper(60, 30, 0x444444, 0x222222);
    gridHelper.position.y = -1;
    this.scene.add(gridHelper);
  }
  
  createStadiumCrowd() {
    // 관중 실루엣 (파티클 시스템)
    const crowdCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(crowdCount * 3);
    const colors = new Float32Array(crowdCount * 3);
    
    for (let i = 0; i < crowdCount; i++) {
      const i3 = i * 3;
      
      // X: 좌우 배치
      positions[i3] = (Math.random() - 0.5) * 50;
      // Y: 높이 (계단식)
      positions[i3 + 1] = Math.random() * 3 + 8;
      // Z: 앞쪽 (관중석)
      positions[i3 + 2] = Math.random() * 10 + 30;
      
      // 색상 (어두운 실루엣)
      const brightness = Math.random() * 0.1 + 0.05;
      colors[i3] = brightness;
      colors[i3 + 1] = brightness;
      colors[i3 + 2] = brightness;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });
    
    const crowd = new THREE.Points(geometry, material);
    this.scene.add(crowd);
    
    // 관중 애니메이션 (흔들림)
    this.animateCrowd(crowd);
  }
  
  animateCrowd(crowd: THREE.Points) {
    const positions = crowd.geometry.attributes.position.array;
    let offset = 0;
    
    const animate = () => {
      offset += 0.02;
      
      for (let i = 0; i < positions.length; i += 3) {
        const i3 = i;
        positions[i3 + 1] += Math.sin(offset + i * 0.1) * 0.02;
      }
      
      crowd.geometry.attributes.position.needsUpdate = true;
      requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  addRower(ergNumber: number, laneIndex: number, distance: number) {
    // 캐릭터 로드 (GLTF)
    const loader = new GLTFLoader();
    loader.load('/models/rower-character.glb', (gltf) => {
      const character = gltf.scene;
      
      // 위치 설정
      const x = (distance / 500) * 60 - 30; // 거리에 따른 X 좌표
      const z = laneIndex * 4 - 16;         // 레인에 따른 Z 좌표
      
      character.position.set(x, 0, z);
      character.scale.set(1.5, 1.5, 1.5);
      character.castShadow = true;
      
      // 애니메이션 믹서
      const mixer = new THREE.AnimationMixer(character);
      const action = mixer.clipAction(gltf.animations[0]); // Rowing 애니메이션
      action.play();
      
      this.scene.add(character);
      
      // ERG 라벨 추가
      this.addErgLabel(character, ergNumber, distance);
      
      // 물보라 효과 추가
      this.addWaterSplash(character);
    });
  }
  
  addErgLabel(character: THREE.Object3D, ergNumber: number, distance: number) {
    // Canvas 텍스처로 라벨 생성
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    // 배경
    ctx.fillStyle = 'rgba(74, 222, 128, 0.9)';
    ctx.fillRect(0, 0, 256, 128);
    
    // ERG 번호
    ctx.fillStyle = '#1a1e3e';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`ERG ${ergNumber}`, 128, 50);
    
    // 거리
    ctx.font = 'bold 30px Arial';
    ctx.fillText(`${distance}m`, 128, 90);
    
    // Sprite 생성
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 2, 1);
    sprite.position.set(0, 3, 0);
    
    character.add(sprite);
  }
  
  addWaterSplash(character: THREE.Object3D) {
    // 물보라 파티클
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0x4a90e2,
      size: 0.2,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    const splash = new THREE.Points(geometry, material);
    splash.position.set(0, 0, -0.5);
    character.add(splash);
    
    // 파티클 애니메이션
    this.animateSplash(splash);
  }
  
  animateSplash(splash: THREE.Points) {
    const positions = splash.geometry.attributes.position.array;
    
    const animate = () => {
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] -= 0.05;     // X (뒤로)
        positions[i + 1] += 0.02; // Y (위로)
        
        // 경계를 벗어나면 리셋
        if (positions[i] < -1) {
          positions[i] = 1;
          positions[i + 1] = 0;
        }
      }
      
      splash.geometry.attributes.position.needsUpdate = true;
    };
    
    setInterval(animate, 16); // ~60fps
  }
}
```

---

## 시각 효과 및 애니메이션

### 1. 물 표면 셰이더
```glsl
// Water Vertex Shader
varying vec2 vUv;
varying float vElevation;
uniform float uTime;

void main() {
  vUv = uv;
  
  vec3 pos = position;
  
  // 물결 효과
  float wave1 = sin(pos.x * 0.5 + uTime) * 0.1;
  float wave2 = sin(pos.z * 0.3 + uTime * 0.7) * 0.05;
  
  pos.y += wave1 + wave2;
  vElevation = wave1 + wave2;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

// Water Fragment Shader
varying vec2 vUv;
varying float vElevation;
uniform float uTime;

void main() {
  // 물 색상 (깊이에 따라 변화)
  vec3 waterColor = mix(
    vec3(0.0, 0.4, 0.7),  // 깊은 파란색
    vec3(0.2, 0.6, 0.9),  // 밝은 파란색
    vElevation + 0.5
  );
  
  // 반짝임 효과
  float sparkle = sin(vUv.x * 50.0 + uTime * 2.0) * 
                  sin(vUv.y * 50.0 + uTime * 2.0);
  sparkle = max(sparkle, 0.0) * 0.3;
  
  vec3 finalColor = waterColor + vec3(sparkle);
  
  gl_FragColor = vec4(finalColor, 0.9);
}
```

### 2. 포스트 프로세싱 (Bloom)
```typescript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

class PostProcessing {
  composer: EffectComposer;
  
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer);
    
    // 기본 렌더 패스
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);
    
    // Bloom 효과 (빛나는 효과)
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,  // Strength
      0.4,  // Radius
      0.85  // Threshold
    );
    this.composer.addPass(bloomPass);
  }
  
  render() {
    this.composer.render();
  }
}
```

### 3. 1등 강조 효과
```typescript
function highlightLeader(character: THREE.Object3D) {
  // 황금 후광 효과
  const geometry = new THREE.RingGeometry(2, 2.5, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  });
  
  const halo = new THREE.Mesh(geometry, material);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 3;
  character.add(halo);
  
  // 회전 애니메이션
  gsap.to(halo.rotation, {
    z: Math.PI * 2,
    duration: 3,
    repeat: -1,
    ease: "none"
  });
  
  // 펄스 애니메이션
  gsap.to(halo.scale, {
    x: 1.2,
    y: 1.2,
    duration: 1,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut"
  });
}
```

---

## 반응형 레이아웃

### 미디어 쿼리
```css
/* 대형 화면 (1920x1080 기준) */
@media (min-width: 1920px) {
  .race-container {
    width: 1920px;
    height: 1080px;
  }
  
  .scoreboard-card {
    width: 140px;
    height: 120px;
  }
}

/* 중형 화면 (1280x720) */
@media (max-width: 1919px) and (min-width: 1280px) {
  .race-container {
    width: 1280px;
    height: 720px;
  }
  
  .scoreboard-card {
    width: 100px;
    height: 90px;
    font-size: 12px;
  }
  
  .race-title {
    font-size: 36px;
  }
}

/* 소형 화면 (태블릿) */
@media (max-width: 1279px) {
  .scoreboard-container {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .scoreboard-card {
    width: 90px;
    height: 80px;
    font-size: 10px;
  }
  
  .progress-container {
    flex-direction: column;
  }
}
```

---

## 구현 가이드

### 1. 프로젝트 구조
```
src/
├── components/
│   ├── Race/
│   │   ├── RaceHeader.tsx
│   │   ├── Scoreboard.tsx
│   │   ├── ScoreboardCard.tsx
│   │   ├── ProgressBar.tsx
│   │   └── RaceCanvas.tsx
│   └── shared/
│       └── AnimatedText.tsx
├── lib/
│   ├── three/
│   │   ├── RaceScene.ts
│   │   ├── WaterShader.ts
│   │   ├── CharacterLoader.ts
│   │   └── ParticleSystem.ts
│   └── websocket/
│       └── RaceWebSocket.ts
└── styles/
    └── race.css
```

### 2. 데이터 흐름
```typescript
WebSocket 데이터 수신
  ↓
상태 관리 (Zustand/Jotai)
  ↓
React 컴포넌트 업데이트
  ├─ Scoreboard (2D UI)
  ├─ ProgressBar (2D UI)
  └─ RaceCanvas (3D Scene)
      └─ Three.js 객체 위치 업데이트
```

### 3. 성능 최적화
```typescript
// 1. 렌더링 최적화
React.memo(ScoreboardCard);

// 2. Three.js FPS 제한
let lastTime = 0;
const targetFPS = 60;
const frameInterval = 1000 / targetFPS;

function animate(currentTime: number) {
  requestAnimationFrame(animate);
  
  const deltaTime = currentTime - lastTime;
  
  if (deltaTime < frameInterval) return;
  
  lastTime = currentTime - (deltaTime % frameInterval);
  
  // 렌더링 로직
  composer.render();
}

// 3. WebSocket 데이터 Throttling
import { throttle } from 'lodash';

const updateRaceData = throttle((data) => {
  // 상태 업데이트
}, 100); // 100ms마다 최대 1회
```

### 4. 필수 라이브러리
```json
{
  "dependencies": {
    "three": "^0.160.0",
    "gsap": "^3.12.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.95.0",
    "zustand": "^4.4.0",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "@types/three": "^0.160.0",
    "@types/lodash": "^4.14.202"
  }
}
```

---

## 체크리스트

### UI 컴포넌트
- [ ] 헤더 (RACE 타이틀 + 조명)
- [ ] 스코어보드 카드 (9개)
- [ ] 진행 바 (거리 마커 포함)
- [ ] 메인 레이스 캔버스

### Three.js 씬
- [ ] 물 표면 (셰이더)
- [ ] 레인 구분선
- [ ] 조명 시스템
- [ ] 캐릭터 모델 로드
- [ ] 물보라 파티클
- [ ] 관중 실루엣

### 애니메이션
- [ ] 스코어보드 카드 호버
- [ ] 1등 강조 효과 (Glow)
- [ ] 레벨업 플래시
- [ ] 진행 바 부드러운 이동
- [ ] 캐릭터 Rowing 애니메이션
- [ ] 관중 흔들림 효과

### 성능
- [ ] FPS 60 유지
- [ ] WebSocket Throttling
- [ ] React 메모이제이션
- [ ] Three.js LOD (필요시)

---

**문서 버전:** 2.0.0  
**최종 업데이트:** 2026년 2월 16일  
**기반 이미지**: Race UI Prototype Screenshot
