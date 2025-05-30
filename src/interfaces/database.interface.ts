export interface IDatabase {
  query<T>(sql: string, params?: unknown[]): Promise<T>;
  transaction<T>(callback: (transaction: IDatabase) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface IRepository<T, TCreateInput, TUpdateInput = Partial<T>> {
  findOne(id: string): Promise<T | null>;
  findMany(filter: Partial<T>): Promise<T[]>;
  create(data: TCreateInput): Promise<T>;
  update(id: string, data: TUpdateInput): Promise<T>;
  delete(id: string): Promise<void>;
  count(filter: Partial<T>): Promise<number>;
}

export interface QueryFilter<T> {
  where?: Partial<T>;
  orderBy?: {
    [K in keyof T]?: 'asc' | 'desc';
  };
  skip?: number;
  take?: number;
}

/**
 * Generic paginated result interface used across the application
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
