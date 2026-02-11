import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders retro notes manager title", () => {
  render(<App />);
  expect(screen.getByText(/retro notes manager/i)).toBeInTheDocument();
});
