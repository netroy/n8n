import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class SentryIoServerApi implements ICredentialType {
	name = 'sentryIoServerApi';

	displayName = 'Sentry.io Server API';

	documentationUrl = 'sentryIo';

	properties: INodeProperties[] = [
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			default: '',
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://example.com',
		},
	];
}
