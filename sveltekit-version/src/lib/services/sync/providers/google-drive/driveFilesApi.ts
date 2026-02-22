/// <reference types="gapi" />
/// <reference types="gapi.client.drive" />

import { googleAuthService } from './googleAuthService';

export type GFile = gapi.client.drive.File;

const TAG = '[DriveFilesApi]';

function requireAuth() {
	if (!googleAuthService.getAccessToken()) {
		console.error(`${TAG} Not authenticated`);
		throw new Error('Not authenticated');
	}
}

export const driveFilesApi = {
	async listFiles(params: { q: string; fields: string; spaces?: string }): Promise<GFile[]> {
		console.log(`${TAG} listFiles`, params);
		requireAuth();
		try {
			const res = await window.gapi.client.drive.files.list({
				q: params.q,
				fields: params.fields,
				spaces: params.spaces || 'drive'
			});
			console.log(`${TAG} listFiles result:`, res.result.files?.length || 0, 'files');
			return res.result.files || [];
		} catch (e) {
			console.error(`${TAG} listFiles failed`, e);
			throw e;
		}
	},

	async findOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
		console.log(`${TAG} findOrCreateFolder`, { folderName, parentId });
		requireAuth();

		let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
		if (parentId) {
			q += ` and '${parentId}' in parents`;
		}

		try {
			const files = await this.listFiles({ q, fields: 'files(id)' });
			if (files.length > 0 && files[0].id) {
				console.log(`${TAG} Found existing folder`, files[0].id);
				return files[0].id;
			}

			console.log(`${TAG} Creating new folder...`);
			const metadata: any = {
				name: folderName,
				mimeType: 'application/vnd.google-apps.folder'
			};
			if (parentId) metadata.parents = [parentId];

			const createRes = await window.gapi.client.drive.files.create({
				resource: metadata,
				fields: 'id'
			});

			if (!createRes.result.id) throw new Error('Failed to create folder');
			console.log(`${TAG} Created folder`, createRes.result.id);
			return createRes.result.id;
		} catch (e) {
			console.error(`${TAG} findOrCreateFolder failed`, e);
			throw e;
		}
	},

	async findFileByNameInFolder(fileName: string, folderId: string): Promise<GFile | null> {
		console.log(`${TAG} findFileByNameInFolder`, { fileName, folderId });
		requireAuth();
		try {
			const q = `name = '${fileName}' and trashed = false and '${folderId}' in parents`;
			const files = await this.listFiles({
				q,
				fields: 'files(id, name, createdTime, modifiedTime, appProperties, mimeType, size)'
			});
			const result = files.length > 0 ? files[0] : null;
			console.log(`${TAG} findFileByNameInFolder result`, result ? result.id : 'null');
			return result;
		} catch (e) {
			console.error(`${TAG} findFileByNameInFolder failed`, e);
			throw e;
		}
	},

	async createFile(params: {
		name: string;
		mimeType: string;
		parents?: string[];
		appProperties?: Record<string, string>;
	}): Promise<string> {
		console.log(`${TAG} createFile`, { name: params.name, mimeType: params.mimeType });
		requireAuth();
		try {
			const resource: any = {
				name: params.name,
				mimeType: params.mimeType
			};
			if (params.parents) resource.parents = params.parents;
			if (params.appProperties) resource.appProperties = params.appProperties;

			const createRes = await window.gapi.client.drive.files.create({
				resource,
				fields: 'id'
			});
			if (!createRes.result.id) throw new Error('Failed to create file');
			console.log(`${TAG} Created file`, createRes.result.id);
			return createRes.result.id;
		} catch (e) {
			console.error(`${TAG} createFile failed`, e);
			throw e;
		}
	},

	async updateFileMetadata(fileId: string, metadata: { appProperties?: Record<string, string> }) {
		console.log(`${TAG} updateFileMetadata`, {
			fileId,
			keys: Object.keys(metadata.appProperties || {})
		});
		requireAuth();
		try {
			await window.gapi.client.drive.files.update({
				fileId,
				resource: metadata
			});
			console.log(`${TAG} updateFileMetadata success`);
		} catch (e) {
			console.error(`${TAG} updateFileMetadata failed`, e);
			throw e;
		}
	},

	async getFileMetadata(fileId: string, fields: string): Promise<GFile> {
		console.log(`${TAG} getFileMetadata`, { fileId, fields });
		requireAuth();
		try {
			const res = await window.gapi.client.drive.files.get({
				fileId,
				fields
			});
			console.log(`${TAG} getFileMetadata success`);
			return res.result;
		} catch (e) {
			console.error(`${TAG} getFileMetadata failed`, e);
			throw e;
		}
	}
};
