import type { OptionsWithUri } from 'request';

import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { DemioApiCredential } from '@credentials/DemioApi.credentials';

export async function demioApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	try {
		const credentials = await this.getCredentials<DemioApiCredential>('demioApi');
		let options: OptionsWithUri = {
			headers: {
				'Api-Key': credentials.apiKey,
				'Api-Secret': credentials.apiSecret,
			},
			method,
			qs,
			body,
			uri: uri || `https://my.demio.com/api/v1${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);

		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
