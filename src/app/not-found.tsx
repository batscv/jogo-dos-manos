export const runtime = "edge";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold text-white mb-2">404 - Página Não Encontrada</h2>
      <p className="text-zinc-400">A página solicitada não foi encontrada.</p>
    </div>
  );
}
