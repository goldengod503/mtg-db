"use client";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";

interface CardResult {
  id: string;
  name: string;
  image_uri: string | null;
  image_uri_small: string | null;
  set_code: string | null;
  set_name: string | null;
  rarity: string | null;
  type_line: string | null;
  mana_cost: string | null;
  price_tcg_player: number | null;
}

type Phase = "camera" | "identifying" | "results" | "configure";

export default function ScannerPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12 text-gray-500">Loading...</div>
      }
    >
      <ScannerContent />
    </Suspense>
  );
}

function ScannerContent() {
  const [phase, setPhase] = useState<Phase>("camera");
  const [identifiedName, setIdentifiedName] = useState("");
  const [matchedCards, setMatchedCards] = useState<CardResult[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardResult | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [stats, setStats] = useState<{ total_duration_ms: number; prompt_eval_count: number; eval_count: number } | null>(null);
  const [rawResponse, setRawResponse] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Configure phase state
  const [quantity, setQuantity] = useState(1);
  const [finish, setFinish] = useState("Normal");
  const [condition, setCondition] = useState("NM");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // iOS requires explicit play() after setting srcObject
        try {
          await videoRef.current.play();
        } catch {
          // autoplay may handle it
        }
      }
      setCameraReady(true);
      // Try to enable continuous autofocus
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      if (capabilities?.focusMode?.includes("continuous")) {
        await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Could not access camera: ${message}`);
      console.error("Camera error:", err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const captureAndIdentify = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

    setPhase("identifying");
    setError("");
    setElapsed(0);
    setStats(null);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 0.1);
    }, 100);

    try {
      const res = await fetch("/api/scanner/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });

      if (timerRef.current) clearInterval(timerRef.current);

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Identification failed");
        setPhase("camera");
        return;
      }

      setIdentifiedName(data.identified_name || "");
      setMatchedCards(data.cards || []);
      if (data.stats) setStats(data.stats);
      if (data.raw_response) setRawResponse(data.raw_response);
      setPhase("results");
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      setError("Failed to connect to scanner API");
      setPhase("camera");
      console.error("Identify error:", err);
    }
  }, []);

  const selectCard = (card: CardResult) => {
    setSelectedCard(card);
    setQuantity(1);
    setFinish("Normal");
    setCondition("NM");
    setPhase("configure");
  };

  const addToCollection = async () => {
    if (!selectedCard) return;

    try {
      const res = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: selectedCard.id,
          quantity,
          finish,
          condition,
        }),
      });

      if (!res.ok) {
        setError("Failed to add card to collection");
        return;
      }

      setSuccessMessage(
        `Added ${quantity}x ${selectedCard.name} to collection!`
      );
      setPhase("camera");
      setSelectedCard(null);
      setMatchedCards([]);
      setIdentifiedName("");

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch {
      setError("Failed to add card to collection");
    }
  };

  const resetToCamera = () => {
    setPhase("camera");
    setSelectedCard(null);
    setMatchedCards([]);
    setIdentifiedName("");
    setRawResponse("");
    setStats(null);
    setError("");
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Card Scanner</h1>
        {phase !== "camera" && (
          <button
            onClick={resetToCamera}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-sm"
          >
            Back to Camera
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Phase */}
      {phase === "camera" && (
        <div className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-[3/4] sm:aspect-video">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Viewfinder overlay — responsive sizing */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[55%] max-w-64 aspect-[63/88] border-2 border-white/40 rounded-lg" />
            </div>
          </div>
          {!cameraReady ? (
            <button
              onClick={startCamera}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg active:bg-blue-800"
            >
              Start Camera
            </button>
          ) : (
            <button
              onClick={captureAndIdentify}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg active:bg-blue-800"
            >
              Capture & Identify
            </button>
          )}
        </div>
      )}

      {/* Identifying Phase */}
      {phase === "identifying" && (
        <div className="text-center py-16 space-y-4">
          <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-lg">
            Identifying card...
          </p>
          <p className="text-gray-500 text-sm font-mono">
            {elapsed.toFixed(1)}s
          </p>
        </div>
      )}

      {/* Results Phase */}
      {phase === "results" && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg px-4 py-3 space-y-3">
            <div>
              <span className="text-gray-400 text-sm">Detected name:</span>{" "}
              <span className="font-medium text-white">
                {identifiedName || "(empty)"}
              </span>
            </div>
            {rawResponse && (
              <div>
                <span className="text-gray-400 text-sm block mb-1">Model response:</span>
                <pre className="text-gray-300 whitespace-pre-wrap text-xs bg-gray-900 rounded p-3">
                  {rawResponse}
                </pre>
              </div>
            )}
            {stats && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 font-mono border-t border-gray-700 pt-2">
                <span>{(stats.total_duration_ms / 1000).toFixed(1)}s inference</span>
                <span>{stats.prompt_eval_count} prompt tokens</span>
                <span>{stats.eval_count} output tokens</span>
              </div>
            )}
          </div>

          {matchedCards.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No matching cards found in database.</p>
              <button
                onClick={resetToCamera}
                className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">
                {matchedCards.length} printing{matchedCards.length !== 1 && "s"}{" "}
                found. Select the correct one:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {matchedCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => selectCard(card)}
                    className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 active:ring-2 active:ring-blue-500 transition-all text-left"
                  >
                    {card.image_uri_small || card.image_uri ? (
                      <img
                        src={(card.image_uri_small || card.image_uri)!}
                        alt={card.name}
                        className="w-full aspect-[488/680] object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full aspect-[488/680] bg-gray-700 flex items-center justify-center text-gray-500 text-xs p-2 text-center">
                        {card.name}
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">
                        {card.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {card.set_code?.toUpperCase()} &middot;{" "}
                        <span className="capitalize">{card.rarity}</span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Configure Phase */}
      {phase === "configure" && selectedCard && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {selectedCard.image_uri ? (
              <img
                src={selectedCard.image_uri}
                alt={selectedCard.name}
                className="w-full rounded-lg"
              />
            ) : (
              <div className="w-full aspect-[488/680] bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">
                No image
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold">{selectedCard.name}</h2>
              <p className="text-gray-400 text-sm">
                {selectedCard.set_name} ({selectedCard.set_code?.toUpperCase()})
                &middot;{" "}
                <span className="capitalize">{selectedCard.rarity}</span>
              </p>
              {selectedCard.type_line && (
                <p className="text-gray-400 text-sm mt-1">
                  {selectedCard.type_line}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Quantity
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 bg-gray-700 rounded hover:bg-gray-600 active:bg-gray-500 text-lg"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 bg-gray-700 rounded hover:bg-gray-600 active:bg-gray-500 text-lg"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Finish
                </label>
                <select
                  value={finish}
                  onChange={(e) => setFinish(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white text-base"
                >
                  <option>Normal</option>
                  <option>Foil</option>
                  <option>Etched</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white text-base"
                >
                  <option value="NM">Near Mint (NM)</option>
                  <option value="LP">Lightly Played (LP)</option>
                  <option value="MP">Moderately Played (MP)</option>
                  <option value="HP">Heavily Played (HP)</option>
                  <option value="DMG">Damaged (DMG)</option>
                </select>
              </div>
            </div>

            <button
              onClick={addToCollection}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 font-medium text-lg"
            >
              Add to Collection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
