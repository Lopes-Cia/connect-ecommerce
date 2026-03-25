// app/api/check-conn/route.ts
import net from 'net';

export async function GET() {
  const host = '45.225.191.246';
  const port = 9002;

  const result = await new Promise<{ status: string; code?: string; message?: string }>((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(5000);

    socket.connect(port, host, () => {
      socket.destroy();
      resolve({ status: 'connected' });
    });

    socket.on('error', (err: NodeJS.ErrnoException) => {
      socket.destroy();
      resolve({ status: 'failed', code: err.code, message: err.message });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ status: 'timeout' });
    });
  });

  return Response.json({ host, port, ...result });
}