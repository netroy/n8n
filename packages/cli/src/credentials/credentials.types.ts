import type { IUser } from '@8n8/workflow';
import type { ICredentialsDb } from '@/Interfaces';

export interface CredentialWithSharings extends ICredentialsDb {
	ownedBy?: IUser | null;
	sharedWith?: IUser[];
}
