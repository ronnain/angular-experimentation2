const entityWithListStore = entityStore({
  entitySrc: {
    src: () => this.entityWithList$,
    query: (data) => this.AnimationapiService.get(data),
  },
  actions: {
    updateName: entityLevelAction({
      src: () => this.updateItem$,
      api: ({ data }) => {
        return this.apiService.update(data);
      },
      operator: switchMap,
    }),
    delete: entityLevelAction({
      src: () => this.deleteItem$,
      api: ({ data }) => {
        return this.apiService.delete(data.id);
      },
      operator: exhaustMap,
    }),
    create: entityLevelAction({
      src: () => this.createItem$,
      api: ({ data }) => {
        return this.apiService.create(data);
      },
      operator: switchMap,
    }),
  },
  propertiesAction: {
    // key are infer from the data type
    categories: (data$) =>
      dataListStore({
        entitiesSrc: {
          // ! may be  avoided
          src: () => data$,
          reducer: (data) => data.categories,
        },
        actions: {
          updateCategory: entityLevelAction({
            src: () => this.updateCategory$,
            api: ({ data }) => {
              return this.dataListService.updateItem(data);
            },
            operator: switchMap,
          }),
          createCategory: entityLevelAction({
            src: () => this.createCategory$,
            api: ({ data }) => this.dataListService.addItem(data),
            operator: switchMap,
          }),
          deleteCategory: entityLevelAction({
            src: () => this.deleteCategory$,
            api: ({ data }) => this.dataListService.deleteItem(data.id),
            operator: exhaustMap,
          }),
        },
        bulkActions {
            ....
        },
        propertiesAction: {
            // ! enbale to go deeper ?
        }
      }),
  },
});

function entityStore(data: any) {}
function getApiCallService(data: any) {
  throw new Error('Function not implemented.');
}

function entityLevelAction(arg0: {
  src: () => any;
  api: ({ data }: { data: any }) => any;
  operator: any;
}) {
  throw new Error('Function not implemented.');
}
