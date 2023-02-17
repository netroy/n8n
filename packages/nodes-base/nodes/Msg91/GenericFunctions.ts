import type { IExecuteFunctions, IHookFunctions } from '@8n8/core';

import type { IDataObject } from '@8n8/workflow';
import { NodeApiError } from '@8n8/workflow';

/**
 * Make an API request to MSG91
 *
 */
export async function msg91ApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
): Promise<any> {
	const credentials = await this.getCredentials('msg91Api');

	if (query === undefined) {
		query = {};
	}

	query.authkey = credentials.authkey as string;

	const options = {
		method,
		form: body,
		qs: query,
		uri: `https://api.msg91.com/api${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
