# Mini Galaga

Mini Galaga는 `HTML`, `CSS`, `JavaScript`로 만든 브라우저 기반 아케이드 슈팅 게임입니다.
프론트엔드는 정적 파일로 실행하고, 백엔드는 FastAPI와 SQLite로 게임 점수를 저장합니다.

## 프로젝트 구조

```text
.
|-- README.md
|-- backend/
|   |-- app.py
|   |-- requirements.txt
|   |-- scores.db
|   `-- .venv/
|-- frontend/
|   |-- audio.js
|   |-- config.js
|   |-- game.js
|   |-- index.html
|   `-- style.css
|-- .github/
`-- .codex/
```

## 프론트엔드

- `frontend/index.html`: 게임 화면과 HUD
- `frontend/style.css`: 레이아웃과 화면 스타일
- `frontend/config.js`: 게임 공통 설정과 백엔드 API 주소
- `frontend/audio.js`: 효과음과 배경음 제어
- `frontend/game.js`: 게임 루프, 입력 처리, 충돌 처리, 렌더링, 점수 저장 요청

## 백엔드

- `backend/app.py`: 점수 저장과 조회를 담당하는 FastAPI 서버
- `backend/requirements.txt`: 백엔드 Python 의존성 목록
- `backend/scores.db`: 실행 중 생성되는 SQLite 데이터베이스 파일

## 실행 방법

### 프론트엔드만 실행

`frontend/index.html` 파일을 브라우저에서 직접 열면 게임을 실행할 수 있습니다.
프론트엔드 스크립트는 서버 없이도 동작하도록 일반 `<script>` 방식으로 연결되어 있습니다.

정적 서버로 실행하고 싶다면 프로젝트 루트에서 아래 명령어를 실행합니다.

```bash
python -m http.server 8000
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:8000/frontend/
```

### 백엔드 API 실행 - uv 사용

백엔드는 `uv`를 기준으로 실행합니다.

```bash
cd backend
uv venv
uv pip install -r requirements.txt
uv run uvicorn app:app --reload --host 127.0.0.1 --port 8001
```

API 기본 주소는 아래와 같습니다.

```text
http://127.0.0.1:8001
```

## 점수 저장 흐름

1. 게임이 종료되면 프론트엔드의 `gameOver()`가 실행됩니다.
2. `frontend/game.js`가 `POST http://127.0.0.1:8001/scores`로 최종 점수를 전송합니다.
3. 백엔드의 `backend/app.py`가 요청을 검증합니다.
4. 검증된 점수는 SQLite의 `scores` 테이블에 저장됩니다.
5. 저장된 점수는 `GET /scores`로 조회할 수 있습니다.

## 백엔드 API

### 상태 확인

```http
GET /health
```

응답 예시:

```json
{
  "status": "ok"
}
```

### 점수 저장

```http
POST /scores
```

요청 예시:

```json
{
  "player_name": "guest",
  "score": 1200,
  "stage": 2,
  "wave": 5
}
```

응답 예시:

```json
{
  "id": 1,
  "player_name": "guest",
  "score": 1200,
  "stage": 2,
  "wave": 5,
  "created_at": "2026-06-30T08:00:00+00:00"
}
```

### 점수 목록 조회

```http
GET /scores?limit=10
```

점수는 높은 점수 순서로 조회됩니다.

## 조작 방법

- `Left / Right` 또는 `A / D`: 이동
- `Space`: 발사
- `P`: 일시정지
- `Enter`: 재시작
- 모바일에서는 캔버스 아래 터치 버튼 사용

## 게임 흐름

- 게임은 3개 스테이지로 구성됩니다.
- `Stage 1`: wave 1-4
- `Stage 2`: wave 5-8
- `Stage 3`: wave 9부터 진행
- 보스 wave는 4번째 wave마다 등장합니다.

## 적 종류

- `scout`
- `fighter`
- `tank`
- `sniper`
- `splitter`
- `boss`

## 파워업

- `shield`
- `rapid`
- `spread`
- `score x2`
- `bomb`

## 참고 사항

- 현재 브라우저 최고 점수는 `localStorage`에도 저장됩니다.
- 서버 저장 점수는 `backend/scores.db`에 저장됩니다.
- 백엔드 서버가 실행 중이 아니어도 게임 자체는 계속 동작합니다.
- 백엔드 주소는 `frontend/config.js`의 `SCORE_API_URL`에서 변경할 수 있습니다.
