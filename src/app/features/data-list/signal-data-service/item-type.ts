export type SignalDataItem = {
  id: string;
  name: string;
  optimisticId: string | undefined;
};

export type SignalPagination = {
  page: number;
  pageSize: number;
};
