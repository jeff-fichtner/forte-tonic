// Express.js helper functions for data fetching and pagination
export const _fetchData = (dataFunction, page, pageSize) => {
  const data = dataFunction(); // Execute the data-fetching logic

  if (page == null || !pageSize) {
    return data; // Return raw data if no pagination requested
  }

  // Apply pagination if page and pageSize are provided
  return paginate(data, page, pageSize);
};

export const _respond = response => {
  return response;
};

export const paginate = (data, page = 0, pageSize = 1000) => {
  const startIndex = page * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    total: data.length,
    page,
    pageSize,
  };
};
