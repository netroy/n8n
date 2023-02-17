import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class SentryIoApi implements ICredentialType {
	name = 'sentryIoApi';

	displayName = 'Sentry.io API';

	documentationUrl = 'sentryIo';

	properties: INodeProperties[] = [
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			default: '',
		},
	];
}
