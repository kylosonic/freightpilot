const CURRENT_CONSOLE = 'https://freightpilot-ops.pages.dev';

function buildSafeRedirectUrl(requestUrl) {
  const incoming = new URL(requestUrl);
  const safePath = '/' + incoming.pathname.replace(/^[\\/]+/, '');
  const destination = new URL(`${safePath}${incoming.search}`, CURRENT_CONSOLE);
  if (destination.origin !== CURRENT_CONSOLE) {
    return `${CURRENT_CONSOLE}/`;
  }
  return destination.toString();
}

export default {
  fetch(request) {
    return new Response(null, {
      status: 301,
      headers: {
        Location: buildSafeRedirectUrl(request.url),
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
};
