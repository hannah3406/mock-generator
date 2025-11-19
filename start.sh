#!/bin/bash

echo "🤫 보안 모드: 로컬 AI 엔진(Ollama)을 깨우는 중..."

# 1. Ollama를 백그라운드(&)에서 조용히 실행하고 로그는 버림(> /dev/null)
ollama serve > /dev/null 2>&1 &
OLLAMA_PID=$! # 실행된 Ollama의 프로세스 ID 저장

# 2. Ollama가 켜질 때까지 잠시 대기 (5초)
echo "⏳ 엔진 예열 중..."
sleep 5

# 3. 목업 생성기 (Docker) 실행
echo "🚀 프로젝트 실행! (종료하려면 Ctrl+C)"
docker-compose up

# 4. Docker가 종료되면(Ctrl+C 누르면) 여기로 내려옴
echo "🛑 작업 종료 감지! 흔적 지우는 중..."

# 5. 아까 켜둔 AI 엔진도 같이 강제 종료
kill $OLLAMA_PID

echo "✅ 깔끔하게 종료되었습니다."