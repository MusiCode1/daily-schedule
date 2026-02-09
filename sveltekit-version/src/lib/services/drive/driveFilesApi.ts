/// <reference types="gapi" />
/// <reference types="gapi.client.drive" />

import { googleAuthService } from './googleAuthService';

// שימוש בטיפוסים הרשמיים
export type GFile = gapi.client.drive.File;

function requireAuth() {
	if (!googleAuthService.getAccessToken()) {
		throw new Error('Not authenticated');
	}
}

export const driveFilesApi = {
	async listFiles(params: { q: string; fields: string; spaces?: string }): Promise<GFile[]> {
		requireAuth();
		const res = await window.gapi.client.drive.files.list({
			q: params.q,
			fields: params.fields,
			spaces: params.spaces || 'drive'
		});
		return res.result.files || [];
	},

	async findOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
		requireAuth();

		let q =
			`mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
		if (parentId) {
			q += ` and '${parentId}' in parents`;
		}

		const files = await this.listFiles({ q, fields: 'files(id)' });
		if (files.length > 0 && files[0].id) return files[0].id;

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
		return createRes.result.id;
	},

	async findFileByNameInFolder(fileName: string, folderId: string): Promise<GFile | null> {
		requireAuth();
		const q = `name = '${fileName}' and trashed = false and '${folderId}' in parents`;
		const files = await this.listFiles({
			q,
			fields: 'files(id, name, createdTime, modifiedTime, appProperties, mimeType, size)'
		});
		return files.length > 0 ? files[0] : null;
	},

	async createFile(params: {
		name: string;
		mimeType: string;
		parents?: string[];
		appProperties?: Record<string, string>;
	}): Promise<string> {
		requireAuth();
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
		return createRes.result.id;
	},

	async updateFileMetadata(fileId: string, metadata: { appProperties?: Record<string, string> }) {
		requireAuth();
		await window.gapi.client.drive.files.update({
			fileId,
			resource: metadata
		});
	},

	async getFileMetadata(fileId: string, fields: string): Promise<GFile> {
		requireAuth();
		const res = await window.gapi.client.drive.files.get({
			fileId,
			fields
		});
		return res.result;
	}
};

