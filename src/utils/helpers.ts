// Express.js helper functions for data fetching and pagination

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const _fetchData = <T>(dataFunction: () => T[], page: number | null | undefined, pageSize: number | null | undefined): T[] | PaginatedResult<T> => {
  const data: T[] = dataFunction(); // Execute the data-fetching logic

  if (page == null || !pageSize) {
    return data; // Return raw data if no pagination requested
  }

  // Apply pagination if page and pageSize are provided
  return paginate(data, page, pageSize);
};

export const paginate = <T>(data: T[], page: number = 0, pageSize: number = 1000): PaginatedResult<T> => {
  const startIndex: number = page * pageSize;
  const endIndex: number = startIndex + pageSize;
  const paginatedData: T[] = data.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    total: data.length,
    page,
    pageSize,
  };
};
