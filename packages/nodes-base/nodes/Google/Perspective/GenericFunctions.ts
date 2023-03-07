import type { OptionsWithUri } from 'request';

import type { IExecuteFunctions, IDataObject, JsonObject } from '@n8n_io/nodes-sdk';
import { NodeApiError } from '@n8n_io/nodes-sdk';

export async function googleApiRequest(
	this: IExecuteFunctions,
	method: 'POST',
	endpoint: string,
	body: IDataObject = {},
) {
	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		uri: `https://commentanalyzer.googleapis.com${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	try {
		return await this.helpers.requestOAuth2.call(this, 'googlePerspectiveOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
