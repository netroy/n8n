import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class GumroadApi implements ICredentialType {
	name = 'gumroadApi';

	displayName = 'Gumroad API';

	documentationUrl = 'gumroad';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
