# Caddy CORS Proxy — Fully Kiosk

פרוקסי הפוך שמוסיף כותרות CORS לתקשורת עם Fully Kiosk Browser REST API.

## דרישות

- [Caddy](https://caddyserver.com/docs/install) מותקן ונגיש ב-PATH
- Fully Kiosk Browser פועל על המכשיר

---

## הפעלה מהירה

```bash
caddy run --config Caddyfile
```

ואז בממשק הניהול מזינים: `http://localhost:8765`

---

## משתני סביבה

| משתנה | ברירת מחדל | תיאור |
|---|---|---|
| `KIOSK_URL` | `http://localhost:2323` | כתובת המכשיר / פרוקסי |
| `PROXY_PORT` | `8765` | פורט מאזין מקומי |

**דוגמאות:**

```bash
# כתובת IP ישירה ברשת מקומית
KIOSK_URL=http://192.168.1.50:2323 caddy run --config Caddyfile

# דרך Cloudflare Tunnel
KIOSK_URL=https://kiosk-admin.example.com caddy run --config Caddyfile

# פורט מותאם
PROXY_PORT=9000 caddy run --config Caddyfile
```

---

## הגדרה כסרוויס ב-Termux

### 1. התקנה

```bash
pkg install caddy termux-services
```

### 2. העתקת קובץ התצורה

```bash
cp /path/to/Caddyfile ~/caddy/Caddyfile
```

### 3. יצירת הסרוויס

הסרוויסים של termux-services נמצאים ב-`$PREFIX/var/service/`:

```bash
mkdir -p $PREFIX/var/service/caddy/log

cat > $PREFIX/var/service/caddy/run << 'EOF'
#!/data/data/com.termux/files/usr/bin/sh
exec caddy run --config /data/data/com.termux/files/home/caddy/Caddyfile 2>&1
EOF

cat > $PREFIX/var/service/caddy/log/run << 'EOF'
#!/data/data/com.termux/files/usr/bin/sh
exec svlogd -tt /data/data/com.termux/files/usr/var/log/caddy
EOF

chmod +x $PREFIX/var/service/caddy/run
chmod +x $PREFIX/var/service/caddy/log/run
```

### 4. הפעלה

```bash
sv up caddy       # הפעל עכשיו
```

### 5. פקודות ניהול

```bash
sv status caddy   # בדוק סטטוס
sv down caddy     # עצור
sv restart caddy  # הפעל מחדש
```

---

## הפעלה עם Termux:Boot (בהדלקת המכשיר)

1. התקן את אפליקציית **Termux:Boot** מ-F-Droid
2. פתח את Termux:Boot פעם אחת כדי לרשום אותה
3. בהגדרות Android — אפשר ל-Termux **הפעלה ברקע** ו**הפעלה עם האתחול**
4. הסרוויסים של `termux-services` יעלו אוטומטית עם הפעלת המכשיר

> **שים לב:** ב-Android 12+ יתכן שיש להגדיר גם חריג מ-Battery Optimization עבור Termux.
