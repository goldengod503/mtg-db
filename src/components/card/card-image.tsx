"use client";

import { useState } from "react";
import Link from "next/link";

interface CardImageProps {
  id: string;
  name: string;
  imageUri: string | null;
  imageUriSmall?: string | null;
  size?: "small" | "normal" | "large";
  showName?: boolean;
  linked?: boolean;
  className?: string;
}

const sizeClasses = {
  small: "w-[120px]",
  normal: "w-[200px]",
  large: "w-[300px]",
};

export function CardImage({
  id,
  name,
  imageUri,
  imageUriSmall,
  size = "normal",
  showName = false,
  linked = true,
  className = "",
}: CardImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const src = size === "small" ? (imageUriSmall || imageUri) : imageUri;

  const content = (
    <div className={`${sizeClasses[size]} ${className} group relative`}>
      <div className="relative aspect-[488/680] rounded-lg overflow-hidden bg-gray-800">
        {src && !error ? (
          <>
            {!loaded && (
              <div className="absolute inset-0 bg-gray-800 animate-pulse" />
            )}
            <img
              src={src}
              alt={name}
              className={`w-full h-full object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              loading="lazy"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs text-center p-2">
            {name}
          </div>
        )}
        {linked && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        )}
      </div>
      {showName && (
        <p className="mt-1 text-xs text-gray-300 truncate text-center">{name}</p>
      )}
    </div>
  );

  if (linked) {
    return <Link href={`/cards/${id}`}>{content}</Link>;
  }

  return content;
}
