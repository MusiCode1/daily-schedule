<script lang="ts">
	import { TEXTS } from '$lib/services/language';

</script>

<div class="container mx-auto max-w-2xl type-base p-6">
	<h1 class="text-3xl font-bold mb-6 text-primary-600">מדיניות פרטיות</h1>
    
    <div class="prose prose-lg text-gray-700">
        <p class="font-bold">עודכן לאחרונה: 14 בינואר 2026</p>

        <p>
            ברוכים הבאים לאפליקציית <strong>"{TEXTS.APP_TITLE}"</strong>.
            אנו מכבדים את הפרטיות שלכם ומחויבים להגן עליה. מסמך זה מסביר את נהלי הפרטיות שלנו.
        </p>

        <h3>1. איסוף מידע</h3>
        <p>
            האפליקציה <strong>אינה</strong> אוספת, שומרת או משתפת מידע אישי מזהה (PII) על המשתמשים בשרתים שלנו.
            כל הנתונים שאתם מזינים (משתמשים, משימות, תמונות) נשמרים באופן מקומי על המכשיר שלכם (ב-LocalStorage וב-IndexedDB) או ב-Google Drive האישי שלכם (אם בחרתם להתחבר).
        </p>

        <h3>2. הרשאות ושימוש ב-Google Drive</h3>
        <p>
            האפליקציה מאפשרת גיבוי וסנכרון נתונים באמצעות Google Drive. לצורך כך, אנו מבקשים את ההרשאה הבאה:
        </p>
        <ul class="list-disc pr-6">
            <li>
                <code>https://www.googleapis.com/auth/drive.file</code>: הרשאה זו מאפשרת לאפליקציה גישה <strong>אך ורק</strong> לקבצים שהיא יצרה בעצמה. לאפליקציה אין גישה לשאר הקבצים ב-Drive שלכם.
            </li>
        </ul>
        <p>
            השימוש בנתונים שהתקבלו מ-Google APIs יעשה בהתאם ל-<a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" class="text-blue-600 hover:underline">מדיניות נתוני המשתמש של שירותי Google API</a>, כולל דרישות השימוש המוגבל.
        </p>

        <h3>3. טלמטריה ומעקב</h3>
        <p>
            נכון לגרסה זו, האפליקציה אינה מכילה רכיבי מעקב, פרסומות או שירותי ניתוח (Analytics) צד שלישי האוספים מידע על דפוסי השימוש שלכם.
        </p>

        <h3>4. יצירת קשר</h3>
        <p>
            אם יש לכם שאלות בנוגע למדיניות זו, ניתן ליצור קשר עם המפתח.
        </p>

        <div class="mt-12 pt-6 border-t border-gray-200">
            <a href="/" class="text-primary-600 hover:underline font-bold">חזרה לדף הבית</a>
        </div>
    </div>
</div>
