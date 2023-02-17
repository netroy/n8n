import type { OptionsWithUri } from 'request';

import type { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from '@8n8/core';

import type { IDataObject, JsonObject } from '@8n8/workflow';
import { NodeApiError } from '@8n8/workflow';

export async function deepLApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
) {
	const proApiEndpoint = 'https://api.deepl.com/v2';
	const freeApiEndpoint = 'https://api-free.deepl.com/v2';

	const credentials = await this.getCredentials('deepLApi');

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method,
		form: body,
		qs,
		uri: uri || `${credentials.apiPlan === 'pro' ? proApiEndpoint : freeApiEndpoint}${resource}`,
		json: true,
	};

	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}

		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		return await this.helpers.requestWithAuthentication.call(this, 'deepLApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
