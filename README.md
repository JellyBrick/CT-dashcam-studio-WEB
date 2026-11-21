# CT Dashcam Studio Web (CT Dash Studio WEB)

**License: [GPL-3.0-only](LICENSE)** — original project code; third-party terms and provenance limits: [license audit](LICENSE_AUDIT.md).

> **순수 웹 기술(TypeScript + Canvas + WebCodecs) 기반의 고성능 테슬라 블랙박스 뷰어 및 멀티채널 편집·추출 스튜디오**  
> PC 설치 없이 브라우저(Edge, Chrome 등)에서 바로 테슬라 Dashcam/Sentry 영상 및 실제 차량 텔레메트리(속도, 스티어링 각도, 페달, FSD 모드, 방향지시등, GPS 미니맵)를 동기 재생하고 고화질 MP4로 내보낼 수 있습니다.

내보내기는 합성한 화면을 H.264로 다시 인코딩합니다. 원본 스트림 복사나 무손실 출력이 아니며, 출력 해상도는 선택한 설정을 따릅니다.

---

## 🌟 주요 기능 및 특징

1. **4채널 / 6채널 다중 카메라 동시 동기 재생**
   - **기본 레이아웃 (1:3 세로배치)**: 전방 메인 뷰 + 우측 후방/좌우 리피터 세로 배치
   - **2x2 분할 모드**: 전방/후방, 좌우 리피터 4분할 격자 배치
   - **단일 카메라 풀스크린**: 특정 채널 단독 재생 (더블 클릭 토글)
   - **필러 카메라 PIP 오버레이**: 6채널 하드웨어(HW4 등) 클립 자동 감지 및 메인 화면 우측 하단 PIP 표시

2. **실제 H.264 SEI 메타데이터 디코더 내장**
   - 테슬라 전방 카메라 비디오 스트림에 인코딩된 실제 NAL Unit SEI 패킷 직접 파싱
   - 스피드(km/h), 스티어링 휠 회전 각도, 가속 페달 및 감속 브레이크 상태, 오토파일럿/FSD 상태, 방향지시등 상태 완벽 복원
   - OpenStreetMap(OSM) 기반 인터랙티브 GPS 차량 이동 경로 미니맵 연동

3. **연속 다중 파일 구간 선택 및 단일 MP4 추출**
   - `[ 시작점 (I)` / `] 끝점 (O)` 키 및 버튼을 통한 직관적인 구간 편집
   - **다중 연속 파일 연계 추출**: 여러 1분 단위 클립에 걸친 구간을 하나의 매끄러운 단일 MP4 비디오 파일로 통합 렌더링 및 다운로드
   - 타임라인 및 클립 탐색기 트리 내 선택 구간 실시간 하이라이트 표시
   - **센트리 폴더 통합 재생**: 센트리 이벤트 폴더의 클립들을 하나의 타임라인으로 이어서 재생하고, 구간을 정하지 않으면 폴더 전체를 내보냅니다.
   - PC의 Chrome·Edge에서는 내보내기 전에 저장 위치를 묻고, 그 밖의 브라우저는 다운로드 폴더에 저장합니다.

4. **WebCodecs 초고속 하드웨어 가속 인코딩**
   - 브라우저 내장 하드웨어 비디오 인코더를 [Mediabunny](https://github.com/Vanilagy/mediabunny)로 다뤄 MP4 파일 생성
   - Compact (960x540), HD (1280x720), FHD (1920x1080), QHD (2560x1440) 출력과 최대 5배속 저장 지원

5. **센트리 모션 감지**
   - 센트리 클립을 열면 카메라마다 작은 흑백 화면을 0.5초 간격으로 비교해 움직임이 있었던 구간을 찾습니다.
   - 감도는 낮음·보통·높음·매우 높음 네 단계입니다. 찾은 구간은 타임라인에 빨간 막대로 표시되고, 이전/다음 버튼으로 바로 이동합니다.

6. **얼굴·번호판 모자이크와 번호판 선명화**
   - 오버레이 탭에서 켜면 브라우저 안에서 얼굴은 YuNet 모델로, 차량은 D-FINE nano 모델로 찾습니다. 번호판은 찾은 차량 안에서 한국 번호판 규칙(파이썬판과 같은 규칙)으로 고릅니다. YOLO 모델은 쓰지 않습니다.
   - 모델과 ONNX Runtime Web은 기능을 켤 때만 같은 사이트에서 내려받고, WebGPU가 있으면 GPU로, 없으면 WebAssembly로 실행합니다. 영상은 밖으로 보내지 않습니다.
   - 내보내기 전에 선택 구간을 한 번 훑어 위치만 기록하고, 얼굴이나 번호판이 처음 보이기 0.5초 전부터 사라진 뒤 0.5초까지 가립니다.
   - 번호판 선명화는 번호판 부분의 밝기·대비·선명도를 보정하며, 번호판 모자이크와 함께 쓸 수 없습니다.

7. **클라이언트 사이드 기기 성능 진단 (Device Tier)**
   - CPU 논리 코어 수, 메모리 용량, WebGPU 가속 여부를 실시간 진단하여 High / Medium / Low 티어 판정
   - 인터랙티브 글래스모피즘 툴팁을 통한 상세 진단 사유 및 가이드 제공

---

## 🚀 빠른 시작 가이드

### 개발 환경 실행

```bash
# 의존성 패키지 설치
pnpm install

# 로컬 개발 서버 실행 (기본 포트: 5173)
pnpm dev
```

브라우저에서 `http://localhost:5173` 접속 후 테슬라 USB 드라이브의 `TeslaCam` 폴더를 드래그 앤 드롭하거나 좌측 상단의 **TeslaCam 폴더 지정** 버튼을 클릭하세요.

### 프로덕션 빌드

```bash
pnpm build
```

빌드 결과물은 `dist/` 폴더에 정적 웹 파일로 생성됩니다.

---

## ⌨️ 단축키 안내

| 단축키 | 동작 |
| :--- | :--- |
| <kbd>Space</kbd> | 영상 재생 / 일시정지 |
| <kbd>◀</kbd> / <kbd>▶</kbd> | 1초 전 / 후 탐색 |
| <kbd>Shift</kbd> + <kbd>◀</kbd> / <kbd>▶</kbd> | 5초 전 / 후 고속 탐색 |
| <kbd>Home</kbd> | 현재 클립 0초로 이동 |
| <kbd>[</kbd> / <kbd>]</kbd> | 이전 / 다음 클립으로 전환 |
| <kbd>I</kbd> / <kbd>O</kbd> | 내보낼 구간 시작점(I) / 끝점(O) 설정 |
| <kbd>화면 더블클릭</kbd> | 해당 카메라 단독 풀스크린 전환 / 이전 복귀 |
| <kbd>하단 바 드래그</kbd> | 텔레메트리 표시 순서 좌우 드래그 변경 |
| <kbd>하단 바 더블클릭</kbd> | 텔레메트리 표시 순서 기본 배치로 초기화 |
| <kbd>F1</kbd> 또는 <kbd>?</kbd> | 단축키 및 조작 안내 팝업 |


## 정식판과 테스트판 배포

- `main`: 정식 주소 `/CT-dashcam-studio-WEB/`
- `dev`: 테스트 주소 `/CT-dashcam-studio-WEB/dev/` (Tier 옆에 `DEV` 표시)

일반 수정은 `dev`에서 진행하고 테스트 주소에서 확인한 뒤, 정식 반영할 때 `main`에 병합합니다.
두 브랜치 중 하나에 푸시하면 GitHub Actions가 각 브랜치를 별도로 체크아웃하고 검사·빌드합니다.
Pages는 사이트 전체를 교체하므로, 매번 `main` 빌드를 루트에, `dev` 빌드를 `/dev/`에 함께 배포합니다.
`dev` 빌드가 실패하면 경고만 남기고 `main` 사이트는 그대로 배포합니다. 이때 그 배포에는 `/dev/` 사이트가 빠집니다.
저장소 Settings → Pages의 Source는 GitHub Actions로 설정되어 있어야 합니다.
각 주소의 `deployment.json`에서 배포 채널·소스 브랜치·커밋을 확인할 수 있습니다.

자동 배포 서버에서는 외부 원본 영상이 필요한 SEI 통합 검사를 명시적으로 건너뛰고 나머지 검사를 실행합니다.
원본 영상이 있는 개발 PC에서는 해당 통합 검사도 실행합니다. 다른 경로의 원본을 사용하려면
`CT_TEST_MP4`와 `CT_PYTHON_SOURCE` 환경 변수로 영상 파일과 Python 비교 소스 경로를 지정할 수 있습니다.


## License, privacy and analytics

Original project code is licensed **GPL-3.0-only** where the project owner holds the necessary rights. Copyright remains with the respective holders. Third-party code retains its own licenses; artwork and copied-source provenance issues are explicitly unresolved. No warranty is provided. Using this editor does not relicense your dashcam footage or exported videos.

- [GPLv3 text](LICENSE), [Third-party notices](THIRD_PARTY_NOTICES.md), [License/provenance audit](LICENSE_AUDIT.md)
- [Privacy Policy](PRIVACY.md), [Data-flow audit](PRIVACY_DATA_FLOW.md), [Repository discovery](COMPLIANCE_DISCOVERY.md), [Verification](COMPLIANCE_VERIFICATION.md)
- [DEV privacy policy](https://mhsong282828221212123123123.github.io/CT-dashcam-studio-WEB/dev/?legal=privacy)
- [DEV GPL text](https://mhsong282828221212123123123.github.io/CT-dashcam-studio-WEB/dev/?legal=license)
- [DEV third-party licenses](https://mhsong282828221212123123123.github.io/CT-dashcam-studio-WEB/dev/?legal=third-party)

The viewer retains GA ID `G-E05V74Q9Q7` using worldwide Basic Consent Mode v2 opt-in. Rejection does not gate editing or maps. The compact Privacy & Licenses entry reopens preferences. Legal documents open in a dialog inside the viewer, read straight from the Markdown files in this repository, and can be linked with `?legal=privacy`, `license`, `third-party`, `audit` or `data-flow`. They are canonical English; navigation and consent explanations cover all eight UI languages.

Build: `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build` (includes TypeScript checking). Use `VITE_BASE_PATH=/CT-dashcam-studio-WEB/dev/` for the DEV artifact or `/CT-dashcam-studio-WEB/` for a production-path validation build. Lint and format with `pnpm lint` (oxlint, type-aware) and `pnpm format` (oxfmt). The existing dual-branch workflow remains unchanged. The owner authorized promotion to main on 2026-11-01. Both production and DEV builds include the consent notice and legal documents.

For redistribution, retain LICENSE, THIRD_PARTY_NOTICES.md and licenses/, and provide the corresponding source/build scripts for the exact artifact revision. The license tab links to that revision's source. Resolve the documented artwork/upstream and OSM attribution issues before claiming complete international release clearance.
