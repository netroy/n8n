// Load type definitions that come with Cypress module
/// <reference types="cypress" />

import type { Interception } from 'cypress/types/net-stubbing';
import { IN8nUISettings } from 'n8n-workflow';

interface SigninPayload {
	email: string;
	password: string;
}

declare global {
	namespace Cypress {
		interface SuiteConfigOverrides {
			disableAutoLogin: boolean;
		}

		interface Chainable {
			config(key: keyof SuiteConfigOverrides): boolean;
			getByTestId(
				selector: string,
				...args: Array<Partial<Loggable & Timeoutable & Withinable & Shadow> | undefined>
			): Chainable<JQuery<HTMLElement>>;
			findChildByTestId(childTestId: string): Chainable<JQuery<HTMLElement>>;
			createFixtureWorkflow(fixtureKey: string, workflowName: string): void;
			signin(payload: SigninPayload): void;
			signinAsOwner(): void;
			signout(): void;
			overrideSettings(value: Partial<IN8nUISettings>): void;
			enableFeature(feature: string): void;
			disableFeature(feature: string): void;
			enableQueueMode(): void;
			disableQueueMode(): void;
			changeQuota(feature: string, value: number): void;
			waitForLoad(waitForIntercepts?: boolean): void;
			grantBrowserPermissions(...permissions: string[]): void;
			readClipboard(): Chainable<string>;
			paste(pastePayload: string): void;
			drag(
				selector: string | Chainable<JQuery<HTMLElement>>,
				target: [number, number],
				options?: { abs?: boolean; index?: number; realMouse?: boolean; clickToFinish?: boolean },
			): void;
			draganddrop(draggableSelector: string, droppableSelector: string): void;
			push(type: string, data: unknown): void;
			shouldNotHaveConsoleErrors(): void;
			window(): Chainable<
				AUTWindow & {
					innerWidth: number;
					innerHeight: number;
					preventNodeViewBeforeUnload?: boolean;
					featureFlags: {
						override: (feature: string, value: unknown) => void;
					};
				}
			>;
			resetDatabase(): void;
		}
	}
}

export {};
