export default function createEngine() {
  return new Worker(new URL('./stockfish-17-lite-single.js', import.meta.url));
}
