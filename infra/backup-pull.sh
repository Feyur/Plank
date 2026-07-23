#!/bin/sh
# Забирает бэкапы с сервера на локальную машину (offsite-копия).
# Запускать с рабочей машины: ./infra/backup-pull.sh [ssh-host]
set -eu

HOST="${1:-vps3}"
DEST="$HOME/Backups/plank"
mkdir -p "$DEST"

rsync -av --ignore-existing "$HOST:/opt/plank/backups/" "$DEST/"
echo "Локальные копии: $DEST"
ls -lht "$DEST" | head -5
