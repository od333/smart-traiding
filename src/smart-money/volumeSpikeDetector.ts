export function detectVolumeSpike(currentVolume: number, avgVolume: number) {
  const ratio = avgVolume > 0 ? currentVolume / avgVolume : 0
  return {
    unusualVolume: ratio >= 2,
    volumeRatio: ratio,
  }
}
