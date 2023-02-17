import type { OptionsWithUri } from 'request';

import type { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from '@8n8/core';

import type { IDataObject } from '@8n8/workflow';
import { NodeApiError, NodeOperationError } from '@8n8/workflow';

export async function yourlsApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,

	body: any = {},
	qs: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('yourlsApi');

	qs.signature = credentials.signature as string;
	qs.format = 'json';

	const options: OptionsWithUri = {
		method,
		body,
		qs,
		uri: `${credentials.url}/yourls-api.php`,
		json: true,
	};
	try {
		//@ts-ignore
		const response = await this.helpers.request.call(this, options);

		if (response.status === 'fail') {
			throw new NodeOperationError(
				this.getNode(),
				`Yourls error response [400]: ${response.message}`,
			);
		}

		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
