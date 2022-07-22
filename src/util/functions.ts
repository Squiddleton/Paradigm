type noPuncOverload = {
	(str: string): string;
	(str: null|undefined): null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const noPunc: noPuncOverload = (str: any) => {
	if (!str) return null;
	return str
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replaceAll('&', 'and')
		.replace(/[^0-9a-z]/gi, '');
};

export const randomFromArray = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];