const CURRENT_CONSOLE = 'https://freightpilot-ops.pages.dev';

export default {
  fetch(request) {
    const incoming = new URL(request.url);
    const destination = new URL(`${incoming.pathname}${incoming.search}`, CURRENT_CONSOLE);
    return Response.redirect(destination.toString(), 301);
  },
};
