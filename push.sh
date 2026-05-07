#!/bin/bash
# 누적된 변경분을 GitHub Pages로 한 방에 보내는 헬퍼.
# 사용법:
#   ./push.sh                    # 메시지를 묻고 push
#   ./push.sh "커밋 메시지"        # 그 메시지로 바로 push
#
# 처음 한 번은 chmod +x push.sh 로 실행 권한 부여 필요.

set -e
cd "$(dirname "$0")"

# 깨끗한지 점검
if [ -z "$(git status --porcelain)" ]; then
  echo "변경사항이 없습니다. push할 것 없음."
  exit 0
fi

echo "▶︎  변경된 파일:"
git status --short
echo ""

# 메시지: 인자로 받거나, 없으면 prompt
if [ -n "$1" ]; then
  msg="$1"
else
  read -p "커밋 메시지 (Enter만 누르면 'update'): " msg
  msg=${msg:-update}
fi

git add .
git commit -m "$msg"
echo ""
echo "▶︎  push 중…"
git push
echo ""
echo "✓ 완료. 1~2분 안에 https://gyu.dev/ 에 자동 배포됩니다."
