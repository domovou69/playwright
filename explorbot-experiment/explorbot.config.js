// 'provider/model-id' uses a bundled provider.
// It is also possible to import provider as a module from Vercel AI SDK.
// https://github.com/testomatio/explorbot/blob/main/docs/basics/providers.md

const config = {
  web: {
    // use application host without path prefix (e.g., http://localhost:3000)
    url: 'https://www.zedge.net',
  },

  ai: {
    // fast model with tool calling capabilities
    model: 'google/gemini-3.1-flash-lite',
    // vision model for screenshot analysis
    visionModel: 'google/gemini-3.1-flash-lite',
    // agentic model for decision making
    // switched from gemini-3.5-flash: its free tier RPD (20/day) can't cover a full
    // execute run across 22 scenarios; flash-lite has 500 RPD / 15 RPM headroom
    agenticModel: 'google/gemini-3.1-flash-lite',

    // historian agent writes the final "kept" test files — switch its output
    // from CodeceptJS (default) to Playwright Test syntax
    agents: {
      historian: {
        framework: 'playwright',
      },
    },
  },

  reporter: {
    // Save a local HTML report after each run.
    html: true,
    // Save a local markdown report after each run.
    markdown: true,
    // Group runs by title in Testomat.io / HTML reports. Defaults to today's date — customize or remove.
    runGroup: new Date().toISOString().slice(0, 10),
  },
};

export default config;
