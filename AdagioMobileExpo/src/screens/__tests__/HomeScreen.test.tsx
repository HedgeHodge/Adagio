

import React from 'react';
import { render } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import HomeScreen from '../HomeScreen';


jest.mock('../../hooks/useTimer', () => ({
  useTimer: () => ({
    activeSession: { currentTime: 1500, isRunning: false },
    formatTime: jest.fn(() => '25:00'),
    startTimer: jest.fn(),
    pauseTimer: jest.fn(),
    resetTimer: jest.fn(),
  }),
}));

jest.mock('../../ai/flows/motivational-quote-flow', () => ({
  getMotivationalQuote: jest.fn(() => Promise.resolve({ quote: 'Test Quote', source: 'Test Source' })),
}));

describe('HomeScreen', () => {
  it('renders correctly', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('25:00')).toBeTruthy();
    expect(getByText('Get Quote')).toBeTruthy();
  });
});
