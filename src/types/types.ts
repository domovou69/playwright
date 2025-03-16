export type FilterCategoriesType = 'Categories' | 'Colors' | 'Tags' | 'Price' | 'Sort by';
export enum FiltersType {
  CATEGORY = 'Category',
  COLORS = 'Colors',
  TAGS = 'Tags',
  PRICE = 'Price',
  SORT_BY = 'Sort by',
}
export type CardsTypes = 'all' | 'premium' | 'free';
export type ColorOptionType = 'Black' | 'Pink' | 'Red' | 'Blue' | 'White';
export type TagsOptionType = 'black' | 'cat' | 'bmw' | 'meme' | 'iphone';
export type PriceOptionType = 'Free' | 'Paid';
export type SortByType = 'Relevance' | 'Newest first' | 'Most popular';

export type SearchOptionType = 'All' | 'Wallpapers' | 'Ringtones' | 'Artists' | 'Notification sounds';
export type CategoriesMainType = 'Wallpapers' | 'Ringtones' | 'Notification sounds';
export type WallpaperCategoryType =
  | 'Funny'
  | 'Technology'
  | 'Entertainment'
  | 'Music'
  | 'Nature'
  | 'Drawings'
  | 'Sports'
  | 'Brands'
  | 'Cars & Vehicles'
  | 'Other'
  | 'Animals'
  | 'Patterns'
  | 'Bollywood'
  | 'Anime'
  | 'Games'
  | 'Love'
  | 'News & Politics'
  | 'People'
  | 'Sayings'
  | 'Spiritual'
  | 'Space'
  | 'Comics';

export type RingtoneCategoryType =
  | 'Entertainment'
  | 'Other'
  | 'Animals'
  | 'Bollywood'
  | 'Games'
  | 'Hollydays'
  | 'News & Politics'
  | 'Sayings'
  | 'Alternative'
  | 'Children'
  | 'Classical'
  | 'Country'
  | 'Dance'
  | 'Electronica'
  | 'Comedy'
  | 'Hip Hop'
  | 'Jazz'
  | 'Latin'
  | 'Pop'
  | 'Rnb Soul'
  | 'Reggae'
  | 'Rock'
  | 'Message Tones'
  | 'Sound Effects'
  | 'World'
  | 'Blues'
  | 'Religious'
  | 'Contact Ringtones';

export type NotificationSoundCategoryType = RingtoneCategoryType;

export const CATEGORY_SELECTION: Record<CategoriesMainType, WallpaperCategoryType[] | RingtoneCategoryType[] | NotificationSoundCategoryType[]> = {
  Wallpapers: [
    'Funny',
    'Technology',
    'Entertainment',
    'Music',
    'Nature',
    'Drawings',
    'Sports',
    'Brands',
    'Cars & Vehicles',
    'Other',
    'Animals',
    'Patterns',
    'Bollywood',
    'Anime',
    'Games',
    'Love',
    'News & Politics',
    'People',
    'Sayings',
    'Spiritual',
    'Space',
    'Comics',
  ],
  Ringtones: [
    'Entertainment',
    'Other',
    'Animals',
    'Bollywood',
    'Games',
    'Hollydays',
    'News & Politics',
    'Sayings',
    'Alternative',
    'Children',
    'Classical',
    'Country',
    'Dance',
    'Electronica',
    'Comedy',
    'Hip Hop',
    'Jazz',
    'Latin',
    'Pop',
    'Rnb Soul',
    'Reggae',
    'Rock',
    'Message Tones',
    'Sound Effects',
    'World',
    'Blues',
    'Religious',
    'Contact Ringtones',
  ],
  'Notification sounds': [
    'Entertainment',
    'Other',
    'Animals',
    'Bollywood',
    'Games',
    'Hollydays',
    'News & Politics',
    'Sayings',
    'Alternative',
    'Children',
    'Classical',
    'Country',
    'Dance',
    'Electronica',
    'Comedy',
    'Hip Hop',
    'Jazz',
    'Latin',
    'Pop',
    'Rnb Soul',
    'Reggae',
    'Rock',
    'Message Tones',
    'Sound Effects',
    'World',
    'Blues',
    'Religious',
    'Contact Ringtones',
  ],
};
