import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from '@8n8/workflow';

export class NocoDbApiToken implements ICredentialType {
	name = 'nocoDbApiToken';

	displayName = 'NocoDB API Token';

	documentationUrl = 'nocoDb';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
			placeholder: 'http(s)://localhost:8080',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'xc-token': '={{$credentials.apiToken}}',
			},
		},
	};
}
