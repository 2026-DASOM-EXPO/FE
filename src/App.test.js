import { render, screen } from '@testing-library/react';
import App from './App';

test('renders WORKSAFE dashboard without login', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'WORKSAFE+' })).toBeInTheDocument();
  expect(screen.getByText('WORKSAFE+ - 대시보드')).toBeInTheDocument();
});
