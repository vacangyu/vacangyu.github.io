#!/bin/bash
# 로컬 테스트용 정적 서버. site/ 디렉토리에서 실행.
# fetch가 file:// 에서 안 돌기 때문에 .md 로딩이 안 되어, 정적 서버가 필요.
cd "$(dirname "$0")"
echo "▶︎  http://localhost:8080/d/"
echo "▶︎  http://localhost:8080/g/"
echo "▶︎  같은 Wi-Fi 휴대폰: http://192.168.0.24:8080/d/"
echo "▶︎  같은 Wi-Fi 휴대폰: http://192.168.0.24:8080/g/"
echo ""
python3 -m http.server 8080
