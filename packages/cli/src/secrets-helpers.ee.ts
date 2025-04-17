import type { ExternalSecretsProvider } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { SecretsHelpersBase } from 'n8n-workflow';

import { ExternalSecretsManager } from './external-secrets.ee/external-secrets-manager.ee';

@Service()
export class SecretsHelper implements SecretsHelpersBase {
	constructor(private service: ExternalSecretsManager) {}

	async update() {
		if (!this.service.initialized) {
			await this.service.init();
		}
		await this.service.updateSecrets();
	}

	async waitForInit() {
		if (!this.service.initialized) {
			await this.service.init();
		}
	}

	getSecret(provider: ExternalSecretsProvider, name: string) {
		return this.service.getSecret(provider, name);
	}

	hasSecret(provider: ExternalSecretsProvider, name: string): boolean {
		return this.service.hasSecret(provider, name);
	}

	hasProvider(provider: ExternalSecretsProvider): boolean {
		return this.service.hasProvider(provider);
	}

	listProviders(): ExternalSecretsProvider[] {
		return this.service.getProviderNames() ?? [];
	}

	listSecrets(provider: ExternalSecretsProvider): string[] {
		return this.service.getSecretNames(provider) ?? [];
	}
}
