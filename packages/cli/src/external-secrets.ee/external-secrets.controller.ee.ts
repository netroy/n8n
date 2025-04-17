import { type ExternalSecretsProvider, externalSecretsProviderSchema } from '@n8n/api-types';
import { Request, Response, NextFunction } from 'express';

import { Get, Post, RestController, GlobalScope, Param, Middleware } from '@/decorators';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { ExternalSecretsService } from './external-secrets.service.ee';
import { ExternalSecretsRequest } from './types';

@RestController('/external-secrets')
export class ExternalSecretsController {
	constructor(private readonly secretsService: ExternalSecretsService) {}

	@Middleware()
	validateProviderName(req: Request, res: Response, next: NextFunction) {
		if ('provider' in req.params) {
			const { provider } = req.params;
			if (!externalSecretsProviderSchema.options.includes(provider as ExternalSecretsProvider)) {
				throw new NotFoundError(`Could not find provider "${provider}"`);
			}
		}
		next();
	}

	@Get('/providers')
	@GlobalScope('externalSecretsProvider:list')
	async getProviders() {
		return await this.secretsService.getProviders();
	}

	@Get('/providers/:provider')
	@GlobalScope('externalSecretsProvider:read')
	async getProvider(
		_req: Request,
		_res: Response,
		@Param('provider') providerName: ExternalSecretsProvider,
	) {
		return this.secretsService.getProvider(providerName);
	}

	@Post('/providers/:provider/test')
	@GlobalScope('externalSecretsProvider:read')
	async testProviderSettings(
		req: ExternalSecretsRequest.TestProviderSettings,
		res: Response,
		@Param('provider') providerName: ExternalSecretsProvider,
	) {
		const result = await this.secretsService.testProviderSettings(providerName, req.body);
		if (result.success) {
			res.statusCode = 200;
		} else {
			res.statusCode = 400;
		}
		return result;
	}

	@Post('/providers/:provider')
	@GlobalScope('externalSecretsProvider:create')
	async setProviderSettings(
		req: ExternalSecretsRequest.SetProviderSettings,
		_res: Response,
		@Param('provider') providerName: ExternalSecretsProvider,
	) {
		await this.secretsService.saveProviderSettings(providerName, req.body, req.user.id);
		return {};
	}

	@Post('/providers/:provider/connect')
	@GlobalScope('externalSecretsProvider:update')
	async setProviderConnected(
		req: ExternalSecretsRequest.SetProviderConnected,
		_res: Response,
		@Param('provider') providerName: ExternalSecretsProvider,
	) {
		await this.secretsService.saveProviderConnected(providerName, req.body.connected);
		return {};
	}

	@Post('/providers/:provider/update')
	@GlobalScope('externalSecretsProvider:sync')
	async updateProvider(
		_req: ExternalSecretsRequest.UpdateProvider,
		res: Response,
		@Param('provider') providerName: ExternalSecretsProvider,
	) {
		const resp = await this.secretsService.updateProvider(providerName);
		if (resp) {
			res.statusCode = 200;
		} else {
			res.statusCode = 400;
		}
		return { updated: resp };
	}

	@Get('/secrets')
	@GlobalScope('externalSecret:list')
	getSecretNames() {
		return this.secretsService.getAllSecrets();
	}
}
