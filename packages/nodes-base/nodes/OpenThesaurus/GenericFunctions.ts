import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from '@8n8/core';

import type { IDataObject } from '@8n8/workflow';
import { NodeApiError } from '@8n8/workflow';

export async function openThesaurusApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	try {
		let options: OptionsWithUri = {
			headers: {
				'User-Agent': 'https://n8n.io',
			},
			method,
			qs,
			body,
			uri: uri || `https://www.openthesaurus.de${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);
		options.qs.format = 'application/json';

		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
