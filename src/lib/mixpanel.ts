import mixpanel from "mixpanel-browser";

mixpanel.init("a981107e5ebb31840870b451eae74084", {
  persistence: "localStorage",
  track_pageview: true,
  api_host: "https://api-eu.mixpanel.com",
});

export { mixpanel };
