
export const auth = {
  onAuthStateChanged: jest.fn(() => () => {}),
  signInWithEmailAndPassword: jest.fn(),
};

export const db = {
  doc: jest.fn(() => ({
    onSnapshot: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
  })),
};
