/**
 * HttpService Type Contracts
 *
 * These types define the frontend HTTP client's generic interface.
 * See Constitution Principle V: Single Data Fetch Pattern.
 */

// Mapper function type — transforms raw API data to typed model
export type DataMapper<TInput, TOutput> = (data: TInput) => TOutput;

// Pagination options
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

// HttpService static methods
export interface HttpServiceStatic {
  fetch<T>(
    serverFunctionName: string,
    mapper?: DataMapper<unknown, T> | null,
    paginationOptions?: PaginationOptions,
    context?: unknown,
    ...args: unknown[]
  ): Promise<T[]>;

  fetchPage<T>(
    serverFunctionName: string,
    mapper: DataMapper<unknown, T>,
    page?: number,
    pageSize?: number,
    context?: unknown,
    ...args: unknown[]
  ): Promise<T[]>;

  fetchAllPages<T>(
    serverFunctionName: string,
    mapper: DataMapper<unknown, T>,
    pageSize?: number,
    context?: unknown,
    ...args: unknown[]
  ): Promise<T[]>;

  post<T>(
    serverFunctionName: string,
    data: unknown,
    mapper?: DataMapper<unknown, T> | null,
    context?: unknown,
    ...args: unknown[]
  ): Promise<T>;

  patch<T>(
    serverFunctionName: string,
    data: unknown,
    mapper?: DataMapper<unknown, T> | null,
    context?: unknown,
  ): Promise<T>;

  delete<T>(
    serverFunctionName: string,
    mapper?: DataMapper<unknown, T> | null,
    context?: unknown,
  ): Promise<T>;
}
