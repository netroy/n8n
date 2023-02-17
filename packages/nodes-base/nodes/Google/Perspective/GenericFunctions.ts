import type { OptionsWithUri } from 'request';

import type { IExecuteFunctions } from '@8n8/core';

import type { IDataObject } from '@8n8/workflow';
import { NodeApiError } from '@8n8/workflow';

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
		throw new NodeApiError(this.getNode(), error);
	}
}
