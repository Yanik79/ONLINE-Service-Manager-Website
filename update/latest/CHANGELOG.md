# ONLINE Service Manager 1.0.18

Published: 2026-07-28T14:09:17
Channel: stable

## Changes
- Призначення:
- - єдина production-адреса Oracle Cloud для heartbeat, API та Repair Portal;
- - заборона localhost, loopback і приватних LAN-адрес у клієнтських QR;
- - видалено fallback http://127.0.0.1:8088;
- - виправлено помилку невизначеної змінної publish_result під час створення нового токена;
- - існуючий токен зберігається, але URL QR перебудовується на Oracle Cloud.
