import type { OptionsWithUri } from 'request';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { AcuitySchedulingApiCredential } from '@credentials/AcuitySchedulingApi.credentials';

export async function acuitySchedulingApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: string,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	_option: IDataObject = {},
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		auth: {},
		method,
		qs,
		body,
		uri: uri || `https://acuityscheduling.com/api/v1${resource}`,
		json: true,
	};

	try {
		if (authenticationMethod === 'apiKey') {
			const credentials =
				await this.getCredentials<AcuitySchedulingApiCredential>('acuitySchedulingApi');

			options.auth = {
				user: credentials.userId,
				password: credentials.apiKey,
			};

			return await this.helpers.request(options);
		} else {
			delete options.auth;
			return await this.helpers.requestOAuth2.call(
				this,
				'acuitySchedulingOAuth2Api',
				options,
				//@ts-ignore
				true,
			);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
