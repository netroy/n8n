import validator from 'validator';
import { plainToInstance } from 'class-transformer';
import { Response } from 'express';
import { randomBytes } from 'crypto';
import { Service } from 'typedi';
import { LoggerProxy as logger } from 'n8n-workflow';

import { Authorized, Delete, Get, Patch, Post, RestController } from '@/decorators';
import {
	compareHash,
	hashPassword,
	sanitizeUser,
	validatePassword,
} from '@/UserManagement/UserManagementHelper';
import { BadRequestError } from '@/ResponseHelper';
import { validateEntity } from '@/GenericHelpers';
import { issueCookie } from '@/auth/jwt';
import type { User } from '@db/entities/User';
import { UserRepository } from '@db/repositories';

import {
	AuthenticatedRequest,
	MeRequest,
	UserSettingsUpdatePayload,
	UserUpdatePayload,
} from '@/requests';
import type { PublicUser } from '@/Interfaces';
import { isSamlLicensedAndEnabled } from '@/sso/saml/samlHelpers';
import { ExternalHooks } from '@/ExternalHooks';
import { InternalHooks } from '@/InternalHooks';

@Service()
@Authorized()
@RestController('/me')
export class MeController {
	constructor(
		private readonly externalHooks: ExternalHooks,
		private readonly internalHooks: InternalHooks,
		private readonly userRepository: UserRepository,
	) {}

	/**
	 * Update the logged-in user's properties, except password.
	 */
	@Patch('/')
	async updateCurrentUser(req: MeRequest.UserUpdate, res: Response): Promise<PublicUser> {
		const { id: userId, email: currentEmail } = req.user;
		const payload = plainToInstance(UserUpdatePayload, req.body);

		const { email } = payload;
		if (!email) {
			logger.debug('Request to update user email failed because of missing email in payload', {
				userId,
				payload,
			});
			throw new BadRequestError('Email is mandatory');
		}

		if (!validator.isEmail(email)) {
			logger.debug('Request to update user email failed because of invalid email in payload', {
				userId,
				invalidEmail: email,
			});
			throw new BadRequestError('Invalid email address');
		}

		await validateEntity(payload);

		// If SAML is enabled, we don't allow the user to change their email address
		if (isSamlLicensedAndEnabled()) {
			if (email !== currentEmail) {
				logger.debug('Request to update user failed because SAML user may not change their email', {
					userId,
					payload,
				});
				throw new BadRequestError('SAML user may not change their email');
			}
		}

		await this.userRepository.update(userId, payload);
		const user = await this.userRepository.findOneOrFail({
			where: { id: userId },
			relations: { globalRole: true },
		});

		logger.info('User updated successfully', { userId });

		await issueCookie(res, user);

		const updatedKeys = Object.keys(payload);
		void this.internalHooks.onUserUpdate({
			user,
			fields_changed: updatedKeys,
		});

		await this.externalHooks.run('user.profile.update', [currentEmail, sanitizeUser(user)]);

		return sanitizeUser(user);
	}

	/**
	 * Update the logged-in user's password.
	 */
	@Patch('/password')
	async updatePassword(req: MeRequest.Password, res: Response) {
		const { currentPassword, newPassword } = req.body;

		// If SAML is enabled, we don't allow the user to change their email address
		if (isSamlLicensedAndEnabled()) {
			logger.debug('Attempted to change password for user, while SAML is enabled', {
				userId: req.user?.id,
			});
			throw new BadRequestError(
				'With SAML enabled, users need to use their SAML provider to change passwords',
			);
		}

		if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
			throw new BadRequestError('Invalid payload.');
		}

		if (!req.user.password) {
			throw new BadRequestError('Requesting user not set up.');
		}

		const isCurrentPwCorrect = await compareHash(currentPassword, req.user.password);
		if (!isCurrentPwCorrect) {
			throw new BadRequestError('Provided current password is incorrect.');
		}

		const validPassword = validatePassword(newPassword);

		req.user.password = await hashPassword(validPassword);

		const user = await this.userRepository.save(req.user);
		logger.info('Password updated successfully', { userId: user.id });

		await issueCookie(res, user);

		void this.internalHooks.onUserUpdate({
			user,
			fields_changed: ['password'],
		});

		await this.externalHooks.run('user.password.update', [user.email, req.user.password]);

		return { success: true };
	}

	/**
	 * Store the logged-in user's survey answers.
	 */
	@Post('/survey')
	async storeSurveyAnswers(req: MeRequest.SurveyAnswers) {
		const { body: personalizationAnswers } = req;

		if (!personalizationAnswers) {
			logger.debug('Request to store user personalization survey failed because of empty payload', {
				userId: req.user.id,
			});
			throw new BadRequestError('Personalization answers are mandatory');
		}

		await this.userRepository.save({
			id: req.user.id,
			personalizationAnswers,
		});

		logger.info('User survey updated successfully', { userId: req.user.id });

		void this.internalHooks.onPersonalizationSurveySubmitted(req.user.id, personalizationAnswers);

		return { success: true };
	}

	/**
	 * Creates an API Key
	 */
	@Post('/api-key')
	async createAPIKey(req: AuthenticatedRequest) {
		const apiKey = `n8n_api_${randomBytes(40).toString('hex')}`;

		await this.userRepository.update(req.user.id, {
			apiKey,
		});

		void this.internalHooks.onApiKeyCreated({
			user: req.user,
			public_api: false,
		});

		return { apiKey };
	}

	/**
	 * Get an API Key
	 */
	@Get('/api-key')
	async getAPIKey(req: AuthenticatedRequest) {
		return { apiKey: req.user.apiKey };
	}

	/**
	 * Deletes an API Key
	 */
	@Delete('/api-key')
	async deleteAPIKey(req: AuthenticatedRequest) {
		await this.userRepository.update(req.user.id, {
			apiKey: null,
		});

		void this.internalHooks.onApiKeyDeleted({
			user: req.user,
			public_api: false,
		});

		return { success: true };
	}

	/**
	 * Update the logged-in user's settings.
	 */
	@Patch('/settings')
	async updateCurrentUserSettings(req: MeRequest.UserSettingsUpdate): Promise<User['settings']> {
		const payload = plainToInstance(UserSettingsUpdatePayload, req.body);
		const { id } = req.user;

		await this.userRepository.updateUserSettings(id, payload);

		const user = await this.userRepository.findOneOrFail({
			select: ['settings'],
			where: { id },
		});

		return user.settings;
	}
}
