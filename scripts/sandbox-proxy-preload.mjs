// 샌드박스 전용: Node fetch(undici)가 HTTPS_PROXY를 타도록 전역 디스패처 설정.
// CI/운영에서는 사용하지 않음 — package.json이 아닌 E2E 로컬 실행 시 NODE_OPTIONS로만 주입.
import { setGlobalDispatcher, EnvHttpProxyAgent } from 'undici';
setGlobalDispatcher(new EnvHttpProxyAgent());
