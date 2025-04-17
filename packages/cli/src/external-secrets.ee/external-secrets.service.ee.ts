import type { ExternalSecretsProvider } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { IDataObject } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import { CREDENTIAL_BLANKING_VALUE } from '@/constants';

import { ExternalSecretsManager } from './external-secrets-manager.ee';
import type { ExternalSecretsRequest, SecretsProvider } from './types';

@Service()
export class ExternalSecretsService {
	constructor(private readonly manager: ExternalSecretsManager) {}

	getProvider(
		providerName: ExternalSecretsProvider,
	): ExternalSecretsRequest.GetProviderResponse | null {
		const { provider, settings } = this.manager.getProviderWithSettings(providerName);
		return {
			displayName: provider.displayName,
			name: provider.name,
			icon: provider.name,
			state: provider.state,
			connected: settings.connected,
			connectedAt: settings.connectedAt,
			properties: provider.properties,
			data: this.redact(settings.settings, provider),
		};
	}

	async getProviders() {
		return this.manager.getProvidersWithSettings().map(({ provider, settings }) => ({
			displayName: provider.displayName,
			name: provider.name,
			icon: provider.name,
			state: provider.state,
			connected: !!settings.connected,
			connectedAt: settings.connectedAt,
			data: this.redact(settings.settings, provider),
		}));
	}

	// Take data and replace all sensitive values with a sentinel value.
	// This will replace password fields and oauth data.
	redact(data: IDataObject, provider: SecretsProvider): IDataObject {
		const copiedData = deepCopy(data || {});

		const properties = provider.properties;

		for (const dataKey of Object.keys(copiedData)) {
			// The frontend only cares that this value isn't falsy.
			if (dataKey === 'oauthTokenData') {
				copiedData[dataKey] = CREDENTIAL_BLANKING_VALUE;
				continue;
			}
			const prop = properties.find((v) => v.name === dataKey);
			if (!prop) {
				continue;
			}

			if (
				prop.typeOptions?.password &&
				(!(copiedData[dataKey] as string).startsWith('=') || prop.noDataExpression)
			) {
				copiedData[dataKey] = CREDENTIAL_BLANKING_VALUE;
			}
		}

		return copiedData;
	}

	private unredactRestoreValues(unmerged: any, replacement: any) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		for (const [key, value] of Object.entries(unmerged)) {
			if (value === CREDENTIAL_BLANKING_VALUE) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
				unmerged[key] = replacement[key];
			} else if (
				typeof value === 'object' &&
				value !== null &&
				key in replacement &&
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				typeof replacement[key] === 'object' &&
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				replacement[key] !== null
			) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				this.unredactRestoreValues(value, replacement[key]);
			}
		}
	}

	// Take unredacted data (probably from the DB) and merge it with
	// redacted data to create an unredacted version.
	unredact(redactedData: IDataObject, savedData: IDataObject): IDataObject {
		// Replace any blank sentinel values with their saved version
		const mergedData = deepCopy(redactedData ?? {});
		this.unredactRestoreValues(mergedData, savedData);
		return mergedData;
	}

	async saveProviderSettings(
		providerName: ExternalSecretsProvider,
		data: IDataObject,
		userId: string,
	) {
		const { settings } = this.manager.getProviderWithSettings(providerName);
		const newData = this.unredact(data, settings.settings);
		await this.manager.setProviderSettings(providerName, newData, userId);
	}

	async saveProviderConnected(providerName: ExternalSecretsProvider, connected: boolean) {
		await this.manager.setProviderConnected(providerName, connected);
		return this.getProvider(providerName);
	}

	getAllSecrets(): Record<string, string[]> {
		return this.manager.getAllSecretNames();
	}

	async testProviderSettings(providerName: ExternalSecretsProvider, data: IDataObject) {
		const { settings } = this.manager.getProviderWithSettings(providerName);
		const newData = this.unredact(data, settings.settings);
		return await this.manager.testProviderSettings(providerName, newData);
	}

	async updateProvider(providerName: ExternalSecretsProvider) {
		return await this.manager.updateProvider(providerName);
	}
}
