
export default () => ({
  doc: jest.fn(() => ({
    onSnapshot: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
  })),
});
