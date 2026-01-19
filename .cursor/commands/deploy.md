---
description: פריסה ל-Cloudflare Pages
---

תהליך הפריסה מוגדר כרגע לעבוד אוטומטית מול GitHub, אך ניתן גם לפרוס ידנית.

### פריסה אוטומטית (מומלץ)
כל `git push` ל-Branch הראשי (`main`) יפעיל אוטומטית בנייה ופריסה ב-Cloudflare Pages.

1. וודא שהשינויים שמורים ב-Git.
2. דחוף את השינויים:
   ```bash
   git push
   ```

### פריסה ידנית (דרך הטרמינל)
אם רוצים לפרוס גרסה מקומית ללא דחיפה ל-Git:

1. בניית הפרויקט:
   ```bash
   bun run build
   ```

2. פריסה באמצעות Wrangler:
   ```bash
   npx wrangler pages deploy .svelte-kit/cloudflare
   ```
   *   אם מתבקש `Project Name`, בחר `wordys-game`.
   *   אם מתבקש `Deployment Branch`, בחר `main` (או `Production`).
