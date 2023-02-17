import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class KitemakerApi implements ICredentialType {
	name = 'kitemakerApi';

	displayName = 'Kitemaker API';

	documentationUrl = 'kitemaker';

	properties: INodeProperties[] = [
		{
			displayName: 'Personal Access Token',
			name: 'personalAccessToken',
			type: 'string',
			default: '',
		},
	];
}
