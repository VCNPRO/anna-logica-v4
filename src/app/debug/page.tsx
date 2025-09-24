'use client';

export default function DebugPage() {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
      <div className="space-y-2">
        <p><strong>NEXT_PUBLIC_DEMO_MODE:</strong> {isDemoMode || 'undefined'}</p>
        <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
        <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
      </div>

      <div className="mt-6">
        <button
          onClick={() => window.location.href = '/es'}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Go to /es
        </button>
      </div>
    </div>
  );
}