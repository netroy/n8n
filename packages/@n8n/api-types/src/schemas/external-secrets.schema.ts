import { z } from 'zod';

export const externalSecretsProviderSchema = z.enum([
	'awsSecretsManager',
	'infisical',
	'vault',
	'azureKeyVault',
	'gcpSecretsManager',
]);

export type ExternalSecretsProvider = z.infer<typeof externalSecretsProviderSchema>;
