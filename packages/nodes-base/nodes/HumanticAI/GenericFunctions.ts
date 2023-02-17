import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from '@8n8/core';

import type { IDataObject } from '@8n8/workflow';
import { NodeApiError } from '@8n8/workflow';

export async function humanticAiApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	option: IDataObject = {},
): Promise<any> {
	try {
		const credentials = await this.getCredentials('humanticAiApi');
		let options: OptionsWithUri = {
			headers: {
				'Content-Type': 'application/json',
			},
			method,
			qs,
			body,
			uri: `https://api.humantic.ai/v1${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);
		options.qs.apikey = credentials.apiKey;

		if (Object.keys(options.body).length === 0) {
			delete options.body;
		}

		const response = await this.helpers.request(options);

		if (response.data && response.data.status === 'error') {
			throw new NodeApiError(this.getNode(), response.data);
		}

		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
