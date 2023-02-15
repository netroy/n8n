import { IsNull, Not, In, MoreThanOrEqual } from 'typeorm';
import type {
	EntityManager,
	DeepPartial,
	FindOptionsWhere,
	FindOptionsWhereProperty,
} from 'typeorm';
import type { RoleNames, RoleScopes } from '../entities/Role';
import { User } from '../entities/User';
import { AbstractRepository } from './abstract.repository';

interface FindOptions {
	includeRole?: boolean;
	includeIdentities?: boolean;
}

export class UserRepository extends AbstractRepository<User> {
	constructor(manager: EntityManager) {
		super(manager, User);
	}

	// TODO: improve this to only return the actual owner, and rename this method
	async findInstanceOwnerOrFail(): Promise<User> {
		return this.manager.findOneOrFail(this.entity, {
			where: {},
			relations: { globalRole: true },
		});
	}

	async findAll(options?: FindOptions): Promise<User[]> {
		return this.findMany({}, options);
	}

	async findById(id: User['id'], options?: FindOptions): Promise<User | null> {
		return this.findOne({ id }, options);
	}

	async findByIdOrFail(id: User['id'], options?: FindOptions): Promise<User> {
		return this.findOneOrFail({ id }, options);
	}

	async findByIds(ids: Array<User['id']>, options?: FindOptions): Promise<User[]> {
		return this.findMany({ id: In(ids) }, options);
	}

	async findByEmail(
		email: FindOptionsWhereProperty<NonNullable<User['email']>>,
		options?: FindOptions,
	): Promise<User | null> {
		return this.findOne({ email }, options);
	}

	async findByEmailOrFail(
		email: FindOptionsWhereProperty<NonNullable<User['email']>>,
		options?: FindOptions,
	): Promise<User> {
		return this.findOneOrFail({ email }, options);
	}

	async findByEmails(emails: Array<User['email']>): Promise<User[]> {
		return this.manager.findBy(this.entity, { email: In(emails) });
	}

	async findByRole(scope: RoleScopes, name: RoleNames): Promise<User | null> {
		return this.manager.findOne(this.entity, {
			relations: { globalRole: true },
			where: { globalRole: { scope, name } },
		});
	}

	async findByRoleOrFail(scope: RoleScopes, name: RoleNames): Promise<User> {
		return this.manager.findOneOrFail(this.entity, {
			relations: { globalRole: true },
			where: { globalRole: { scope, name } },
		});
	}

	async findForPasswordReset(email: User['email']): Promise<User | null> {
		return this.findOne({ email, password: Not(IsNull()) }, { includeIdentities: true });
	}

	async findByPasswordResetToken(id: User['id'], resetPasswordToken: string): Promise<User | null> {
		// Timestamp is saved in seconds
		const currentTimestamp = Math.floor(Date.now() / 1000);
		return this.findOne(
			{
				id,
				resetPasswordToken,
				resetPasswordTokenExpiration: MoreThanOrEqual(currentTimestamp),
			},
			{ includeIdentities: true },
		);
	}

	async findByApiKey(apiKey: string, options?: FindOptions): Promise<User | null> {
		return this.findOne({ apiKey }, options);
	}

	// TODO: move validation code in here as well
	async save(user: DeepPartial<User>) {
		return this.manager.save(this.entity, user);
	}

	async update(id: User['id'], data: Omit<DeepPartial<User>, 'id'>) {
		return this.manager.update(this.entity, id, data);
	}

	async delete(where: FindOptionsWhere<User>) {
		return this.manager.delete(this.entity, where);
	}

	async findOne(
		where: FindOptionsWhere<User>,
		{ includeRole = false, includeIdentities = false }: FindOptions = {},
	): Promise<User | null> {
		return this.manager.findOne(this.entity, {
			where,
			relations: { globalRole: includeRole, authIdentities: includeIdentities },
		});
	}

	async findOneOrFail(
		where: FindOptionsWhere<User>,
		{ includeRole = false, includeIdentities = false }: FindOptions = {},
	): Promise<User> {
		return this.manager.findOneOrFail(this.entity, {
			where,
			relations: { globalRole: includeRole, authIdentities: includeIdentities },
		});
	}

	async findMany(
		where: FindOptionsWhere<User>,
		{ includeRole = false, includeIdentities = false }: FindOptions = {},
	): Promise<User[]> {
		return this.manager.find(this.entity, {
			where,
			relations: { globalRole: includeRole, authIdentities: includeIdentities },
		});
	}
}
