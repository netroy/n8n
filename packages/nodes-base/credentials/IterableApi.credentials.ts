import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class IterableApi implements ICredentialType {
	name = 'iterableApi';

	displayName = 'Iterable API';

	documentationUrl = 'iterable';

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
