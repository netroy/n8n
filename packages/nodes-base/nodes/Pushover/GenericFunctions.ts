import type { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from '@8n8/core';

import type { IDataObject, IHttpRequestMethods, IHttpRequestOptions } from '@8n8/workflow';
import { NodeApiError } from '@8n8/workflow';

export async function pushoverApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,

	body: any = {},
	qs: IDataObject = {},
	_option = {},
): Promise<any> {
	const options: IHttpRequestOptions = {
		headers: {
			'Content-Type': 'multipart/form-data',
		},
		method,
		body,
		qs,
		url: `https://api.pushover.net/1${path}`,
		json: true,
	};

	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		return await this.helpers.requestWithAuthentication.call(this, 'pushoverApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
