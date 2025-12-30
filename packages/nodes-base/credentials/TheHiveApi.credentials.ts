import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType } from 'n8n-workflow';
import z from 'zod/v4';
import { CredentialClass } from 'n8n-workflow';

const TheHiveApiSchema = z.object({
	ApiKey: z
		.string()
		.default('')
		.meta({
			displayName: 'API Key',
			typeOptions: { password: true },
		}),
	url: z.string().default('').meta({
		displayName: 'URL',
		description: 'The URL of TheHive instance',
		placeholder: 'https://localhost:9000',
	}),
	apiVersion: z.string().default('').meta({
		displayName: 'API Version',
		description: 'The version of api to be used',
	}),
	allowUnauthorizedCerts: z.boolean().default(false).meta({
		displayName: 'Ignore SSL Issues (Insecure)',
		description: 'Whether to connect even if SSL certificate validation is not possible',
	}),
});

export type TheHiveApiCredential = z.infer<typeof TheHiveApiSchema>;

export class TheHiveApi
	extends CredentialClass.fromSchema(TheHiveApiSchema)
	implements ICredentialType
{
	name = 'theHiveApi';

	displayName = 'The Hive API';

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
