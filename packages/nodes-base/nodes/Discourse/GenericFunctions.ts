import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { DiscourseApiCredential } from '@credentials/DiscourseApi.credentials';

export async function discourseApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	path: string,

	body: any = {},
	qs: IDataObject = {},
	_option = {},
): Promise<any> {
	const credentials = await this.getCredentials<DiscourseApiCredential>('discourseApi');

	const options: OptionsWithUri = {
		method,
		body,
		qs,
		uri: `${credentials.url}${path}`,
		json: true,
	};

	try {
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		return await this.helpers.requestWithAuthentication.call(this, 'discourseApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function discourseApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 1;
	do {
		responseData = await discourseApiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData as IDataObject[]);
		query.page++;
	} while (responseData.length !== 0);
	return returnData;
}
