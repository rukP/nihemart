"use client";

import NextTopLoader from "next13-progressbar";

export default function TopProgressBar() {
  return (
    <NextTopLoader
      color="#ea580c" showOnShallow startPosition={0.3} stopDelayMs={200} options={{ showSpinner: false }} height="4px"
    />
  );
}