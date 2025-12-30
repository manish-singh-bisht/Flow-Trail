type FilterOperator = 'eq' | 'gt' | 'lt' | 'gte' | 'lte';

export type QueryableType = 'number' | 'boolean' | 'string';

export interface FilterConfig {
  path: string; // Nested path like "user.name" or "data.scores.total"
  operator: FilterOperator;
  value: string;
  type: QueryableType;
}
