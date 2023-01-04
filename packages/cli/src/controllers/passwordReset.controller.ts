import type { Repository } from 'typeorm';
import { IsNull, MoreThanOrEqual, Not } from 'typeorm';
import { v4 as uuid } from 'uuid';
import validator from 'validator';
import { Get, Post, RestController } from '@/decorators';
import {
	BadRequestError,
	InternalServerError,
	NotFoundError,
	UnprocessableRequestError,
} from '@/ResponseHelper';
import {
	getInstanceBaseUrl,
	hashPassword,
	validatePassword,
} from '@/UserManagement/UserManagementHelper';
import * as UserManagementMailer from '@/UserManagement/email';

import { Response } from 'express';
import type { ILogger } from 'n8n-workflow';
import type { Config } from '@/config';
import type { User } from '@db/entities/User';
import { PasswordResetRequest } from '@/requests';
import type { IDatabaseCollections, IExternalHooksClass } from '@/Interfaces';
import type { InternalHooks } from '@/InternalHooks';
import { issueCookie } from '@/auth/jwt';
import { isLdapEnabled } from '@/Ldap/helpers';

@RestController()
export class PasswordResetController {
	private readonly config: Config;

	private readonly logger: ILogger;

	private readonly externalHooks: IExternalHooksClass;

	private readonly internalHooks: InternalHooks;

	private readonly userRepository: Repository<User>;

	constructor({
		config,
		logger,
		externalHooks,
		internalHooks,
		repositories,
	}: {
		config: Config;
		logger: ILogger;
		externalHooks: IExternalHooksClass;
		internalHooks: InternalHooks;
		repositories: Pick<IDatabaseCollections, 'User'>;
	}) {
		this.config = config;
		this.logger = logger;
		this.externalHooks = externalHooks;
		this.internalHooks = internalHooks;
		this.userRepository = repositories.User;
	}

	/**
	 * Send a password reset email.
	 * Authless endpoint.
	 */
	@Post('/forgot-password')
	async forgotPassword(req: PasswordResetRequest.Email) {
		if (this.config.getEnv('userManagement.emails.mode') === '') {
			this.logger.debug(
				'Request to send password reset email failed because emailing was not set up',
			);
			throw new InternalServerError(
				'Email sending must be set up in order to request a password reset email',
			);
		}

		const { email } = req.body;
		if (!email) {
			this.logger.debug(
				'Request to send password reset email failed because of missing email in payload',
				{ payload: req.body },
			);
			throw new BadRequestError('Email is mandatory');
		}

		if (!validator.isEmail(email)) {
			this.logger.debug(
				'Request to send password reset email failed because of invalid email in payload',
				{ invalidEmail: email },
			);
			throw new BadRequestError('Invalid email address');
		}

		// User should just be able to reset password if one is already present
		const user = await this.userRepository.findOne({
			where: {
				email,
				password: Not(IsNull()),
			},
			relations: ['authIdentities'],
		});

		const ldapIdentity = user?.authIdentities?.find((i) => i.providerType === 'ldap');

		if (!user?.password || (ldapIdentity && user.disabled)) {
			this.logger.debug(
				'Request to send password reset email failed because no user was found for the provided email',
				{ invalidEmail: email },
			);
			return;
		}

		if (isLdapEnabled() && ldapIdentity) {
			throw new UnprocessableRequestError('forgotPassword.ldapUserPasswordResetUnavailable');
		}

		user.resetPasswordToken = uuid();

		const { id, firstName, lastName, resetPasswordToken } = user;

		const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) + 7200;

		await this.userRepository.update(id, { resetPasswordToken, resetPasswordTokenExpiration });

		const baseUrl = getInstanceBaseUrl();
		const url = new URL(`${baseUrl}/change-password`);
		url.searchParams.append('userId', id);
		url.searchParams.append('token', resetPasswordToken);

		try {
			const mailer = UserManagementMailer.getInstance();
			await mailer.passwordReset({
				email,
				firstName,
				lastName,
				passwordResetUrl: url.toString(),
				domain: baseUrl,
			});
		} catch (error) {
			void this.internalHooks.onEmailFailed({
				user,
				message_type: 'Reset password',
				public_api: false,
			});
			if (error instanceof Error) {
				throw new InternalServerError(`Please contact your administrator: ${error.message}`);
			}
		}

		this.logger.info('Sent password reset email successfully', { userId: user.id, email });
		void this.internalHooks.onUserTransactionalEmail({
			user_id: id,
			message_type: 'Reset password',
			public_api: false,
		});

		void this.internalHooks.onUserPasswordResetRequestClick({ user });
	}

	/**
	 * Verify password reset token and user ID.
	 * Authless endpoint.
	 */
	@Get('/resolve-password-token')
	async resolvePasswordToken(req: PasswordResetRequest.Credentials) {
		const { token: resetPasswordToken, userId: id } = req.query;

		if (!resetPasswordToken || !id) {
			this.logger.debug(
				'Request to resolve password token failed because of missing password reset token or user ID in query string',
				{
					queryString: req.query,
				},
			);
			throw new BadRequestError('');
		}

		// Timestamp is saved in seconds
		const currentTimestamp = Math.floor(Date.now() / 1000);

		const user = await this.userRepository.findOneBy({
			id,
			resetPasswordToken,
			resetPasswordTokenExpiration: MoreThanOrEqual(currentTimestamp),
		});

		if (!user) {
			this.logger.debug(
				'Request to resolve password token failed because no user was found for the provided user ID and reset password token',
				{
					userId: id,
					resetPasswordToken,
				},
			);
			throw new NotFoundError('');
		}

		this.logger.info('Reset-password token resolved successfully', { userId: id });
		void this.internalHooks.onUserPasswordResetEmailClick({ user });
	}

	/**
	 * Verify password reset token and user ID and update password.
	 * Authless endpoint.
	 */
	@Post('/change-password')
	async changePassword(req: PasswordResetRequest.NewPassword, res: Response) {
		const { token: resetPasswordToken, userId, password } = req.body;

		if (!resetPasswordToken || !userId || !password) {
			this.logger.debug(
				'Request to change password failed because of missing user ID or password or reset password token in payload',
				{
					payload: req.body,
				},
			);
			throw new BadRequestError('Missing user ID or password or reset password token');
		}

		const validPassword = validatePassword(password);

		// Timestamp is saved in seconds
		const currentTimestamp = Math.floor(Date.now() / 1000);

		const user = await this.userRepository.findOne({
			where: {
				id: userId,
				resetPasswordToken,
				resetPasswordTokenExpiration: MoreThanOrEqual(currentTimestamp),
			},
			relations: ['authIdentities'],
		});

		if (!user) {
			this.logger.debug(
				'Request to resolve password token failed because no user was found for the provided user ID and reset password token',
				{
					userId,
					resetPasswordToken,
				},
			);
			throw new NotFoundError('');
		}

		await this.userRepository.update(userId, {
			password: await hashPassword(validPassword),
			resetPasswordToken: null,
			resetPasswordTokenExpiration: null,
		});

		this.logger.info('User password updated successfully', { userId });

		await issueCookie(res, user);

		void this.internalHooks.onUserUpdate({
			user,
			fields_changed: ['password'],
		});

		// if this user used to be an LDAP users
		const ldapIdentity = user?.authIdentities?.find((i) => i.providerType === 'ldap');
		if (ldapIdentity) {
			void this.internalHooks.onUserSignup(user, {
				user_type: 'email',
				was_disabled_ldap_user: true,
			});
		}

		await this.externalHooks.run('user.password.update', [user.email, password]);
	}
}
