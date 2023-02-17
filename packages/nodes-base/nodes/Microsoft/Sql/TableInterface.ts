import type { IDataObject } from '@8n8/workflow';

export interface ITables {
	[key: string]: {
		[key: string]: IDataObject[];
	};
}
