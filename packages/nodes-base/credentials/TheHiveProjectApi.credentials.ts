import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType } from 'n8n-workflow';
import z from 'zod/v4';
import { CredentialClass } from 'n8n-workflow';

const TheHiveProjectApiSchema = z.object({
	ApiKey: z
		.string()
		.default('')
		.meta({
			displayName: 'API Key',
			typeOptions: {
				password: true,
			},
		}),
	url: z.string().default('').meta({
		displayName: 'URL',
		description: 'The URL of TheHive instance',
		placeholder: 'https://localhost:9000',
	}),
	allowUnauthorizedCerts: z.boolean().default(false).meta({
		displayName: 'Ignore SSL Issues (Insecure)',
		description: 'Whether to connect even if SSL certificate validation is not possible',
	}),
});

export type TheHiveProjectApiCredential = z.infer<typeof TheHiveProjectApiSchema>;

export class TheHiveProjectApi
	extends CredentialClass.fromSchema(TheHiveProjectApiSchema)
	implements ICredentialType
{
	name = 'theHiveProjectApi';

	displayName = 'The Hive 5 API';

	documentationUrl = 'thehive';
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials?.ApiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.url}}',
			url: '/api/case',
		},
	};
}
