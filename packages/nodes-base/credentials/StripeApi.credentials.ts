import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from '@8n8/workflow';

export class StripeApi implements ICredentialType {
	name = 'stripeApi';

	displayName = 'Stripe API';

	documentationUrl = 'stripe';

	properties: INodeProperties[] = [
		{
			displayName: 'Secret Key',
			name: 'secretKey',
			type: 'string',
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.secretKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.stripe.com/v1',
			url: '/charges',
			json: true,
		},
	};
}
