import type { IExecuteFunctions, IHookFunctions } from '@8n8/core';

import type { IDataObject } from '@8n8/workflow';
import { NodeApiError } from '@8n8/workflow';

import type { OptionsWithUri } from 'request';

/**
 * Make an API request to Plivo.
 *
 */
export async function plivoApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const credentials = (await this.getCredentials('plivoApi')) as {
		authId: string;
		authToken: string;
	};

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'plivo-n8n',
		},
		method,
		form: body,
		qs,
		uri: `https://api.plivo.com/v1/Account/${credentials.authId}${endpoint}/`,
		auth: {
			user: credentials.authId,
			pass: credentials.authToken,
		},
		json: true,
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
