#!/bin/sh
# Membuat role pemilik skema dan role aplikasi (technical-specs 06 DM-09, 6.12 MS-03).
# Dijalankan image postgres sekali, saat volume data masih kosong.
# Password dibaca dari file secret (CIKAL_*_PASSWORD_FILE, server) atau env literal (CIKAL_*_PASSWORD, dev).
set -eu

secret() {
  file=$(printenv "$1_FILE" || true)
  if [ -n "$file" ]; then cat "$file"; else printenv "$1"; fi
}

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v dbname="$POSTGRES_DB" \
  -v owner_password="$(secret CIKAL_OWNER_PASSWORD)" \
  -v app_password="$(secret CIKAL_APP_PASSWORD)" <<'SQL'
CREATE ROLE cikal_owner LOGIN PASSWORD :'owner_password';
CREATE ROLE cikal_app LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD :'app_password';
ALTER DATABASE :"dbname" OWNER TO cikal_owner;
SQL
