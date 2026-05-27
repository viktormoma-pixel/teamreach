import mixpanel from "mixpanel-browser";

mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN as string, {
  persistence: "localStorage",
  track_pageview: true,
  api_host: "https://api-eu.mixpanel.com",
  // GDPR: no tracking until user explicitly consents
  opt_out_tracking_by_default: true,
});

export { mixpanel };
