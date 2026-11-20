export default {
  fetch(request) {
    const incoming = new URL(request.url);
    const destination = new URL(
      `${incoming.pathname}${incoming.search}`,
      'https://freightpilot.pages.dev',
    );
    return Response.redirect(destination.toString(), 301);
  },
};
