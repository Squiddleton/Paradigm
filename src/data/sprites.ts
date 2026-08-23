import type { Sprite } from '../util/types.js';

export const SPRITES: Sprite[] = [
	// C7S3
	/*
	{
		name: 'John Wick',
		variant: null
	},
	{
		name: 'Batman',
		variant: null
	},
	{
		name: 'Batman',
		variant: 'Cube'
	},
	{
		name: 'Batman',
		variant: 'Gold'
	},
	{
		name: 'Batman',
		variant: 'Gummy'
	},
	{
		name: 'Batman',
		variant: 'Galaxy'
	},
	{
		name: 'Batman',
		variant: 'Holofoil'
	},
	{
		name: 'Water',
		variant: null
	},
	{
		name: 'Water',
		variant: 'Gold'
	},
	{
		name: 'Water',
		variant: 'Quack'
	},
	{
		name: 'Water',
		variant: 'Gummy'
	},
	{
		name: 'Water',
		variant: 'Galaxy'
	},
	{
		name: 'Water',
		variant: 'Gem'
	},
	{
		name: 'Water',
		variant: 'Holofoil'
	},
	{
		name: 'Earth',
		variant: null
	},
	{
		name: 'Earth',
		variant: 'Cube'
	},
	{
		name: 'Earth',
		variant: 'Gold'
	},
	{
		name: 'Earth',
		variant: 'Quack'
	},
	{
		name: 'Earth',
		variant: 'Gummy'
	},
	{
		name: 'Earth',
		variant: 'Galaxy'
	},
	{
		name: 'Earth',
		variant: 'Gem'
	},
	{
		name: 'Fire',
		variant: null
	},
	{
		name: 'Fire',
		variant: 'Cube'
	},
	{
		name: 'Fire',
		variant: 'Gold'
	},
	{
		name: 'Fire',
		variant: 'Quack'
	},
	{
		name: 'Fire',
		variant: 'Gummy'
	},
	{
		name: 'Fire',
		variant: 'Galaxy'
	},
	{
		name: 'Fire',
		variant: 'Holofoil'
	},
	{
		name: 'Duck',
		variant: null
	},
	{
		name: 'Duck',
		variant: 'Gold'
	},
	{
		name: 'Duck',
		variant: 'Gummy'
	},
	{
		name: 'Duck',
		variant: 'Galaxy'
	},
	{
		name: 'Duck',
		variant: 'Gem'
	},
	{
		name: 'Ghost',
		variant: null
	},
	{
		name: 'Ghost',
		variant: 'Gold'
	},
	{
		name: 'Ghost',
		variant: 'Gummy'
	},
	{
		name: 'Ghost',
		variant: 'Galaxy'
	},
	{
		name: 'Ghost',
		variant: 'Holofoil'
	},
	{
		name: 'Dream',
		variant: null
	},
	{
		name: 'Dream',
		variant: 'Cube'
	},
	{
		name: 'Dream',
		variant: 'Gold'
	},
	{
		name: 'Dream',
		variant: 'Gummy'
	},
	{
		name: 'Dream',
		variant: 'Galaxy'
	},
	{
		name: 'Demon',
		variant: null
	},
	{
		name: 'Demon',
		variant: 'Gold'
	},
	{
		name: 'Demon',
		variant: 'Gummy'
	},
	{
		name: 'Demon',
		variant: 'Galaxy'
	},
	{
		name: 'Demon',
		variant: 'Gem'
	},
	{
		name: 'Punk',
		variant: null
	},
	{
		name: 'Punk',
		variant: 'Cube'
	},
	{
		name: 'Punk',
		variant: 'Gold'
	},
	{
		name: 'Punk',
		variant: 'Gummy'
	},
	{
		name: 'Punk',
		variant: 'Galaxy'
	},
	{
		name: 'King',
		variant: null
	},
	{
		name: 'King',
		variant: 'Gold'
	},
	{
		name: 'King',
		variant: 'Gummy'
	},
	{
		name: 'King',
		variant: 'Galaxy'
	},
	{
		name: 'King',
		variant: 'Holofoil'
	},
	{
		name: 'Vini Jr',
		variant: null
	},
	{
		name: 'Burnt Peanut',
		variant: null
	},
	{
		name: 'Zero Point',
		variant: null
	},
	{
		name: 'Zero Point',
		variant: 'Cube'
	},
	{
		name: 'Zero Point',
		variant: 'Gold'
	},
	{
		name: 'Zero Point',
		variant: 'Quack'
	},
	{
		name: 'Zero Point',
		variant: 'Gummy'
	},
	{
		name: 'Zero Point',
		variant: 'Galaxy'
	},
	{
		name: 'Zero Point',
		variant: 'Gem'
	},
	{
		name: 'Zero Point',
		variant: 'Holofoil'
	},
	{
		name: 'Fishy',
		variant: null
	},
	{
		name: 'Fishy',
		variant: 'Cube'
	},
	{
		name: 'Fishy',
		variant: 'Gold'
	},
	{
		name: 'Fishy',
		variant: 'Gummy'
	},
	{
		name: 'Fishy',
		variant: 'Galaxy'
	},
	{
		name: 'Striker',
		variant: null
	},
	{
		name: 'Striker',
		variant: 'Gold'
	},
	{
		name: 'Striker',
		variant: 'Gummy'
	},
	{
		name: 'Striker',
		variant: 'Galaxy'
	},
	{
		name: 'Striker',
		variant: 'Holofoil'
	},
	{
		name: 'Aura',
		variant: null
	},
	{
		name: 'Aura',
		variant: 'Gold'
	},
	{
		name: 'Aura',
		variant: 'Gummy'
	},
	{
		name: 'Aura',
		variant: 'Galaxy'
	},
	{
		name: 'Aura',
		variant: 'Gem'
	},
	{
		name: 'Boss',
		variant: null
	},
	{
		name: 'Boss',
		variant: 'Cube'
	},
	{
		name: 'Boss',
		variant: 'Gold'
	},
	{
		name: 'Boss',
		variant: 'Gummy'
	},
	{
		name: 'Boss',
		variant: 'Galaxy'
	},
	{
		name: 'Grim',
		variant: null
	},
	{
		name: 'Grim',
		variant: 'Cube'
	},
	{
		name: 'Grim',
		variant: 'Gold'
	},
	{
		name: 'Grim',
		variant: 'Gummy'
	},
	{
		name: 'Grim',
		variant: 'Galaxy'
	},
	{
		name: 'Grim',
		variant: 'Gem'
	},
	{
		name: 'Grim',
		variant: 'Holofoil'
	},
	{
		name: 'Air',
		variant: null
	},
	{
		name: 'Air',
		variant: 'Gold'
	},
	{
		name: 'Air',
		variant: 'Gummy'
	},
	{
		name: 'Air',
		variant: 'Galaxy'
	},
	{
		name: 'Air',
		variant: 'Holofoil'
	},
	{
		name: 'Seven',
		variant: null
	},
	{
		name: 'Seven',
		variant: 'Gold'
	},
	{
		name: 'Seven',
		variant: 'Gummy'
	},
	{
		name: 'Seven',
		variant: 'Galaxy'
	},
	{
		name: 'Seven',
		variant: 'Holofoil'
	},
	{
		name: 'Ironmouse',
		variant: null
	},
	{
		name: 'Pollo',
		variant: null
	},
	{
		name: 'Llama',
		variant: null
	},
	{
		name: 'Llama',
		variant: 'Gold'
	},
	{
		name: 'Llama',
		variant: 'Gummy'
	},
	{
		name: 'Llama',
		variant: 'Galaxy'
	},
	{
		name: 'Llama',
		variant: 'Gem'
	},
	{
		name: 'Peeky Peely',
		variant: null
	},
	{
		name: 'Peeky Peely',
		variant: 'Gold'
	},
	{
		name: 'Peeky Peely',
		variant: 'Gummy'
	},
	{
		name: 'Peeky Peely',
		variant: 'Galaxy'
	},
	{
		name: 'Peeky Peely',
		variant: 'Holofoil'
	}
	*/
	{
		name: 'Adventure',
		variant: null
	},
	{
		name: 'Adventure',
		variant: 'Cheat Master'
	},
	{
		name: 'Adventure',
		variant: 'Gold'
	},
	{
		name: '8-Bit',
		variant: null
	},
	{
		name: '8-Bit',
		variant: 'Cheat Master'
	},
	{
		name: '8-Bit',
		variant: 'Gold'
	},
	{
		name: 'Jonesy',
		variant: null
	},
	{
		name: 'Jonesy',
		variant: 'Cheat Master'
	},
	{
		name: 'Jonesy',
		variant: 'Gold'
	},
	{
		name: 'Bush',
		variant: null
	},
	{
		name: 'Bush',
		variant: 'Cheat Master'
	},
	{
		name: 'Bush',
		variant: 'Gold'
	},
	{
		name: 'Killswitch',
		variant: null
	},
	{
		name: 'Killswitch',
		variant: 'Cheat Master'
	},
	{
		name: 'Killswitch',
		variant: 'Gold'
	},
	{
		name: 'Tails',
		variant: null
	},
	{
		name: 'Tails',
		variant: 'Cheat Master'
	},
	{
		name: 'Tails',
		variant: 'Gold'
	},
	{
		name: 'Shadow',
		variant: null
	},
	{
		name: 'Shadow',
		variant: 'Cheat Master'
	},
	{
		name: 'Shadow',
		variant: 'Gold'
	},
	{
		name: 'Sonic',
		variant: null
	},
	{
		name: 'Sonic',
		variant: 'Cheat Master'
	},
	{
		name: 'Sonic',
		variant: 'Gold'
	},
	{
		name: 'Jackrabbit',
		variant: null
	},
	{
		name: 'Jackrabbit',
		variant: 'Cheat Master'
	},
	{
		name: 'Jackrabbit',
		variant: 'Gold'
	},
	{
		name: 'Klombo',
		variant: null
	},
	{
		name: 'Klombo',
		variant: 'Cheat Master'
	},
	{
		name: 'Klombo',
		variant: 'Gold'
	},
	{
		name: 'Crown',
		variant: null
	},
	{
		name: 'Crown',
		variant: 'Cheat Master'
	},
	{
		name: 'Crown',
		variant: 'Gold'
	},
	{
		name: 'Storm Scout',
		variant: null
	},
	{
		name: 'Storm Scout',
		variant: 'Cheat Master'
	},
	{
		name: 'Storm Scout',
		variant: 'Gold'
	}
];