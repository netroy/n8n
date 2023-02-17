import type { IExecuteFunctions } from '@8n8/core';

import type { IDataObject, INodeExecutionData } from '@8n8/workflow';

import { apiRequest } from '../../../transport';

export async function postEphemeral(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = 'posts/ephemeral';

	const body = {
		user_id: this.getNodeParameter('userId', index),
		post: {
			channel_id: this.getNodeParameter('channelId', index),
			message: this.getNodeParameter('message', index),
		},
	} as IDataObject;

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData);
}
