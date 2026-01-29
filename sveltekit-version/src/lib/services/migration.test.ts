import { describe, it, expect } from 'vitest';
import { migrationService } from './migration';

describe('Auth Migration', () => {
	// Fixture 1: לקוח קיים תקין
	// סטטוס: מחובר, טוקן בתוקף
	it('should migrate legacy token with valid expiry', () => {
		const legacyToken = 'ya29.legacy-token-123';
		const futureExpiry = (Date.now() + 3600000).toString(); // בעוד שעה

		const result = migrationService.migrateAuthStorage(legacyToken, futureExpiry);

		expect(result).not.toBeNull();
		expect(result?.accessToken).toBe(legacyToken);
		expect(result?.expiresAt).toBe(parseInt(futureExpiry));
		expect(result?.user).toBeUndefined(); // משתמש לא קיים בגרסה הישנה
	});

	// Fixture 2: לקוח עם טוקן חסר
	// סטטוס: לא מחובר
	it('should return null if legacy token is missing', () => {
		const legacyToken = null;
		const futureExpiry = (Date.now() + 3600000).toString();

		const result = migrationService.migrateAuthStorage(legacyToken, futureExpiry);

		expect(result).toBeNull();
	});

	// Fixture 3: לקוח עם תאריך תפוגה משובש
	// סטטוס: מחובר (אבל אולי פג), המערכת צריכה להגר כדי שנוכל לנסות לרענן
	it('should handle invalid expiry date gracefully', () => {
		const legacyToken = 'ya29.legacy-token-456';
		const invalidExpiry = 'not-a-number';

		const result = migrationService.migrateAuthStorage(legacyToken, invalidExpiry);

		expect(result).not.toBeNull();
		expect(result?.accessToken).toBe(legacyToken);
		// אם התאריך לא תקין, הוא אמור להיות 0 או זמן נוכחי (תלוי במימוש שבחרנו - בחרנו Date.now())
		// אנו מוודאים שזה מספר חוקי
		expect(result?.expiresAt).toBeGreaterThan(0);
	});

	// Fixture 4: לקוח ללא תאריך תפוגה כלל
	it('should handle missing expiry date', () => {
		const legacyToken = 'ya29.legacy-token-789';

		const result = migrationService.migrateAuthStorage(legacyToken, null);

		expect(result).not.toBeNull();
		expect(result?.accessToken).toBe(legacyToken);
		expect(result?.expiresAt).toBeGreaterThan(0);
	});
});
