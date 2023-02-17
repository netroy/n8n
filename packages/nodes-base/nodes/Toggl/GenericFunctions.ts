import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	ITriggerFunctions,
} from '@8n8/core';

import type { IDataObject } from '@8n8/workflow';
import { NodeApiError } from '@8n8/workflow';

export async function togglApiRequest(
	this:
		| ITriggerFunctions
		| IPollFunctions
		| IHookFunctions
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	query?: IDataObject,
	uri?: string,
): Promise<any> {
	const credentials = await this.getCredentials('togglApi');
	const headerWithAuthentication = Object.assign(
		{},
		{
			Authorization: ` Basic ${Buffer.from(
				`${credentials.username}:${credentials.password}`,
			).toString('base64')}`,
		},
	);

	const options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		qs: query,
		uri: uri || `https://api.track.toggl.com/api/v8${resource}`,
		body,
		json: true,
	};
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
