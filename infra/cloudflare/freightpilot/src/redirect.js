const CURRENT_SITE = 'https://freightpilot.pages.dev';

function buildSafeRedirectUrl(requestUrl) {
  const incoming = new URL(requestUrl);
  const safePath = '/' + incoming.pathname.replace(/^[\\/]+/, '');
  const destination = new URL(`${safePath}${incoming.search}`, CURRENT_SITE);
  if (destination.origin !== CURRENT_SITE) {
    return `${CURRENT_SITE}/`;
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
