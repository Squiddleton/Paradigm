import { ApplicationCommandOptionData, Awaitable, ChatInputCommandInteraction, ClientEvents, PermissionFlagsBits } from 'discord.js';

export interface CosmeticAPI {
	status: number;
	data: Cosmetic[];
}

export interface Cosmetic {
	id: string;
	name: string;
	description: string;
	customExclusiveCallout: string | undefined;
	type: Values;
	rarity: Values;
	series: {
		value: string;
		image: string | null;
		backendValue: string;
	} | null;
	set: Values;
	introduction: {
		chapter: string;
		season: string;
		text: string;
		backendValue: number;
	} | null;
	images: {
		smallIcon: string | null;
		icon: string;
		featured: string | null;
		other: { [key: string]: string } | null;
	};
	variants: {
		channel: string;
		type: string;
		options: {
			tag: string;
			name: string;
			image: string;
		}[];
	}[] | null;
	builtInEmoteIds: string[];
	searchTags: string[] | null;
	gameplayTags: string[] | null;
	metaTags: string[] | null;
	showcaseVideo: string | null;
	dynamicPakId: string | null;
	itemPreviewHeroPath: string | undefined;
	displayAssetPath: string | null;
	definitionPath: string | null;
	path: string;
	added: string;
	shopHistory: string[] | null;
}

export interface Values {
	value: string;
	displayValue: string;
	backendValue: string;
}

export interface MapAPI {
	status: number;
	data: {
		images: {
			blank: string;
			pois: string;
		};
		pois: {
			id: string;
			name: string;
			location: {
				x: number;
				y: number;
				z: number;
			};
		}[];
	};
}

export interface PlaylistAPI {
	status: number;
	data: Playlist[];
}

export interface Playlist {
	id: string;
	name: string;
	subName: string | null;
	description: string | null;
	gameType: string | null;
	ratingType: string;
	minPlayers: number;
	maxPlayers: number;
	maxTeams: number;
	maxTeamSize: number;
	maxSquads: number;
	maxSquadSize: number;
	isDefault: boolean;
	isTournament: boolean;
	isLimitedTimeMode: boolean;
	isLargeTeamGame: boolean;
	accumulateToProfileStats: boolean;
	images: {
		showcase: string | null;
		missionIcon: string | null;
	};
	gameplayTags: string[];
	path: string;
	added: string;
}

export interface EventData<T extends keyof ClientEvents> {
	name: T;
	once?: boolean;
    execute: (...params: ClientEvents[T]) => Awaitable<void>;
}

export class Event<T extends keyof ClientEvents> implements EventData<T> {
	name: T;
	once = false;
	execute: (...params: ClientEvents[T]) => Awaitable<void>;
	constructor(data: EventData<T>) {
		this.name = data.name;
		this.once = data.once ?? false;
		this.execute = data.execute;
	}
}

export interface ShopEntry {
	regularPrice: number;
	finalPrice: number;
	bundle: {
		name: string;
		info: string;
		image: string;
	};
	banner: {
		value: string;
		intensity: string;
		backendValue: string;
	};
	giftable: boolean;
	refundable: boolean;
	sortPriority: number;
	categories: string[];
	sectionId: string;
	section: {
		id: string;
		name: string;
		index: number;
		landingPriority: number;
		sortOffersByOwnership: boolean;
		showIneligibleOffers: boolean;
		showIneligibleOffersIfGiftable: boolean;
		showTimer: boolean;
		enableToastNotification: boolean;
		hidden: boolean;
	};
	devName: string;
	offerId: string;
	displayAssetPath: string;
	tileSize: string;
	newDisplayAssetPath: string;
	newDisplayAsset: {
		id: string;
		cosmeticId: string | null;
		materialInstances: {
			id: string;
			images: {
				OfferImage: string;
				Background: string;
			};
			colors: {
				Background_Color_A: string;
				Background_Color_B: string;
				FallOff_Color: string;
			};
			scalings: {[key: string]: number};
			flags: null;
		}[];
	};
	items: Cosmetic[];
}

export interface Shop {
	status: number;
	data: {
		hash: string;
		date: string;
		vbuckIcon: string;
		featured: {
			name: string;
			entries: ShopEntry[];
		};
		daily: {
			name: string;
			entries: ShopEntry[];
		};
		votes: null;
		voteWinners: null;
	};
}

export interface SlashCommandData {
	name: string;
	description: string;
	options?: ApplicationCommandOptionData[];
	global?: boolean;
	permissions?: (typeof PermissionFlagsBits)[];
	execute: (interaction: ChatInputCommandInteraction) => Awaitable<void>;
}

export class SlashCommand {
	name: string;
	description: string;
	options: ApplicationCommandOptionData[] = [];
	global = true;
	permissions: (typeof PermissionFlagsBits)[] | null;
	execute: (interaction: ChatInputCommandInteraction) => Awaitable<void>;
	constructor(data: SlashCommandData) {
		this.name = data.name;
		this.description = data.description;
		this.options = data.options = [];
		this.global = data.global ?? true;
		this.permissions = data.permissions ?? null;
		this.execute = data.execute;
	}
}