import type { IExecuteFunctions } from '@8n8/core';

import type { IDataObject, INodeExecutionData } from '@8n8/workflow';

import { apiRequest } from '../../../transport';

export async function deleteTicket(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const id = this.getNodeParameter('ticketId', index) as string;

	const qs = {} as IDataObject;
	const requestMethod = 'DELETE';
	const endpoint = `tickets/${id}`;
	const body = {} as IDataObject;

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
	return this.helpers.returnJsonArray(responseData);
}
