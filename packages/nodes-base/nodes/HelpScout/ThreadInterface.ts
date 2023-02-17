import type { IDataObject } from '@8n8/workflow';

export interface IAttachment {
	fileName?: string;
	mimeType?: string;
	data?: string;
}

export interface IThread {
	createdAt?: string;
	customer?: IDataObject;
	imported?: boolean;
	text?: string;
	attachments?: IAttachment[];
}
