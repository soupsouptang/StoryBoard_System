#!/usr/bin/env bash
# Run on the existing internal application host with sudo.
set -Eeuo pipefail
ARCHIVE="${1:?Usage: deploy_flow_static.sh archive expected_sha256}"
EXPECTED="${2:?Expected SHA256 required}"
APP=/mnt/Media2/Apps/storyboard/app
test -f "$APP/server.py"
test -d "$APP/static"
test "$(sha256sum "$ARCHIVE" | cut -d ' ' -f 1)" = "$EXPECTED"
STAGE=$(mktemp -d /mnt/Media2/Apps/storyboard/flow-stage.XXXXXX)
tar -xzf "$ARCHIVE" --no-same-owner -C "$STAGE"
test -f "$STAGE/static/workspace-flow.css"
test -f "$STAGE/static/workspace-flow-pages.css"
test -f "$STAGE/static/index.html"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP="$APP/static.before-flow-$STAMP"
mv "$APP/static" "$BACKUP"
rollback() {
  status=$?
  if [ "$status" -ne 0 ]; then
    test ! -d "$APP/static" || mv "$APP/static" "$APP/static.failed-flow-$STAMP"
    mv "$BACKUP" "$APP/static"
    echo 'Restored previous static files' >&2
  fi
  exit "$status"
}
trap rollback EXIT
mv "$STAGE/static" "$APP/static"
chmod -R a+rX "$APP/static"
curl -fsS --max-time 10 http://127.0.0.1:18765/healthz >/dev/null
curl -fsS --max-time 10 http://127.0.0.1:18765/workspace-flow.css | grep -q 'Flow reference'
trap - EXIT
printf 'DEPLOYED static UI; rollback copy: %s\n' "$BACKUP"
