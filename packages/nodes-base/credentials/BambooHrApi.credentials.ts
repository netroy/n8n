import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class BambooHrApi implements ICredentialType {
	name = 'bambooHrApi';

	displayName = 'BambooHR API';

	documentationUrl = 'bambooHr';

	properties: INodeProperties[] = [
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
