export const config = {
  runtime: 'edge',
};

export default function handler(request) {
  return new Response(JSON.stringify({ status: 'warm' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
