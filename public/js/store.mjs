export function createStore(initialState) {
  let state = Object.freeze({ ...initialState });
  const listeners = new Set();

  return {
    initialState: state,
    get: () => state,
    set(patch) {
      state = Object.freeze({ ...state, ...patch });
      listeners.forEach((listener) => listener(state));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
