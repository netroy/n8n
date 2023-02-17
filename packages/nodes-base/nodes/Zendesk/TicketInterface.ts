import type { IDataObject } from '@8n8/workflow';

export interface IComment {
	body?: string;
	html_body?: string;
	public?: boolean;
}

export interface ITicket {
	subject?: string;
	comment?: IComment;
	type?: string;
	group?: string;
	external_id?: string;
	tags?: string[];
	status?: string;
	recipient?: string;
	custom_fields?: IDataObject[];
	assignee_email?: string;
}
