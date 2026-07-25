import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login when there is no access token', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: '관리자 로그인' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
});
