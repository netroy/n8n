import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class MailerLiteApi implements ICredentialType {
	name = 'mailerLiteApi';

	displayName = 'Mailer Lite API';

	documentationUrl = 'mailerLite';

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
