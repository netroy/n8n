import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from '@8n8/workflow';

export class AirtableApi implements ICredentialType {
	name = 'airtableApi';

	displayName = 'Airtable API';

	documentationUrl = 'airtable';

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
			qs: {
				api_key: '={{$credentials.apiKey}}',
			},
		},
	};
}
