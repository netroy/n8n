import type { OptionsWithUri } from 'request';

import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHookFunctions,
	IWebhookFunctions,
	JsonObject,
} from '@n8n_io/nodes-sdk';
import { NodeApiError } from '@n8n_io/nodes-sdk';

import type { IMessage } from './MessageInterface';
import type { IStream } from './StreamInterface';
import type { IUser } from './UserInterface';

export async function zulipApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: IMessage | IStream | IUser = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const credentials = await this.getCredentials('zulipApi');

	const endpoint = `${credentials.url}/api/v1`;

	let options: OptionsWithUri = {
		auth: {
			user: credentials.email as string,
			password: credentials.apiKey as string,
		},
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method,
		form: body,
		qs: query,
		uri: uri || `${endpoint}${resource}`,
		json: true,
	};
	if (!Object.keys(body).length) {
		delete options.form;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
