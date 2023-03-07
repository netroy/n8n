import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from '@n8n_io/nodes-sdk';

export class ApiTemplateIoApi implements ICredentialType {
	name = 'apiTemplateIoApi';

	displayName = 'APITemplate.io API';

	documentationUrl = 'apiTemplateIo';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-KEY': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.apitemplate.io/v1',
			url: '/list-templates',
		},
	};
}
