# Contributing to ContentScout

First off, thank you for considering contributing to ContentScout! 🎉

## How Can I Contribute?

### Reporting Bugs

- **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/user/ContentScout/issues).
- If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/user/ContentScout/issues/new). Include:
  - A clear title and description
  - Steps to reproduce
  - Expected vs actual behavior
  - Screenshots if applicable

### Suggesting Enhancements

- Open an issue with the `enhancement` label
- Clearly describe the feature and its benefits
- Include mockups/examples if possible

### Pull Requests

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/amazing-feature
   ```
4. **Make your changes** and commit:
   ```bash
   git commit -m 'Add amazing feature'
   ```
5. **Push** to your branch:
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/ContentScout.git
cd ContentScout

# Install dependencies
npm install

# Start development server
npm run dev

# Run type checking
npm run lint
```

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns
- Use meaningful variable/function names
- Add comments for complex logic
- Run `npm run lint` before committing

## Project Structure

```
src/
├── components/    # React components
├── hooks/         # Custom React hooks
├── lib/           # Core logic (analyzer, genlayer)
├── types/         # TypeScript types
└── App.tsx        # Main app component
```

## Key Files to Know

- `src/lib/analyzer.ts` — The scoring algorithms
- `src/lib/genlayer.ts` — Blockchain integration
- `src/components/ResultCard.tsx` — Results display

## Adding New AI Patterns

To add new AI detection patterns, edit `src/lib/analyzer.ts`:

```typescript
const AI_PATTERNS = {
  high_confidence: [
    // Add new patterns here
    'your new pattern',
  ],
  // ...
};
```

## Questions?

Feel free to open an issue with the `question` label.

---

Thank you for contributing! 💜
