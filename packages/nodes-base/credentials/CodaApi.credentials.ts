import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class CodaApi implements ICredentialType {
	name = 'codaApi';

	displayName = 'Coda API';

	documentationUrl = 'coda';

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
