import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class OneSimpleApi implements ICredentialType {
	name = 'oneSimpleApi';

	displayName = 'One Simple API';

	documentationUrl = 'oneSimpleApi';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
		},
	];
}
