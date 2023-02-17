import type { IDataObject } from '@8n8/workflow';
import type { IMembershipDto } from './CommonDtos';

enum UserStatusEnum {
	ACTIVE,
	PENDING_EMAIL_VERIFICATION,
	DELETED,
}

export interface IUserDto {
	activeWorkspace: string;
	defaultWorkspace: string;
	email: string;
	id: string;
	memberships: IMembershipDto[];
	name: string;
	profilePicture: string;
	settings: IDataObject;
	status: UserStatusEnum;
}
