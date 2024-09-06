/* eslint-disable max-len */
import fs from 'fs';
import Mailosaur from 'mailosaur';
import { Message, MessageListResult, MessageSummary, SearchCriteria, SearchOptions } from 'mailosaur/lib/models';
import { Page } from '@playwright/test';
import { Secrets } from 'shared/pages/secrets';
import { logger } from 'shared/logger';
import { smsPhoneNumber } from 'shared/constants';

const secrets = new Secrets();

async function checkMailosaurKey() {
	await secrets.readEnvVariableIfNeeded('MAILOSAUR_KEY');
}

// TODO: extend this to the upcoming API class
export class MailosaurAPI {
	readonly page: Page;
	// Mailosaur constants
	readonly serverId: string;
	readonly serverDomain: string;
	// Actions
	listServerMessages: (options?: SearchOptions) => Promise<MessageListResult>;
	searchMessages: (criteria: SearchCriteria, options?: SearchOptions) => Promise<MessageListResult>;
	searchMessagesByOriginalReceiver: (
		originalReceiverEmail: string,
		criteria: SearchCriteria,
		options?: SearchOptions,
	) => Promise<MessageSummary[]>;
	getEmailData: (
		emailAccount: string,
		options?: {
			downloadAttachment?: boolean;
			downloadLocation?: string;
			receivedAfter?: Date;
			extendedWaitTime?: number;
			searchRetries?: number;
			sentFrom?: string;
			subject?: string;
			body?: string;
			match?: 'ALL' | 'ANY';
		},
	) => Promise<Message>;
	getSMSData: (options?: {
		receivedAfter?: Date;
		extendedWaitTime?: number;
		searchRetries?: number;
		match?: 'ALL' | 'ANY';
	}) => Promise<Message>;
	verifyNoEmailSent: (emailAccount: string | undefined, receivedAfter?: Date) => Promise<boolean>;

	constructor(page: Page) {
		this.page = page;
		// Mailosaur constants
		this.serverId = '6t3k2bld';
		this.serverDomain = '6t3k2bld.mailosaur.net';

		// Actions
		this.listServerMessages = async (options?: SearchOptions): Promise<MessageListResult> => {
			await checkMailosaurKey();
			const mailosaur = new Mailosaur(process.env.MAILOSAUR_KEY!);
			return mailosaur.messages.list(this.serverId, options);
		};

		this.searchMessages = async (criteria: SearchCriteria, options?: SearchOptions): Promise<MessageListResult> => {
			await checkMailosaurKey();
			const mailosaur = new Mailosaur(process.env.MAILOSAUR_KEY!);
			return mailosaur.messages.search(this.serverId, criteria, options);
		};

		this.searchMessagesByOriginalReceiver = async (
			originalReceiverEmail: string,
			criteria: SearchCriteria,
			options?: SearchOptions,
		): Promise<MessageSummary[]> => {
			const messages = await this.searchMessages(criteria, options);
			const emails = messages.items;
			const filteredEmails: MessageSummary[] = [];
			emails!.forEach((email) => {
				const sender = email.to![0]?.email;
				if (sender === originalReceiverEmail) filteredEmails.push(email);
			});
			return filteredEmails;
		};

		// eslint-disable-next-line complexity
		this.getEmailData = async (
			emailAccount: string,
			options?: {
				downloadAttachment?: boolean;
				downloadLocation?: string;
				receivedAfter?: Date;
				extendedWaitTime?: number;
				searchRetries?: number;
				sentFrom?: string;
				subject?: string;
				body?: string;
				match?: 'ALL' | 'ANY';
			},
		): Promise<Message> => {
			await checkMailosaurKey();
			const mailosaur = new Mailosaur(process.env.MAILOSAUR_KEY!);
			const receivedAfterDate = options?.receivedAfter || new Date(2023, 0, 1);
			let email: Message | PromiseLike<Message>;

			// Search for the email after pause to allow for delivery
			await page.waitForTimeout(8000);

			let success = false;
			let tries = options?.searchRetries || 2;

			while (!success && tries > 0) {
				try {
					email = await mailosaur.messages.get(
						this.serverId,
						{
							sentTo: `${emailAccount}@${this.serverDomain}`,
							sentFrom: options?.sentFrom,
							subject: options?.subject,
							body: options?.body,
							match: options?.match,
						},
						{ receivedAfter: receivedAfterDate },
					);
					// Download attachment for image comparison
					if (options?.downloadAttachment) {
						// Make download directory if needed
						const defaultDownloadLocation = 'test/browser/downloads/qs/temp/';
						const downloadDir = options?.downloadLocation || defaultDownloadLocation;
						if (!fs.existsSync(downloadDir)) {
							fs.mkdirSync(downloadDir, { recursive: true });
						}
						const firstAttachment = email.attachments![0];
						const imageName = firstAttachment!.fileName;
						// We have to declare this as unknown because Mailosaur returns the wrong type
						const testFile: unknown = await mailosaur.files.getAttachment(firstAttachment!.id);
						fs.writeFileSync(`${downloadDir}${imageName}`, testFile as Buffer);
					}
					success = true;
				} catch {
					logger('Message search failed. Trying again.');
					await page.waitForTimeout(options?.extendedWaitTime || 5000);
					tries -= 1;
				}
			}
			return email!;
		};

		this.getSMSData = async (options?: {
			receivedAfter?: Date;
			extendedWaitTime?: number;
			searchRetries?: number;
		}): Promise<Message> => {
			await checkMailosaurKey();
			const mailosaur = new Mailosaur(process.env.MAILOSAUR_KEY!);
			const receivedAfterDate = options?.receivedAfter || new Date(2023, 0, 1);
			let message: Message | PromiseLike<Message>;

			// Search for the SMS message after pause to allow for delivery
			await page.waitForTimeout(8000);

			let success = false;
			let tries = options?.searchRetries || 2;

			while (!success && tries > 0) {
				try {
					message = await mailosaur.messages.get(
						this.serverId,
						{
							sentTo: smsPhoneNumber,
						},
						{
							receivedAfter: receivedAfterDate,
						},
					);
					success = true;
				} catch {
					logger('SMS message search failed. Trying again.');
					await page.waitForTimeout(options?.extendedWaitTime || 5000);
					tries -= 1;
				}
			}
			return message!;
		};

		/**
		 * Verifies that no emails were sent to a specified Mailosaur address
		 * @param emailAccount
		 * @param receivedAfter
		 * @returns
		 */
		this.verifyNoEmailSent = async (emailAccount: string | undefined, receivedAfter?: Date): Promise<boolean> => {
			await checkMailosaurKey();
			const mailosaur = new Mailosaur(process.env.MAILOSAUR_KEY!);
			const receivedAfterDate = receivedAfter || new Date('2022-01-01T00:00:00Z');
			let isSent = true;

			// Search for the email after pause to allow for delivery
			await page.waitForTimeout(5000);
			try {
				await mailosaur.messages.get(
					this.serverId,
					{ sentTo: `${emailAccount}@${this.serverDomain}` },
					{ receivedAfter: receivedAfterDate },
				);
				logger('Message was delivered in error', { logLevel: 'warn' });
			} catch {
				isSent = false;
			}
			return isSent;
		};

		// TODO: action to compare email image attachment
	}
}
