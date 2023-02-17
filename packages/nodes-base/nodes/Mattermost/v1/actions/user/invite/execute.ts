import type { IExecuteFunctions } from '@8n8/core';

import type { IDataObject, INodeExecutionData } from '@8n8/workflow';

import { apiRequest } from '../../../transport';

export async function invite(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const teamId = this.getNodeParameter('teamId', index) as string;

	const emails = (this.getNodeParameter('emails', index) as string).split(',');

	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `teams/${teamId}/invite/email`;
	const body = emails;

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData);
}
