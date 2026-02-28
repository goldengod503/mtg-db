"use client";

import { useState, useRef } from "react";

interface CSVImportProps {
  onImported: () => void;
}

export function CSVImport({ onImported }: CSVImportProps) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/collection/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
      onImported();
    } catch {
      setResult({ imported: 0, skipped: 0, total: 0 });
    }
    setUploading(false);
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h3 className="font-semibold mb-2">Import from CSV</h3>
      <p className="text-sm text-gray-400 mb-4">
        Upload an Archidekt CSV export to import your collection.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {uploading ? "Importing..." : "Choose CSV File"}
      </button>
      {result && (
        <div className="mt-3 text-sm">
          <p className="text-green-400">Imported {result.imported} of {result.total} cards</p>
          {result.skipped > 0 && (
            <p className="text-yellow-400">{result.skipped} cards skipped (not found in database)</p>
          )}
        </div>
      )}
    </div>
  );
}
