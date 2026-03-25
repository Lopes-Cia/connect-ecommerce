export async function GET() {
  const response = await fetch('https://api.ipify.org?format=json', {
    cache: 'no-store',
  });
  const data = await response.json();
  return Response.json({ serverIp: data.ip });
}