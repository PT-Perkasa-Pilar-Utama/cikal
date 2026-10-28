# Image cikal-postgres untuk VM data production (DEPLOYMENT_PLAN §2.2, §3.9): PostgreSQL 17.6 dengan pgBackRest.
# Arsip WAL ke repo offsite tiap segmen, paling lambat 5 menit sekali (archive_timeout=300, RPO NF-21).
# Konfigurasi repo dibaca dari /etc/pgbackrest/pgbackrest.conf yang di-mount compose dari secrets/pgbackrest.conf.

FROM postgres:17.6-bookworm
RUN apt-get update \
  && apt-get install -y --no-install-recommends pgbackrest \
  && rm -rf /var/lib/apt/lists/* \
  && install -d -o postgres -g postgres -m 750 /var/log/pgbackrest /var/lib/pgbackrest /var/spool/pgbackrest
CMD ["postgres", \
  "-c", "wal_level=replica", \
  "-c", "archive_mode=on", \
  "-c", "archive_command=pgbackrest --stanza=cikal archive-push %p", \
  "-c", "archive_timeout=300"]
