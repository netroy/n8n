import type { OptionsWithUri } from 'request';

import type { IExecuteFunctions } from '@8n8/core';

import type { IDataObject } from '@8n8/workflow';
import { NodeApiError, NodeOperationError } from '@8n8/workflow';

export async function uptimeRobotApiRequest(
	this: IExecuteFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const credentials = await this.getCredentials('uptimeRobotApi');

	let options: OptionsWithUri = {
		method,
		qs,
		form: {
			api_key: credentials.apiKey,
			...body,
		},
		uri: uri || `https://api.uptimerobot.com/v2${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	try {
		const responseData = await this.helpers.request(options);
		if (responseData.stat !== 'ok') {
			throw new NodeOperationError(this.getNode(), responseData);
		}
		return responseData;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
