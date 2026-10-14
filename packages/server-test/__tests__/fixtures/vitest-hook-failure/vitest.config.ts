// Fixture project for the suite-hook-failure integration test (#1174).
// The files are named *.probe.ts so the package's own vitest run never collects them.
export default {
  test: {
    include: ["*.probe.ts"],
  },
};
