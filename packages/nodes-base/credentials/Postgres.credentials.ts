import type { ICredentialType } from 'n8n-workflow';
import { z } from 'zod';
import { credentialSchema, toNodeProperties } from '../utils/CredentialSchema';

enum SSLOption {
	Allow = 'allow',
	Disable = 'disable',
	Require = 'require',
	'Verify (Not Implemented)' = 'verify',
	'Verify-Full (Not Implemented)' = 'verify-full',
}

enum SSLAuthOption {
	Password = 'password',
	'Private Key' = 'privateKey',
}

const basePostgresSchema = z.object({
	host: credentialSchema.string().displayName('Host').default('localhost'),
	port: credentialSchema.number().displayName('Port').default(5432),
	database: credentialSchema.string().displayName('Database').default('postgres'),
	user: credentialSchema.string().displayName('User').default('postgres'),
	password: credentialSchema.string().displayName('Password').sensitive(),
	allowUnauthorizedCerts: credentialSchema
		.boolean()
		.describe('Whether to connect even if SSL certificate validation is not possible')
		.displayName('Ignore SSL Issues')
		.default(false),
	ssl: credentialSchema
		.nativeEnum(SSLOption)
		.displayOptions({
			show: {
				allowUnauthorizedCerts: [false],
			},
		})
		.displayName('SSL')
		.default('disable'),
	sshTunnel: credentialSchema.boolean().displayName('SSH Tunnel').default(false),
});

const noSSHTunnelSchema = basePostgresSchema.and(
	z.object({
		sshTunnel: z.literal(false),
	}),
);

const sshTunnelSchema = basePostgresSchema.and(
	z.object({
		sshTunnel: z.literal(true),
		sshAuthenticateWith: credentialSchema
			.nativeEnum(SSLAuthOption)
			.displayName('SSH Authenticate with')
			.displayOptions({
				show: {
					sshTunnel: [true],
				},
			})
			.default('password'),
		sshHost: credentialSchema
			.string()
			.displayName('SSH Host')
			.displayOptions({
				show: {
					sshTunnel: [true],
				},
			})
			.default('localhost'),
		sshPort: credentialSchema
			.number()
			.displayName('SSH Port')
			.displayOptions({
				show: {
					sshTunnel: [true],
				},
			})
			.default(22),
		sshPostgresPort: credentialSchema
			.number()
			.displayName('SSH Postgres Port')
			.displayOptions({
				show: {
					sshTunnel: [true],
				},
			})
			.default(5432),
		sshUser: credentialSchema
			.string()
			.displayName('SSH User')
			.displayOptions({
				show: {
					sshTunnel: [true],
				},
			})
			.default('root'),
		sshPassword: credentialSchema
			.string()
			.sensitive()
			.displayName('SSH Password')
			.displayOptions({
				show: {
					sshTunnel: [true],
					sshAuthenticateWith: ['password'],
				},
			}),
		privateKey: credentialSchema
			.string()
			.displayName('Private Key')
			.sensitive()
			.editorRows(4)
			.displayOptions({
				show: {
					sshTunnel: [true],
					sshAuthenticateWith: ['privateKey'],
				},
			}),
		passphrase: credentialSchema
			.string()
			.describe('Passphrase used to create the key, if no passphrase was used leave empty')
			.displayName('Passphrase')
			.displayOptions({
				show: {
					sshTunnel: [true],
					sshAuthenticateWith: ['privateKey'],
				},
			}),
	}),
);

const PostgresCredentialSchema = noSSHTunnelSchema.or(sshTunnelSchema);

export type PostgresCredentialType = z.infer<typeof PostgresCredentialSchema>;

export class Postgres implements ICredentialType {
	name = 'postgres';

	displayName = 'Postgres';

	documentationUrl = 'postgres';

	properties = toNodeProperties(PostgresCredentialSchema as unknown as z.ZodObject<any>);
}
