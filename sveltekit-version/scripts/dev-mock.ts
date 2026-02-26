/**
 * מפעיל את שרת ה-Mock ואת Vite dev server במקביל.
 * שימוש: bun run scripts/dev-mock.ts
 */
import { spawn } from 'child_process';

// שרת Mock (פורט 3001)
const mockServer = spawn('bun', ['run', 'e2e/mock-server/server.ts'], {
	stdio: 'inherit',
	shell: true
});

// Vite dev server עם VITE_USE_MOCK_SYNC=true
const vite = spawn('bunx', ['vite', 'dev'], {
	stdio: 'inherit',
	shell: true,
	env: { ...process.env, VITE_USE_MOCK_SYNC: 'true' }
});

// כשאחד נסגר — סוגר את השני
function cleanup() {
	mockServer.kill();
	vite.kill();
	process.exit();
}

mockServer.on('close', cleanup);
vite.on('close', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
