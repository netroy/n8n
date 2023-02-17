import type { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from '@8n8/core';

import type { OptionsWithUri } from 'request';

import type { IDataObject } from '@8n8/workflow';

export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: object,
	query?: IDataObject,
): Promise<any> {
	const credentials = await this.getCredentials('wekanApi');

	query = query || {};

	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
		},
		method,
		body,
		qs: query,
		uri: `${credentials.url}/api/${endpoint}`,
		json: true,
	};

	return this.helpers.requestWithAuthentication.call(this, 'wekanApi', options);
}
