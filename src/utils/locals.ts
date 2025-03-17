import { FilterCategoriesType } from '../types/types';

export const DEFAULT_FILTERS_VALUES: Record<FilterCategoriesType, string[]> = {
  Categories: ['Any'],
  Colors: ['Any'],
  Tags: ['Any'],
  Price: ['Any'],
  'Sort by': ['Relevance'],
};

export const locals = {
  MODAL_BUY_TITLE: `To buy this item you need {value}`,
};
