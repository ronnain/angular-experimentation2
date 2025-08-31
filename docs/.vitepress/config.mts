import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "ng-query",
  description: "ng-query is a server state management tool",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Examples", link: "/markdown-examples" },
    ],

    sidebar: [
      {
        text: "Signal Store",
        items: [
          { text: "Overview", link: "/signal-store" },
          { text: "Query", link: "/signal-store-query" },
          { text: "Mutation", link: "/signal-store-mutation" },
          { text: "Optimistic update & other effects", link: "/signal-store-optimistic" },
          {
            text: "Global Query",
            items: [
              { text: "Overview", link: "/signal-store-global-query" },
              { text: "Using global query", link: "/signal-store-global-using" },
              { text: "Persister", link: "/signal-store-global-persister" },
              { text: "Mutate global query", link: "/signal-store-global-mutate" },
              { text: "Feature prefix", link: "/signal-store-global-feature-prefix" },
            ],
          },
          { text: "Parallel Queries & Mutations", link: "/signal-store-parallel" },
          { text: "Paginated Query", link: "/signal-store-paginated" },
          { text: "Server State Store", link: "/signal-store-server-state" },
        ],
      },
      {
        text: "Examples",
        items: [
          { text: "Markdown Examples", link: "/markdown-examples" },
          { text: "Runtime API Examples", link: "/api-examples" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
});
