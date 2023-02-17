import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class OuraApi implements ICredentialType {
	name = 'ouraApi';

	displayName = 'Oura API';

	documentationUrl = 'oura';

	properties: INodeProperties[] = [
		{
			displayName: 'Personal Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
