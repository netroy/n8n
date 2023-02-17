import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class BrandfetchApi implements ICredentialType {
	name = 'brandfetchApi';

	displayName = 'Brandfetch API';

	documentationUrl = 'brandfetch';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
